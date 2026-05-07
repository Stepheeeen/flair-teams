'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushManager() {
  const { user, fetcher } = useAuth();

  useEffect(() => {
    if (!user) return;

    const setupPush = async () => {
      try {
        if (!('serviceWorker' in navigator)) return;
        if (!('PushManager' in window)) return;

        const registration = await navigator.serviceWorker.register('/sw.js');

        // We only want to SYNC existing subscriptions, not create new ones.
        // The user must enable push independently on each device via the Settings page.
        let subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          // Send to backend to ensure it's still registered
          await fetcher('/api/push/subscribe', {
            method: 'POST',
            body: JSON.stringify(subscription),
          });
        }
      } catch (error) {
        console.error('Failed to sync push notifications:', error);
      }
    };

    setupPush();
  }, [user, fetcher]);

  return null;
}
