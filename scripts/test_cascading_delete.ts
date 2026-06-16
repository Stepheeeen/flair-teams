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
  console.error('Failed to load .env.local:', e);
}

async function runTest() {
  const { connectToDatabase } = await import('../lib/db');
  const {
    User,
    Team,
    TeamMember,
    TeamInvite,
    Group,
    SubGroup,
    Task,
    Message,
    DirectMessage,
    Notification,
    Activity,
  } = await import('../lib/models');

  const userId = 'test-user-99999';
  const userEmail = 'test-user-99999@example.com';
  const teamId = new mongoose.Types.ObjectId();
  const projectId = new mongoose.Types.ObjectId();
  const groupId = new mongoose.Types.ObjectId();
  const subGroupId = new mongoose.Types.ObjectId();

  console.log('Connecting to database...');
  await connectToDatabase();
  console.log('Connected.');

  // Clean up any leftovers from previous failed runs
  await cleanUp(userId, userEmail, teamId, groupId, subGroupId);

  console.log('Creating mock records...');

  // Create User
  await User.create({
    id: userId,
    email: userEmail,
    name: 'Test User 99999',
    role: 'member',
  });

  // Create Team (needed for references)
  await Team.create({
    _id: teamId,
    name: 'Test Team 99999',
    owner_id: 'some-other-owner',
  });

  // Create Team Member
  await TeamMember.create({
    team_id: teamId,
    user_id: userId,
    invited_by: 'admin',
  });

  // Create Group with member
  await Group.create({
    _id: groupId,
    team_id: teamId,
    name: 'Test Group',
    created_by: 'admin',
    members: [userId, 'other-user'],
  });

  // Create SubGroup with member
  await SubGroup.create({
    _id: subGroupId,
    group_id: groupId,
    team_id: teamId,
    name: 'Test Subgroup',
    created_by: 'admin',
    members: [userId],
  });

  // Create Task assigned to user
  const task = await Task.create({
    title: 'Test Task',
    project_id: projectId,
    assigned_to: userId,
    created_by: 'admin',
  });

  // Create Message sent by user
  await Message.create({
    channel_type: 'group',
    channel_id: groupId,
    sender_id: userId,
    sender_name: 'Test User',
    content: 'Hello channel!',
  });

  // Create Direct Messages
  // 1. Sent by user
  await DirectMessage.create({
    conversation_id: `other-user:${userId}`,
    sender_id: userId,
    sender_name: 'Test User',
    content: 'Hello DM!',
  });
  // 2. Received / Involving user conversation
  await DirectMessage.create({
    conversation_id: `${userId}:other-user-2`,
    sender_id: 'other-user-2',
    sender_name: 'Other User 2',
    content: 'Hey back!',
  });

  // Create Notification
  await Notification.create({
    recipient_id: userId,
    type: 'mention',
    title: 'You were mentioned',
    body: 'Hello',
  });

  // Create Activity
  await Activity.create({
    team_id: teamId,
    user_id: userId,
    action: 'sent_message',
    resource_type: 'message',
  });

  // Create TeamInvite
  await TeamInvite.create({
    team_id: teamId,
    email: userEmail,
    token: 'test-token-99999',
    created_by: 'admin',
  });

  console.log('Mock records created. Verifying existence...');

  // Verification helper before delete
  const userExists = await User.findOne({ id: userId });
  const memberExists = await TeamMember.findOne({ user_id: userId });
  const groupHasMember = await Group.findOne({ _id: groupId, members: userId });
  const subGroupHasMember = await SubGroup.findOne({ _id: subGroupId, members: userId });
  const taskAssigned = await Task.findOne({ _id: task._id, assigned_to: userId });
  const msgExists = await Message.findOne({ sender_id: userId });
  const dmsCount = await DirectMessage.countDocuments({
    $or: [{ sender_id: userId }, { conversation_id: { $regex: userId } }],
  });
  const notifyExists = await Notification.findOne({ recipient_id: userId });
  const activityExists = await Activity.findOne({ user_id: userId });
  const inviteExists = await TeamInvite.findOne({ email: userEmail });

  if (
    !userExists ||
    !memberExists ||
    !groupHasMember ||
    !subGroupHasMember ||
    !taskAssigned ||
    !msgExists ||
    dmsCount !== 2 ||
    !notifyExists ||
    !activityExists ||
    !inviteExists
  ) {
    throw new Error('Pre-verification failed: Not all mock records were created successfully.');
  }
  console.log('Pre-verification passed: All records exist.');

  console.log('Executing cascading deletion...');
  // This mirrors the actual route logic
  await User.deleteOne({ id: userId });
  await TeamMember.deleteMany({ user_id: userId });
  await Group.updateMany({ members: userId }, { $pull: { members: userId } });
  await SubGroup.updateMany({ members: userId }, { $pull: { members: userId } });
  await Task.updateMany({ assigned_to: userId }, { $unset: { assigned_to: '' } });
  await Message.deleteMany({ sender_id: userId });
  await DirectMessage.deleteMany({
    $or: [{ sender_id: userId }, { conversation_id: { $regex: userId } }],
  });
  await Notification.deleteMany({ $or: [{ recipient_id: userId }, { actor_id: userId }] });
  await Activity.deleteMany({ user_id: userId });
  await TeamInvite.deleteMany({
    $or: [{ email: userEmail }, { created_by: userId }],
  });

  console.log('Cascading deletion executed. Verifying deletion...');

  const userAfter = await User.findOne({ id: userId });
  const memberAfter = await TeamMember.findOne({ user_id: userId });
  const groupAfter = await Group.findOne({ _id: groupId, members: userId });
  const subGroupAfter = await SubGroup.findOne({ _id: subGroupId, members: userId });
  const taskAfter = await Task.findOne({ _id: task._id });
  const msgAfter = await Message.findOne({ sender_id: userId });
  const dmsAfter = await DirectMessage.countDocuments({
    $or: [{ sender_id: userId }, { conversation_id: { $regex: userId } }],
  });
  const notifyAfter = await Notification.findOne({
    $or: [{ recipient_id: userId }, { actor_id: userId }],
  });
  const activityAfter = await Activity.findOne({ user_id: userId });
  const inviteAfter = await TeamInvite.findOne({ email: userEmail });

  const errors: string[] = [];
  if (userAfter) errors.push('User document was not deleted');
  if (memberAfter) errors.push('TeamMember document was not deleted');
  if (groupAfter) errors.push('User was not pulled from Group members list');
  if (subGroupAfter) errors.push('User was not pulled from SubGroup members list');
  if (taskAfter?.assigned_to === userId) errors.push('Task was not unassigned from user');
  if (msgAfter) errors.push('Message document was not deleted');
  if (dmsAfter > 0) errors.push(`DirectMessage records were not deleted (${dmsAfter} remaining)`);
  if (notifyAfter) errors.push('Notification documents were not deleted');
  if (activityAfter) errors.push('Activity log documents were not deleted');
  if (inviteAfter) errors.push('TeamInvite documents were not deleted');

  // Clean up remaining team and tasks
  await cleanUp(userId, userEmail, teamId, groupId, subGroupId);

  if (errors.length > 0) {
    console.error('Test Failed! Issues found:');
    errors.forEach((err) => console.error(`- ${err}`));
    process.exit(1);
  } else {
    console.log('Test Passed! All cascading deletions and updates completed successfully.');
    process.exit(0);
  }
}

async function cleanUp(
  userId: string,
  userEmail: string,
  teamId: mongoose.Types.ObjectId,
  groupId: mongoose.Types.ObjectId,
  subGroupId: mongoose.Types.ObjectId
) {
  const {
    User,
    Team,
    TeamMember,
    Group,
    SubGroup,
    Task,
    Message,
    DirectMessage,
    Notification,
    Activity,
    TeamInvite,
  } = await import('../lib/models');

  await User.deleteOne({ id: userId });
  await Team.deleteOne({ _id: teamId });
  await TeamMember.deleteMany({ user_id: userId });
  await Group.deleteOne({ _id: groupId });
  await SubGroup.deleteOne({ _id: subGroupId });
  await Task.deleteMany({ title: 'Test Task' });
  await Message.deleteMany({ sender_id: userId });
  await DirectMessage.deleteMany({
    $or: [{ sender_id: userId }, { conversation_id: { $regex: userId } }],
  });
  await Notification.deleteMany({ $or: [{ recipient_id: userId }, { actor_id: userId }] });
  await Activity.deleteMany({ user_id: userId });
  await TeamInvite.deleteMany({ email: userEmail });
}

runTest().catch((err) => {
  console.error('Unexpected error during test execution:', err);
  process.exit(1);
});
