import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { AuthProvider } from '@/lib/auth-context';
import { PushManager } from '@/components/push-manager';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'sonner';
import { VisualViewportManager } from '@/components/visual-viewport-manager';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Flair Technologies | Teams',
    template: '%s | Flair Technologies Teams',
  },
  description:
    'Flair Technologies Teams — the collaborative project management platform for high-performance engineering and design teams. Organize projects, assign tasks, and stay aligned.',
  metadataBase: new URL('https://teams.flairtechlabs.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://teams.flairtechlabs.com',
    siteName: 'Flair Technologies | Teams',
    title: 'Flair Technologies | Teams',
    description:
      'Collaborative project management for modern teams at Flair Technologies.',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'Flair Technologies Teams',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Flair Technologies | Teams',
    description: 'Collaborative project management for modern teams.',
    images: ['/logo.png'],
  },
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  keywords: [
    'project management',
    'team collaboration',
    'task management',
    'kanban',
    'Flair Technologies',
    'flairtechlabs',
  ],
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FDF9EC' },
    { media: '(prefers-color-scheme: dark)', color: '#0E1628' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <PushManager />
            <VisualViewportManager />
            {children}
          </AuthProvider>
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  );
}
