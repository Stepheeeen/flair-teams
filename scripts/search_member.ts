import fs from 'fs';
import path from 'path';

// Manually load env vars from .env.local
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envLocal = fs.readFileSync(envPath, 'utf8');
    envLocal.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
} catch (e) {
  console.error('Failed to load env:', e);
}

async function main() {
  const { connectToDatabase } = await import('../lib/db');
  const {
    User,
    TeamMember,
    TeamInvite,
    Message,
    DirectMessage,
    Notification,
    Activity,
  } = await import('../lib/models');

  await connectToDatabase();

  const regex = new RegExp('fagbemi|joy', 'i');

  console.log('Searching for "fagbemi joy" across MongoDB collections...');

  // Search User
  const users = await User.find({
    $or: [{ name: regex }, { email: regex }],
  }).lean() as any[];
  console.log('\n--- Users ---');
  console.log(users);

  const userIds = users.map((u) => u.id);

  // Search TeamMember
  const memberships = await TeamMember.find({
    user_id: { $in: userIds },
  }).lean() as any[];
  console.log('\n--- Team Memberships ---');
  console.log(memberships);

  // Search TeamInvite
  const invites = await TeamInvite.find({
    $or: [{ email: regex }],
  }).lean() as any[];
  console.log('\n--- Team Invites ---');
  console.log(invites);

  // Search Activity
  const activities = await Activity.find({
    $or: [
      { user_id: { $in: userIds } },
      { 'details.email': regex },
      { 'details.name': regex },
    ],
  }).lean() as any[];
  console.log('\n--- Activities ---');
  console.log(activities);

  // Search Message
  const messages = await Message.find({
    $or: [
      { sender_name: regex },
      { content: regex },
      { sender_id: { $in: userIds } },
    ],
  }).lean() as any[];
  console.log('\n--- Channel Messages ---');
  console.log(messages);

  // Search DirectMessage
  const dms = await DirectMessage.find({
    $or: [
      { sender_name: regex },
      { content: regex },
      { sender_id: { $in: userIds } },
      { conversation_id: { $regex: /joy|fagbemi/i } },
    ],
  }).lean() as any[];
  console.log('\n--- Direct Messages ---');
  console.log(dms);

  // Search Notification
  const notifications = await Notification.find({
    $or: [
      { recipient_id: { $in: userIds } },
      { actor_id: { $in: userIds } },
      { title: regex },
      { body: regex },
    ],
  }).lean() as any[];
  console.log('\n--- Notifications ---');
  console.log(notifications);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
