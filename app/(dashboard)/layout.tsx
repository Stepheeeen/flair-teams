'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { GlobalAssistantWidget } from '@/components/ai/global-assistant-widget';
import Image from 'next/image';

function Preloader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="relative animate-pulse">
        <Image
          src="/logo.png"
          alt="Flair Technologies"
          width={52}
          height={52}
          className="object-contain drop-shadow-xl"
          priority
        />
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Rely entirely on CSS 100dvh and the interactiveWidget: 'resizes-content' meta tag
  // defined in the root layout to avoid JS resize jitter when the keyboard opens.

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/signin');
      } else {
        const pendingInvite = localStorage.getItem('pending_invite');
        if (pendingInvite) {
          localStorage.removeItem('pending_invite');
          router.push(`/invite/${pendingInvite}`);
        }
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) return <Preloader />;
  if (!user) return <Preloader />; // brief flash while redirect fires

  return (
    <div 
      className="fixed left-0 right-0 flex overflow-hidden overscroll-none"
      style={{
        top: 'var(--visual-viewport-top, 0px)',
        height: 'var(--visual-viewport-height, 100dvh)',
      }}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 flex flex-col overflow-hidden bg-background overscroll-none pb-16 lg:pb-0">
          {children}
        </main>
      </div>
      <GlobalAssistantWidget />
    </div>
  );
}
