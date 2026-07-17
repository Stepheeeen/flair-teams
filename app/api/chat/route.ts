import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserFromDb, handleApiError, ApiError } from '@/lib/api-utils';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, isStepCount } from 'ai';
import { aiTools } from '@/lib/ai/tools';
import { connectToDatabase } from '@/lib/db';

// ─── Key Health Cache ──────────────────────────────────────────────────────────
const keyHealthCache = new Map<string, { isValid: boolean; lastCheck: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const BOOT_TIME = Date.now(); // Invalidate any cache entries from before this boot

function isKeyCached(key: string): boolean {
  const entry = keyHealthCache.get(key);
  if (!entry) return false;
  if (entry.lastCheck < BOOT_TIME) return false; // stale from before this boot
  return Date.now() - entry.lastCheck < CACHE_TTL;
}
function markKeyInvalid(key: string) {
  keyHealthCache.set(key, { isValid: false, lastCheck: Date.now() });
}
function markKeyValid(key: string) {
  keyHealthCache.set(key, { isValid: true, lastCheck: Date.now() });
}
function getCachedValidity(key: string): boolean {
  return keyHealthCache.get(key)?.isValid ?? true;
}

// ─── Gemini Pre-Flight Probe ───────────────────────────────────────────────────
// Probes the actual generateContent endpoint (not metadata) since metadata
// always returns 200 regardless of credit balance.
async function probeGeminiKey(apiKey: string): Promise<boolean> {
  if (!apiKey) return false;
  if (isKeyCached(apiKey)) return getCachedValidity(apiKey);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'hi' }], role: 'user' }],
          generationConfig: { maxOutputTokens: 1 },
        }),
        signal: AbortSignal.timeout(4000),
      }
    );

    const isValid = res.status === 200;
    if (isValid) markKeyValid(apiKey); else markKeyInvalid(apiKey);
    return isValid;
  } catch {
    return true; // Network error — assume valid, don't block requests
  }
}

// ─── Grok Pre-Flight Probe ─────────────────────────────────────────────────────
async function probeGroqKey(apiKey: string): Promise<boolean> {
  if (!apiKey) return false;
  if (isKeyCached(apiKey)) return getCachedValidity(apiKey);

  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(2000),
    });

    const isValid = res.status !== 403 && res.status !== 401;
    if (isValid) markKeyValid(apiKey); else markKeyInvalid(apiKey);
    return isValid;
  } catch {
    return true;
  }
}

// ─── Report Gemini Issue ───────────────────────────────────────────────────────
function reportGeminiIssue(keyLabel: string, error: unknown) {
  const err = error as any;
  const status = err?.statusCode ?? err?.status ?? 'unknown';
  const message = err?.message ?? String(error);
  console.error(
    `\n⚠️  [AI Fallback] Gemini ${keyLabel} failed (HTTP ${status}). Switched to Grok.\n` +
    `   Reason: ${message}\n` +
    `   Action: Mark key invalid for 2 minutes.\n`
  );
}

function safePruneMessages(messages: any[], maxCount = 8): any[] {
  if (messages.length <= maxCount) {
    return messages;
  }

  const pruned: any[] = [];
  const pendingToolCallIds = new Set<string>();

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const isUnderLimit = pruned.length < maxCount;
    let isRequired = false;

    if (msg.role === 'tool') {
      if (isUnderLimit) {
        isRequired = true;
        if (Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (part.type === 'tool-result') {
              pendingToolCallIds.add(part.toolCallId);
            }
          }
        }
      }
    } else if (msg.role === 'assistant') {
      if (msg.content && Array.isArray(msg.content)) {
        const hasPendingCall = msg.content.some(
          (part: any) => part.type === 'tool-call' && pendingToolCallIds.has(part.toolCallId)
        );
        if (hasPendingCall) {
          isRequired = true;
          for (const part of msg.content) {
            if (part.type === 'tool-call') {
              pendingToolCallIds.delete(part.toolCallId);
            }
          }
        }
      }
    }

    if (isUnderLimit || isRequired) {
      pruned.unshift(msg);
    }
  }

  while (pruned.length > 0 && pruned[0].role === 'tool') {
    pruned.shift();
  }

  return pruned;
}
function safeConvertToModelMessages(messages: any[]): any[] {
  if (!Array.isArray(messages)) return [];
  
  return messages.map((msg) => {
    if (msg.parts && Array.isArray(msg.parts)) {
      return msg;
    }
    
    const parts: any[] = [];
    if (msg.role === 'user' || msg.role === 'system') {
      if (typeof msg.content === 'string') {
        parts.push({ type: 'text', text: msg.content });
      } else if (Array.isArray(msg.content)) {
        parts.push(...msg.content);
      }
    } else if (msg.role === 'assistant') {
      if (typeof msg.content === 'string' && msg.content) {
        parts.push({ type: 'text', text: msg.content });
      }
      if (msg.toolCalls && Array.isArray(msg.toolCalls)) {
        for (const tc of msg.toolCalls) {
          parts.push({
            type: 'tool-call',
            toolCallId: tc.toolCallId || tc.id,
            toolName: tc.toolName || tc.name,
            input: tc.args || tc.input,
          });
        }
      }
    } else if (msg.role === 'tool') {
      parts.push({
        type: 'tool-result',
        toolCallId: msg.toolCallId,
        toolName: msg.toolName,
        result: msg.content,
      });
    }
    
    return {
      id: msg.id || Math.random().toString(),
      role: msg.role,
      parts,
    };
  });
}

// ─── Route ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    await connectToDatabase();
    const user = await getUserFromDb(authUser.id);

    if (user.role !== 'admin' && user.role !== 'manager') {
      throw new ApiError(403, 'You do not have permission to access the AI assistant');
    }

    const { messages } = await req.json();

    const groqKey = process.env.GROQ_API_KEY;
    const primaryGeminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    const secondaryGeminiKey = process.env.SECONDARY_GEMINI_API_KEY || process.env.GEMINI_API_KEY_2;

    const uiMessages = safeConvertToModelMessages(messages);
    const modelMessages = await convertToModelMessages(uiMessages);
    const prunedMessages = safePruneMessages(modelMessages, 8);

    const systemPrompt = `You are an expert HR & Team Workspace Assistant for Flair Technologies.
Current User Context: Name: ${user.name || user.email}, Role: ${user.role}, ID: ${user.id}, Email: ${user.email}.

Your capabilities:
1. Schedule & Manage Meetings (createMeeting, getMeetings, cancelMeeting)
2. Assign & Track Tasks (createTask, getSchedules)
3. Employee Profiles & Roles (getEmployeeRecords)
4. HR Analytics & Reports (getHRAnalytics)
5. Set In-Chat & Dashboard Reminders (setInChatReminder)

CRITICAL INSTRUCTIONS:
- PERSONAL RELATIONSHIP: You MUST relate directly and personally with the user. Address them warmly by their name (${user.name || 'there'}) and speak in a friendly, engaging, human-like manner. Do not sound like a cold, generic, or robotic assistant.
- ROLE RELEVANCE: Reference their specific workspace role (${user.role}) dynamically in your responses when appropriate (e.g., acknowledging their leadership or responsibilities as a manager or admin).
- Always be professional, helpful, and concise while maintaining a warm and supportive tone.
- When a tool is executed or tool data is returned, ALWAYS provide a brief, helpful text response summarizing the findings or confirming the action. Never return a blank response.`;

    const streamOptions = {
      messages: prunedMessages,
      system: systemPrompt,
      tools: aiTools,
      stopWhen: isStepCount(5),
      maxRetries: 0, // We handle retries/fallback ourselves
    };

    // ─── Priority: Gemini first, Grok as immediate fallback ──────────────────

    // 1. Try Primary Gemini key
    if (primaryGeminiKey && (await probeGeminiKey(primaryGeminiKey))) {
      const google = createGoogleGenerativeAI({ apiKey: primaryGeminiKey });

      return streamText({
        model: google('gemini-2.0-flash'),
        ...streamOptions,
        onError: ({ error }) => {
          reportGeminiIssue('Primary', error);
          markKeyInvalid(primaryGeminiKey);
        },
      }).toUIMessageStreamResponse();
    }

    // Gemini primary failed probe → report and fall through to Groq
    if (primaryGeminiKey) {
      reportGeminiIssue('Primary', new Error('Pre-flight probe returned invalid status (429/401/403)'));
    }

    // 2. Immediately switch to Groq (free, fast — Llama 3.3 70B via Groq)
    if (groqKey && (await probeGroqKey(groqKey))) {
      const groq = createOpenAI({
        name: 'groq',
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: groqKey,
      });

      return streamText({
        model: groq('llama-3.3-70b-versatile'),
        ...streamOptions,
        onError: ({ error }) => {
          console.error('[Groq] Stream error — Groq fallback failed:', error);
          markKeyInvalid(groqKey);
        },
      }).toUIMessageStreamResponse();
    }

    // 3. Try Secondary Gemini as last resort
    if (secondaryGeminiKey && (await probeGeminiKey(secondaryGeminiKey))) {
      const google = createGoogleGenerativeAI({ apiKey: secondaryGeminiKey });

      return streamText({
        model: google('gemini-2.0-flash'),
        ...streamOptions,
        onError: ({ error }) => {
          reportGeminiIssue('Secondary', error);
          markKeyInvalid(secondaryGeminiKey);
        },
      }).toUIMessageStreamResponse();
    }

    // 4. All providers exhausted
    throw new ApiError(
      429,
      'All AI providers are currently unavailable (credits depleted or rate limited). ' +
      'Please top up Google AI Studio credits or purchase xAI Grok credits.'
    );

  } catch (error: any) {
    console.error('[API Chat Error]:', error);
    if (
      error?.status === 429 ||
      error?.statusCode === 429 ||
      error?.message?.includes('Quota') ||
      error?.message?.includes('429') ||
      error?.message?.includes('depleted')
    ) {
      return handleApiError(
        new ApiError(429, 'AI credits are depleted. Please top up on Google AI Studio or add a secondary API key in .env.local.')
      );
    }
    return handleApiError(error);
  }
}
