import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

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
    console.log('Successfully loaded .env.local');
  }
} catch (e) {
  console.error('Failed to load env:', e);
}

async function runTest() {
  const { connectToDatabase } = await import('../lib/db');
  const { Message, DirectMessage, User } = await import('../lib/models');

  console.log('Connecting to database...');
  await connectToDatabase();
  console.log('Connected.');

  const testUserId = 'test-reaction-user';
  const testMessageId = new mongoose.Types.ObjectId();
  const testChannelId = new mongoose.Types.ObjectId();

  // Ensure test user exists in User collection for reaction queries
  await User.deleteOne({ id: testUserId });
  await User.create({
    id: testUserId,
    email: 'reaction-test@example.com',
    name: 'Reaction Test User',
    role: 'member',
  });

  // Clean up existing test messages
  await Message.deleteOne({ _id: testMessageId });

  console.log('\n--- Testing Channel Message Reactions ---');
  
  // Create a base message to react to
  const message = await Message.create({
    _id: testMessageId,
    channel_type: 'group',
    channel_id: testChannelId,
    sender_id: 'other-user',
    sender_name: 'Other User',
    content: 'Reaction testing message body',
  });
  console.log('Test message created.');

  const emoji = '👍';

  // 1. First toggle: add reaction
  console.log(`Toggling reaction ${emoji} ON (first click)...`);
  let updatedMessage = await Message.findOneAndUpdate(
    {
      _id: testMessageId,
      reactions: {
        $elemMatch: { emoji, user_id: testUserId }
      }
    },
    {
      $pull: { reactions: { emoji, user_id: testUserId } }
    },
    { new: true }
  );

  if (!updatedMessage) {
    updatedMessage = await Message.findOneAndUpdate(
      { _id: testMessageId },
      {
        $push: {
          reactions: {
            emoji,
            user_id: testUserId,
            user_name: 'Reaction Test User'
          }
        }
      },
      { new: true }
    );
  }

  if (!updatedMessage) throw new Error('Failed to update reaction');
  console.log('Reactions count after first toggle:', updatedMessage.reactions.length);
  if (updatedMessage.reactions.length !== 1 || updatedMessage.reactions[0].emoji !== emoji) {
    throw new Error('Reaction ON verification failed!');
  }
  console.log('Reaction ON verification passed.');

  // 2. Second toggle: remove reaction
  console.log(`Toggling reaction ${emoji} OFF (second click)...`);
  let secondUpdatedMessage = await Message.findOneAndUpdate(
    {
      _id: testMessageId,
      reactions: {
        $elemMatch: { emoji, user_id: testUserId }
      }
    },
    {
      $pull: { reactions: { emoji, user_id: testUserId } }
    },
    { new: true }
  );

  if (!secondUpdatedMessage) {
    secondUpdatedMessage = await Message.findOneAndUpdate(
      { _id: testMessageId },
      {
        $push: {
          reactions: {
            emoji,
            user_id: testUserId,
            user_name: 'Reaction Test User'
          }
        }
      },
      { new: true }
    );
  }

  if (!secondUpdatedMessage) throw new Error('Failed to update reaction second time');
  console.log('Reactions count after second toggle:', secondUpdatedMessage.reactions.length);
  if (secondUpdatedMessage.reactions.length !== 0) {
    throw new Error('Reaction OFF verification failed!');
  }
  console.log('Reaction OFF verification passed.');

  console.log('\n--- Testing DM Attachments ---');
  
  const dmId = new mongoose.Types.ObjectId();
  await DirectMessage.deleteOne({ _id: dmId });

  // Create Direct Message with attachment
  const dm = await DirectMessage.create({
    _id: dmId,
    conversation_id: 'test:user',
    sender_id: testUserId,
    sender_name: 'Reaction Test User',
    content: 'file.pdf',
    type: 'file',
    attachment: {
      url: 'https://supabase.co/file.pdf',
      name: 'file.pdf',
      size: 12345,
      mime_type: 'application/pdf',
      bucket_path: 'dm/test:user/test-reaction-user/file.pdf',
    },
  });

  console.log('Test DM with file attachment created.');
  console.log('Message type:', dm.type);
  console.log('Attachment name:', dm.attachment?.name);

  if (dm.type !== 'file' || dm.attachment?.name !== 'file.pdf' || dm.attachment?.bucket_path !== 'dm/test:user/test-reaction-user/file.pdf') {
    throw new Error('DM attachment verification failed!');
  }
  console.log('DM attachment verification passed.');

  // Clean up
  await Message.deleteOne({ _id: testMessageId });
  await DirectMessage.deleteOne({ _id: dmId });
  await User.deleteOne({ id: testUserId });
  
  console.log('\nAll tests passed successfully!');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
