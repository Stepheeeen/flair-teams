'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
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
    <div className="flex h-[100dvh] overflow-hidden overscroll-none">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 flex flex-col overflow-hidden bg-background overscroll-none">
          {children}
        </main>
      </div>
    </div>
  );
}
