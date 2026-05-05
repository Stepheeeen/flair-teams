import webpush from 'web-push';
import { sendUnreadMessagesEmail } from './email';
import { User } from './models';

// Configure Web Push with VAPID keys
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@flairtechlabs.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function sendOfflineNotification({
  recipientId,
  senderName,
  sourceName,
  messagePreview,
  url,
  type, // 'dm' | 'channel'
}: {
  recipientId: string;
  senderName: string;
  sourceName: string; // e.g. "Direct Message" or "#general"
  messagePreview: string;
  url: string;
  type: 'dm' | 'channel';
}) {
  try {
    const user = await User.findOne({ id: recipientId });
    if (!user) return;

    const title = type === 'dm' ? `New message from ${senderName}` : `New message in ${sourceName}`;
    const body = `${senderName}: ${messagePreview}`;

    // 1. Send Push Notification (if subscribed)
    let pushFailed = false;
    if (user.push_subscriptions && user.push_subscriptions.length > 0) {
      for (const sub of user.push_subscriptions) {
        try {
          await webpush.sendNotification(
            sub,
            JSON.stringify({ title, body, url })
          );
        } catch (error: any) {
          if (error.statusCode === 404 || error.statusCode === 410) {
            // Subscription has expired or is no longer valid, we should remove it
            await User.updateOne(
              { id: recipientId },
              { $pull: { push_subscriptions: { endpoint: sub.endpoint } } }
            );
          } else {
            pushFailed = true;
          }
        }
      }
    } else {
      pushFailed = true; // Fallback to email if no push subscriptions
    }

    // 2. Send Email Notification
    // Throttle emails to avoid spamming: only send if no email sent in last 15 mins
    const lastNotified = user.last_notified_at ? new Date(user.last_notified_at).getTime() : 0;
    const now = Date.now();
    
    if (pushFailed || user.push_subscriptions?.length === 0) {
      if (now - lastNotified > 15 * 60 * 1000) {
        await sendUnreadMessagesEmail({
          to: user.email,
          userName: user.name || user.email,
          count: 1, // We could aggregate this, but 1 works for the immediate notification
          source: sourceName,
          url,
        });
        
        await User.updateOne({ id: recipientId }, { last_notified_at: new Date() });
      }
    }
  } catch (err) {
    console.error('Error sending offline notification:', err);
  }
}
