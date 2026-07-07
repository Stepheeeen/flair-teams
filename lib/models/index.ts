import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

// ─── User ────────────────────────────────────────────────────────────────────
export const userSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: String,
    avatar_url: String,
    role: { type: String, enum: ['admin', 'manager', 'member'], default: 'member' },
    /** Free-text job title / position in the company (e.g. "CEO", "Frontend Dev") */
    job_title: { type: String, default: '' },
    push_subscriptions: [{
      endpoint: String,
      keys: {
        p256dh: String,
        auth: String
      }
    }],
    last_notified_at: Date,
  },
  { timestamps: true }
);

// ─── Team ─────────────────────────────────────────────────────────────────────
export const teamSchema = new Schema(
  {
    name: { type: String, required: true },
    description: String,
    owner_id: { type: String, required: true },
    avatar_url: String,
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─── Team Member ──────────────────────────────────────────────────────────────
export const teamMemberSchema = new Schema(
  {
    team_id: { type: Types.ObjectId, ref: 'Team', required: true },
    user_id: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'member'], default: 'member' },
    job_title: { type: String, default: '' },
    invited_by: { type: String, required: true },
  },
  { timestamps: true }
);

// ─── Team Invite ──────────────────────────────────────────────────────────────
export const teamInviteSchema = new Schema(
  {
    team_id: { type: Types.ObjectId, ref: 'Team', required: true },
    email: { type: String, required: true },
    role: { type: String, enum: ['manager', 'member'], default: 'member' },
    job_title: { type: String, default: '' },
    token: { type: String, required: true, unique: true },
    created_by: { type: String, required: true },
    expires_at: Date,
    accepted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ─── Project ──────────────────────────────────────────────────────────────────
export const projectSchema = new Schema(
  {
    name: { type: String, required: true },
    description: String,
    team_id: { type: Types.ObjectId, ref: 'Team', required: true },
    created_by: { type: String, required: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    color: { type: String, default: '#3b82f6' },
  },
  { timestamps: true }
);

// ─── Task ─────────────────────────────────────────────────────────────────────
export const taskSchema = new Schema(
  {
    title: { type: String, required: true },
    description: String,
    project_id: { type: Types.ObjectId, ref: 'Project', required: true },
    assigned_to: String,
    created_by: { type: String, required: true },
    status: { type: String, enum: ['todo', 'in_progress', 'done'], default: 'todo' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    due_date: Date,
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ─── Activity Log ─────────────────────────────────────────────────────────────
export const activitySchema = new Schema(
  {
    team_id: { type: Types.ObjectId, ref: 'Team', required: true },
    user_id: { type: String, required: true },
    action: {
      type: String,
      enum: [
        'created_project', 'updated_project',
        'created_task', 'updated_task', 'assigned_task', 'completed_task',
        'invited_member', 'removed_member',
        'created_group', 'created_subgroup', 'sent_message',
      ],
      required: true,
    },
    resource_type: { type: String, enum: ['project', 'task', 'team', 'member', 'group', 'subgroup', 'message'] },
    resource_id: Types.ObjectId,
    details: Schema.Types.Mixed,
  },
  { timestamps: true }
);

// ─── Group ────────────────────────────────────────────────────────────────────
export const groupSchema = new Schema(
  {
    team_id: { type: Types.ObjectId, ref: 'Team', required: true },
    name: { type: String, required: true },
    description: String,
    type: { type: String, enum: ['general', 'department', 'announcement'], default: 'general' },
    created_by: { type: String, required: true },
    is_private: { type: Boolean, default: false },
    members: [{ type: String }],
    color: { type: String, default: '#FFC078' },
  },
  { timestamps: true }
);

// ─── Sub-Group ────────────────────────────────────────────────────────────────
export const subGroupSchema = new Schema(
  {
    group_id: { type: Types.ObjectId, ref: 'Group', required: true },
    team_id: { type: Types.ObjectId, ref: 'Team', required: true },
    name: { type: String, required: true },
    description: String,
    created_by: { type: String, required: true },
    members: [{ type: String }],
  },
  { timestamps: true }
);

// ─── Message (channel & sub-group) ───────────────────────────────────────────
export const messageSchema = new Schema(
  {
    channel_type: { type: String, enum: ['group', 'subgroup'], required: true },
    channel_id: { type: Types.ObjectId, required: true, index: true },
    sender_id: { type: String, required: true },
    sender_name: { type: String, required: true },
    sender_avatar: String,
    content: { type: String, required: true },
    type: { type: String, enum: ['text', 'system', 'file'], default: 'text' },
    edited: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
    reply_to: { type: Types.ObjectId, ref: 'Message', default: null },
    attachment: { url: String, name: String, size: Number, mime_type: String, bucket_path: String },
    mentions: [{ type: String }],
    reactions: [{
      emoji: { type: String, required: true },
      user_id: { type: String, required: true },
      user_name: { type: String, required: true }
    }],
  },
  { timestamps: true }
);

// ─── Direct Message ───────────────────────────────────────────────────────────
// conversation_id = sorted user IDs joined with ':' e.g. "uid1:uid2"
export const directMessageSchema = new Schema(
  {
    conversation_id: { type: String, required: true, index: true },
    sender_id: { type: String, required: true },
    sender_name: { type: String, required: true },
    sender_avatar: String,
    content: { type: String, required: true },
    type: { type: String, enum: ['text', 'file'], default: 'text' },
    read: { type: Boolean, default: false },
    edited: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
    reply_to: { type: Types.ObjectId, ref: 'DirectMessage', default: null },
    attachment: { url: String, name: String, size: Number, mime_type: String, bucket_path: String },
  },
  { timestamps: true }
);

// ─── Notification ─────────────────────────────────────────────────────────────
export const notificationSchema = new Schema(
  {
    recipient_id: { type: String, required: true, index: true },
    type: { type: String, enum: ['mention', 'team_invite', 'task_assigned', 'channel_message', 'direct_message'], required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    link: String,
    read: { type: Boolean, default: false },
    actor_id: String,
    actor_name: String,
    team_id: { type: Types.ObjectId, ref: 'Team' },
    channel_id: Types.ObjectId,
    message_id: { type: Types.ObjectId, ref: 'Message' },
  },
  { timestamps: true }
);

// ─── Meeting ──────────────────────────────────────────────────────────────────
export const meetingSchema = new Schema(
  {
    title: { type: String, required: true },
    description: String,
    date: { type: String, required: true }, // YYYY-MM-DD
    start_time: { type: String, required: true }, // e.g. "10:00 AM"
    end_time: String, // e.g. "11:00 AM"
    location_link: String,
    organizer_id: { type: String, required: true },
    organizer_name: String,
    attendees: [{ type: String }], // user IDs or emails
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  },
  { timestamps: true }
);

// ─── Group Read State ──────────────────────────────────────────────────────────
export const groupReadStateSchema = new Schema(
  {
    user_id: { type: String, required: true },
    group_id: { type: Types.ObjectId, ref: 'Group', required: true },
    last_read_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
messageSchema.index({ channel_id: 1, createdAt: -1 });
directMessageSchema.index({ conversation_id: 1, createdAt: -1 });
groupSchema.index({ team_id: 1 });
subGroupSchema.index({ group_id: 1 });
notificationSchema.index({ recipient_id: 1, read: 1, createdAt: -1 });
teamMemberSchema.index({ team_id: 1 });
teamMemberSchema.index({ user_id: 1 });
meetingSchema.index({ organizer_id: 1, date: 1 });
meetingSchema.index({ attendees: 1 });
groupReadStateSchema.index({ user_id: 1, group_id: 1 }, { unique: true });

// ─── Model Exports ────────────────────────────────────────────────────────────
export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Team = mongoose.models.Team || mongoose.model('Team', teamSchema);
export const TeamMember = mongoose.models.TeamMember || mongoose.model('TeamMember', teamMemberSchema);
export const TeamInvite = mongoose.models.TeamInvite || mongoose.model('TeamInvite', teamInviteSchema);
export const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);
export const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);
export const Activity = mongoose.models.Activity || mongoose.model('Activity', activitySchema);
export const Group = mongoose.models.Group || mongoose.model('Group', groupSchema);
export const SubGroup = mongoose.models.SubGroup || mongoose.model('SubGroup', subGroupSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
export const DirectMessage = mongoose.models.DirectMessage || mongoose.model('DirectMessage', directMessageSchema);
export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
export const Meeting = mongoose.models.Meeting || mongoose.model('Meeting', meetingSchema);
export const GroupReadState = mongoose.models.GroupReadState || mongoose.model('GroupReadState', groupReadStateSchema);

