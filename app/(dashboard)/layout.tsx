'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import Image from 'next/image';

function Preloader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      {/* Animated logo */}
      <div className="relative mb-8">
        {/* Outer pulsing ring */}
        <div
          className="absolute -inset-4 rounded-3xl animate-ping opacity-15"
          style={{ backgroundColor: '#FFC078' }}
        />
        {/* Inner glow ring */}
        <div
          className="absolute -inset-2 rounded-2xl animate-pulse opacity-30"
          style={{ backgroundColor: '#FFC078' }}
        />
        {/* Logo card */}
        <div
          className="relative w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #0A0042 0%, #002E4D 100%)' }}
        >
          <Image
            src="/logo.png"
            alt="Flair Technologies"
            width={52}
            height={52}
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Brand text */}
      <div className="text-center mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
          Flair Technologies
        </p>
        <p className="text-2xl font-black text-foreground">Teams</p>
      </div>

      {/* Animated dots */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full animate-bounce"
            style={{
              backgroundColor: '#FFC078',
              animationDelay: `${i * 0.18}s`,
              animationDuration: '0.8s',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/signin');
  }, [user, isLoading, router]);

  if (isLoading) return <Preloader />;
  if (!user) return <Preloader />; // brief flash while redirect fires

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
