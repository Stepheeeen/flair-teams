'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import Image from 'next/image';

function Preloader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="relative">
        <div className="absolute -inset-3 rounded-2xl animate-pulse opacity-20" style={{ backgroundColor: '#FFC078' }} />
        <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl"
          style={{ background: 'linear-gradient(135deg, #0A0042 0%, #002E4D 100%)' }}>
          <Image src="/logo.png" alt="Flair" width={40} height={40} className="object-contain" priority />
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.push('/signin');
  }, [user, isLoading, router]);

  if (isLoading) return <Preloader />;
  if (!user) return <Preloader />; // brief flash while redirect fires

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background pb-16 lg:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
