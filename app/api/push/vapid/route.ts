import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  
  if (!publicKey) {
    console.error('VAPID_PUBLIC_KEY is not defined in environment variables');
  }

  return NextResponse.json({
    publicKey: publicKey || null
  });
}
