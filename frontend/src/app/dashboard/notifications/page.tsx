'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Notifications are now shown as a popup from the bell icon.
// This page redirects to dashboard.
export default function NotificationsPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard'); }, [router]);
  return null;
}
