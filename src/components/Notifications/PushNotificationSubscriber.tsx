'use client';

import React, { useState, useEffect } from 'react';

export default function PushNotificationSubscriber() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(reg => {
        setRegistration(reg);
        reg.pushManager.getSubscription().then(sub => {
          if (sub && !(sub.expirationTime && Date.now() > sub.expirationTime - 5 * 60 * 1000)) {
            setSubscription(sub);
            setIsSubscribed(true);
          } else {
            console.log('No subscription found');}
        }).catch(err => {
          console.error('Error checking subscription:', err);
          setError('Error checking subscription status');
        });
      }).catch(err => {
        console.error('Error getting service worker registration:', err);
        setError('Error initializing push notifications');
      });
    } else {
      setError('Push notifications are not supported in this browser');
    }
  }, []);

  const subscribeButtonOnClick = async () => {
    if (!registration) return;

    try {
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sub),
      });

      if (response.ok) {
        const result = await response.json();
        setSubscription(sub);
        setIsSubscribed(true);
      } else {
        const error = await response.text();
        throw new Error(`Failed to subscribe: ${error}`);
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      setError('Failed to subscribe to push notifications');
    }
  };

  const unsubscribeButtonOnClick = async () => {
    if (!subscription) return;

    try {
      await subscription.unsubscribe();
      await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });
      setSubscription(null);
      setIsSubscribed(false);
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      setError('Failed to unsubscribe from push notifications');
    }
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!registration) {
    return <div>Loading push notification status...</div>;
  }

  return (
    <button
      onClick={isSubscribed ? unsubscribeButtonOnClick : subscribeButtonOnClick}
      className="bg-secondary text-font px-4 py-2 rounded-lg hover:bg-tertiary transition-colors"
    >
      {isSubscribed ? 'Unsubscribe from Notifications' : 'Subscribe to Notifications'}
    </button>
  );
}