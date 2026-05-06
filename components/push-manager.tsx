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

        // Check if permission is already granted, else request it
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // Ensure we have a public key
        let vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          const vapidRes = await fetch('/api/push/vapid');
          const vapidData = await vapidRes.json();
          vapidPublicKey = vapidData.publicKey;
        }

        if (!vapidPublicKey) return;

        // Get existing subscription or create a new one
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          });
        }

        // Send to backend
        await fetcher('/api/push/subscribe', {
          method: 'POST',
          body: JSON.stringify(subscription),
        });
      } catch (error) {
        console.error('Failed to set up push notifications:', error);
      }
    };

    setupPush();
  }, [user, fetcher]);

  return null;
}
