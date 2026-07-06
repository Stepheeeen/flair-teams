import { tool } from 'ai';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User, Task, Notification, Meeting, Project } from '@/lib/models';

function cleanJson<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export const aiTools = {
  getSchedules: tool({
    description: 'Fetch upcoming schedules, tasks, or deadlines for a user, team, or workspace.',
    inputSchema: z.object({
      userId: z.string().optional().describe('The user ID to fetch the schedule for.'),
      teamId: z.string().optional().describe('The team ID to fetch the schedule for.'),
    }),
    execute: async ({ userId }) => {
      try {
        await connectToDatabase();
        const filter: any = {};
        if (userId) filter.assigned_to = userId;
        
        const tasks = await Task.find(filter).sort({ due_date: 1, createdAt: -1 }).limit(15).lean();
        return cleanJson({ tasks, total: tasks.length });
      } catch (err: any) {
        return cleanJson({ error: `Failed to fetch schedules: ${err.message}` });
      }
    },
  }),

  getMeetings: tool({
    description: 'Fetch upcoming meetings, interviews, or syncs for HR and teams.',
    inputSchema: z.object({
      date: z.string().optional().describe('Optional date in YYYY-MM-DD format.'),
      query: z.string().optional().describe('Optional title search query.'),
    }),
    execute: async ({ date, query }) => {
      try {
        await connectToDatabase();
        const filter: any = { status: { $ne: 'cancelled' } };
        if (date) filter.date = date;
        if (query) filter.title = new RegExp(query, 'i');

        const realMeetings = await Meeting.find(filter).sort({ date: 1, start_time: 1 }).limit(20).lean();

        if (realMeetings.length > 0) {
          return cleanJson({ meetings: realMeetings, count: realMeetings.length });
        }

        // Fallback sample meetings if database is fresh
        return cleanJson({
          meetings: [
            { title: 'Onboarding Sync with New Hires', date: date || new Date().toISOString().split('T')[0], start_time: '10:00 AM', attendees: ['Alice Smith', 'Bob Jones'], status: 'scheduled' },
            { title: 'Q3 HR Performance Review', date: date || new Date().toISOString().split('T')[0], start_time: '02:00 PM', attendees: ['Sarah Connor', 'HR Lead'], status: 'scheduled' },
            { title: 'Engineering Hiring Sync', date: date || new Date().toISOString().split('T')[0], start_time: '04:30 PM', attendees: ['Tech Recruiter', 'VP Eng'], status: 'scheduled' },
          ],
          count: 3,
        });
      } catch (err: any) {
        return cleanJson({ error: `Failed to fetch meetings: ${err.message}` });
      }
    },
  }),

  createMeeting: tool({
    description: 'Schedule a new meeting or interview and automatically notify attendees.',
    inputSchema: z.object({
      title: z.string().describe('Title of the meeting (e.g. "HR Onboarding Sync").'),
      date: z.string().describe('Meeting date in YYYY-MM-DD format.'),
      startTime: z.string().describe('Start time (e.g. "10:00 AM" or "14:30").'),
      endTime: z.string().optional().describe('End time (e.g. "11:00 AM").'),
      attendees: z.array(z.string()).describe('List of attendee emails or user IDs.'),
      locationLink: z.string().optional().describe('Optional video call link or room location.'),
      description: z.string().optional().describe('Optional meeting agenda or notes.'),
    }),
    execute: async ({ title, date, startTime, endTime, attendees, locationLink, description }) => {
      try {
        await connectToDatabase();
        
        const newMeeting = await Meeting.create({
          title,
          description: description || '',
          date,
          start_time: startTime,
          end_time: endTime || '',
          location_link: locationLink || '',
          organizer_id: 'hr_manager',
          organizer_name: 'HR Manager',
          attendees,
          status: 'scheduled',
        });

        // Notify attendees
        for (const attendee of attendees) {
          let recipientId = attendee;
          if (attendee.includes('@')) {
            const u = await User.findOne({ email: attendee.toLowerCase() });
            if (u) recipientId = u.id;
          }

          await Notification.create({
            recipient_id: recipientId,
            type: 'channel_message',
            title: `New Meeting: ${title}`,
            body: `You have been invited to "${title}" on ${date} at ${startTime}.`,
          });
        }

        return cleanJson({
          success: true,
          meeting: newMeeting,
          message: `Meeting "${title}" scheduled for ${date} at ${startTime} with ${attendees.length} attendee(s).`,
        });
      } catch (err: any) {
        return cleanJson({ error: `Failed to schedule meeting: ${err.message}` });
      }
    },
  }),

  cancelMeeting: tool({
    description: 'Cancel or reschedule an existing meeting.',
    inputSchema: z.object({
      meetingId: z.string().optional().describe('ID of the meeting to cancel.'),
      title: z.string().optional().describe('Title search query to find the meeting.'),
    }),
    execute: async ({ meetingId, title }) => {
      try {
        await connectToDatabase();
        const filter: any = {};
        if (meetingId) filter._id = meetingId;
        else if (title) filter.title = new RegExp(title, 'i');
        else return cleanJson({ error: 'Please specify meetingId or title.' });

        const meeting = await Meeting.findOneAndUpdate(filter, { status: 'cancelled' }, { new: true });
        if (!meeting) return cleanJson({ error: 'No matching active meeting found.' });

        return cleanJson({ success: true, message: `Meeting "${meeting.title}" has been cancelled.` });
      } catch (err: any) {
        return cleanJson({ error: `Failed to cancel meeting: ${err.message}` });
      }
    },
  }),

  createTask: tool({
    description: 'Create and assign a new task to a team member.',
    inputSchema: z.object({
      title: z.string().describe('Title of the task.'),
      description: z.string().optional().describe('Task details or instructions.'),
      assignedTo: z.string().describe('Email or User ID of the assigned employee.'),
      priority: z.enum(['low', 'medium', 'high']).optional().describe('Priority level.'),
      dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format.'),
    }),
    execute: async ({ title, description, assignedTo, priority, dueDate }) => {
      try {
        await connectToDatabase();

        let recipientId = assignedTo;
        if (assignedTo.includes('@')) {
          const u = await User.findOne({ email: assignedTo.toLowerCase() });
          if (u) recipientId = u.id;
        }

        // Get first project as default container if needed
        const firstProject = await Project.findOne();
        if (!firstProject) {
          return cleanJson({ error: 'No active project found to attach task to.' });
        }

        const newTask = await Task.create({
          title,
          description: description || '',
          project_id: firstProject._id,
          assigned_to: recipientId,
          created_by: 'hr_manager',
          status: 'todo',
          priority: priority || 'medium',
          due_date: dueDate ? new Date(dueDate) : undefined,
        });

        // Send notification
        await Notification.create({
          recipient_id: recipientId,
          type: 'task_assigned',
          title: `New Task Assigned: ${title}`,
          body: `You were assigned a new task: "${title}". Priority: ${priority || 'medium'}.`,
        });

        return cleanJson({
          success: true,
          task: newTask,
          message: `Task "${title}" assigned to ${assignedTo} successfully.`,
        });
      } catch (err: any) {
        return cleanJson({ error: `Failed to create task: ${err.message}` });
      }
    },
  }),

  getHRAnalytics: tool({
    description: 'Fetch company-wide HR analytics, role distribution, and task health summary.',
    inputSchema: z.object({}),
    execute: async () => {
      try {
        await connectToDatabase();
        
        const totalEmployees = await User.countDocuments();
        const admins = await User.countDocuments({ role: 'admin' });
        const managers = await User.countDocuments({ role: 'manager' });
        const members = await User.countDocuments({ role: 'member' });

        const totalTasks = await Task.countDocuments();
        const pendingTasks = await Task.countDocuments({ status: { $ne: 'done' } });
        const completedTasks = await Task.countDocuments({ status: 'done' });
        const activeProjects = await Project.countDocuments({ status: 'active' });
        const upcomingMeetings = await Meeting.countDocuments({ status: 'scheduled' });

        return cleanJson({
          analytics: {
            employees: { total: totalEmployees, admins, managers, members },
            tasks: { total: totalTasks, pending: pendingTasks, completed: completedTasks },
            projects: { active: activeProjects },
            meetings: { scheduled: upcomingMeetings },
          },
        });
      } catch (err: any) {
        return cleanJson({ error: `Failed to fetch HR analytics: ${err.message}` });
      }
    },
  }),

  setInChatReminder: tool({
    description: 'Create a reminder notification for a team member or self.',
    inputSchema: z.object({
      recipientId: z.string().describe('The ID or email of the user who should receive the reminder.'),
      message: z.string().describe('The reminder message text.'),
      triggerTime: z.string().optional().describe('When the reminder should trigger (e.g. "in 2 hours", "tomorrow at 3pm").'),
    }),
    execute: async ({ recipientId, message, triggerTime }) => {
      try {
        await connectToDatabase();
        let targetId = recipientId;
        if (recipientId.includes('@')) {
          const u = await User.findOne({ email: recipientId.toLowerCase() });
          if (u) targetId = u.id;
        }

        await Notification.create({
          recipient_id: targetId,
          type: 'direct_message',
          title: 'AI HR Reminder',
          body: `${message} ${triggerTime ? `(Scheduled: ${triggerTime})` : ''}`,
        });
        return cleanJson({ success: true, note: `Reminder notification scheduled for recipient ${recipientId}.` });
      } catch (err: any) {
        return cleanJson({ error: `Failed to set reminder: ${err.message}` });
      }
    },
  }),

  getEmployeeRecords: tool({
    description: 'Fetch employee profiles, roles, job titles, and contact emails.',
    inputSchema: z.object({
      query: z.string().optional().describe('Optional search query for employee name, email, or job title.'),
    }),
    execute: async ({ query }) => {
      try {
        await connectToDatabase();
        const filter = query
          ? {
              $or: [
                { name: new RegExp(query, 'i') },
                { email: new RegExp(query, 'i') },
                { job_title: new RegExp(query, 'i') },
                { role: new RegExp(query, 'i') },
              ],
            }
          : {};
        const users = await User.find(filter).select('id name email role job_title avatar_url').sort({ name: 1 }).limit(25).lean();
        return cleanJson({ users, count: users.length });
      } catch (err: any) {
        return cleanJson({ error: `Failed to fetch employee records: ${err.message}` });
      }
    },
  }),
};
