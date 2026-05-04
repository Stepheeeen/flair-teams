'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { CheckCircle, Users, Layout, Zap, ArrowRight, Github } from 'lucide-react';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Handle redirect if logged in
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-teal-500 font-medium animate-pulse">Initializing Flair Teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-teal-500/30 selection:text-teal-400 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center rotate-3 hover:rotate-0 transition-transform duration-300">
              <Layout className="w-6 h-6 text-black" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Flair<span className="text-teal-500">Teams</span></span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-teal-400 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-teal-400 transition-colors">How it Works</a>
            <a href="#pricing" className="hover:text-teal-400 transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/signin">
              <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-white/5">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-teal-500 hover:bg-teal-400 text-black font-bold px-6">
                Launch App
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 sm:pt-40 pb-16 sm:pb-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-6xl pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-teal-500/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-[150px]"></div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold uppercase tracking-widest mb-6">
                <Zap className="w-3 h-3" />
                Now in Private Beta
              </div>
              <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black leading-[0.9] tracking-tighter mb-6 sm:mb-8">
                COLLABORATE <br />
                <span className="text-teal-500">WITHOUT</span> LIMITS.
              </h1>
              <p className="text-base sm:text-xl text-zinc-400 max-w-xl mb-8 sm:mb-10 leading-relaxed">
                Flair Teams is the high-performance project management platform built for modern engineering and design squads. Move faster, stay synced.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
                <Link href="/signup" className="w-full sm:w-auto">
                  <Button size="lg" className="bg-teal-500 hover:bg-teal-400 text-black font-black text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-10 group w-full sm:w-auto">
                    Get Started Free
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="border-white/10 hover:bg-white/5 h-12 sm:h-14 px-6 sm:px-10 font-bold w-full sm:w-auto">
                  <Github className="mr-2 w-4 h-4" />
                  View on GitHub
                </Button>
              </div>
              
              <div className="mt-12 flex items-center justify-center lg:justify-start gap-8 opacity-50">
                <div className="flex flex-col">
                  <span className="text-2xl font-bold">2.4k+</span>
                  <span className="text-xs uppercase tracking-widest text-zinc-500">Waitlist</span>
                </div>
                <div className="w-px h-8 bg-white/10"></div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold">99.9%</span>
                  <span className="text-xs uppercase tracking-widest text-zinc-500">Uptime</span>
                </div>
                <div className="w-px h-8 bg-white/10"></div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold">15ms</span>
                  <span className="text-xs uppercase tracking-widest text-zinc-500">Latency</span>
                </div>
              </div>
            </div>

            <div className="flex-1 relative mt-8 lg:mt-0">
              <div className="relative z-10 rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-teal-500/10 group">
                <Image 
                  src="/flair_teams_hero_1777795135926.png" 
                  alt="Flair Teams Dashboard" 
                  width={800} 
                  height={800}
                  className="w-full h-auto grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-60"></div>
              </div>
              
              {/* Floating UI Elements */}
              <div className="absolute -top-6 -right-6 bg-zinc-900 border border-white/10 p-4 rounded-xl shadow-2xl animate-bounce duration-[3000ms] hidden xl:block">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Task Completed</p>
                    <p className="text-[10px] text-zinc-500">Design System update</p>
                  </div>
                </div>
              </div>
              
              <div className="absolute -bottom-6 -left-6 bg-zinc-900 border border-white/10 p-4 rounded-xl shadow-2xl animate-pulse hidden xl:block">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-6 h-6 rounded-full border border-[#0a0a0a] bg-zinc-700"></div>
                    ))}
                  </div>
                  <p className="text-[10px] font-bold text-teal-400">3 Members Online</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black tracking-tighter mb-4">ENGINEERED FOR TEAMS.</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Everything you need to ship products faster without the bloat of traditional project management tools.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Users className="w-8 h-8 text-teal-500" />,
                title: "Team Hierarchy",
                desc: "Manage roles, invitations, and permissions with surgical precision."
              },
              {
                icon: <Layout className="w-8 h-8 text-teal-500" />,
                title: "Kanban Clarity",
                desc: "Visualize your workflow with high-density boards that keep everyone aligned."
              },
              {
                icon: <Zap className="w-8 h-8 text-teal-500" />,
                title: "Real-time Sync",
                desc: "Changes propagate instantly. No more refreshing or stale task data."
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-teal-500/30 transition-all duration-300 group">
                <div className="mb-6 p-3 rounded-lg bg-teal-500/5 inline-block group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                <p className="text-zinc-500 leading-relaxed text-sm">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-teal-500/5 skew-y-1"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl lg:text-7xl font-black tracking-tighter mb-8 italic">
              READY TO <span className="text-teal-500 underline decoration-2 underline-offset-8">ACCELERATE</span>?
            </h2>
            <p className="text-xl text-zinc-400 mb-12">
              Join hundreds of teams already using Flair to streamline their shipping process.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="bg-white hover:bg-zinc-200 text-black font-black text-xl h-20 px-12 rounded-none -rotate-1">
                  Claim Your Workspace
                </Button>
              </Link>
              <Link href="/signin">
                <Button size="lg" variant="ghost" className="text-white font-bold h-20 px-10 hover:bg-white/5">
                  Explore Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex items-center gap-2">
              <Layout className="w-5 h-5 text-teal-500" />
              <span className="font-bold">Flair<span className="text-teal-500">Teams</span></span>
            </div>
            <div className="flex gap-8 text-sm text-zinc-500 font-medium">
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-white transition-colors">GitHub</a>
              <a href="#" className="hover:text-white transition-colors">Discord</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
            </div>
            <p className="text-xs text-zinc-600">
              © 2026 FlairTech Labs. Built for the next generation of builders.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
