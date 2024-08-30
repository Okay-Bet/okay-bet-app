'use client';

import { useState, useEffect } from 'react';

export default function PushNotificationSubscriber() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          if (sub && !(sub.expirationTime && Date.now() > sub.expirationTime - 5 * 60 * 1000)) {
            setSubscription(sub);
            setIsSubscribed(true);
          }
        });
        setRegistration(reg);
      });
    }
  }, []);

  const subscribeButtonOnClick = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (!registration) return;

    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });
    
    // Send the subscription to your server
    await fetch('/api/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sub),
    });

    setSubscription(sub);
    setIsSubscribed(true);
    console.log('Web push subscribed!');
    console.log(sub);
  };

  const unsubscribeButtonOnClick = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (!subscription) return;

    await subscription.unsubscribe();
    // TODO: you should call your API to delete or invalidate subscription data on server
    setSubscription(null);
    setIsSubscribed(false);
    console.log('Web push unsubscribed!');
  };

  if (!registration) {
    return null;
  }

  return (
    <div>
      {isSubscribed ? (
        <button onClick={unsubscribeButtonOnClick}>Unsubscribe from Push Notifications</button>
      ) : (
        <button onClick={subscribeButtonOnClick}>Subscribe to Push Notifications</button>
      )}
    </div>
  );
}