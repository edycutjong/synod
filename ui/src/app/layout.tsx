import './globals.css';
import type { Metadata } from 'next';
import { Inter, Orbitron, JetBrains_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
});

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://synod.edycu.dev'),
  title: 'Synod War-Room Console — Atomic Multi-Agent TEE Orchestration',
  description: 'Atomic multi-agent transactional orchestration engine running inside Intel TDX TEE boundary with 100% cryptographic rollback guarantees, powered by Terminal 3 ADK.',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Synod',
    statusBarStyle: 'black-translucent',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  openGraph: {
    title: 'Synod War-Room Console — Atomic Multi-Agent TEE Orchestration',
    description: 'Atomic multi-agent transactional orchestration engine running inside Intel TDX TEE boundary with 100% cryptographic rollback guarantees, powered by Terminal 3 ADK.',
    url: 'https://synod.edycu.dev',
    siteName: 'Synod',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Synod Console',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Synod War-Room Console — Atomic Multi-Agent TEE Orchestration',
    description: 'Atomic multi-agent transactional orchestration engine running inside Intel TDX TEE boundary with 100% cryptographic rollback guarantees, powered by Terminal 3 ADK.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${orbitron.variable} ${jetbrainsMono.variable}`}>
      <head />
      <body className="antialiased min-h-screen bg-[#090d16] text-[#f8fafc]">
        {children}
      </body>
    </html>
  );
}

