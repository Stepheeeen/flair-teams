'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/signin');
      }
    }
  }, [user, isLoading, router]);

  // Use the same simple preloader while determining auth state
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="relative animate-pulse">
        <Image
          src="/logo.png"
          alt="Flair Technologies"
          width={80}
          height={80}
          className="object-contain drop-shadow-xl"
          priority
        />
      </div>
    </div>
  );
}
