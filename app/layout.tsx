import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ModeProvider, modeBootScript } from '@/components/providers/ModeProvider';
import { profile } from '@/data/profile';
import BootSequence from '@/components/chrome/BootSequence';
import Nav from '@/components/chrome/Nav';
import CommandPalette from '@/components/chrome/CommandPalette';
import Cursor from '@/components/chrome/Cursor';
import ScrollPacket from '@/components/chrome/ScrollPacket';
import Footer from '@/components/chrome/Footer';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://akansh-control-plane-cloud14.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Akansh Mowar — DevOps, Platform & Cloud Engineer', template: '%s — Akansh Mowar' },
  description: 'Akansh Mowar is a DevOps Engineer in Pune building and operating CI/CD and container platforms — Kubernetes and OpenShift, AWS, Terraform, Helm and GitLab CI/CD across a 50+ microservice banking platform.',
  keywords: ['Akansh Mowar','DevOps Engineer','Platform Engineer','Cloud Engineer','Kubernetes','OpenShift','AWS','Terraform','GitLab CI/CD','Pune'],
  authors: [{ name: profile.name, url: siteUrl }],
  creator: profile.name,
  alternates: { canonical: '/' },
  openGraph: { type: 'profile', url: siteUrl, siteName: 'AKANSH // CONTROL PLANE', title: 'Akansh Mowar — DevOps, Platform & Cloud Engineer', description: 'The control plane of a DevOps career: CI/CD, Kubernetes and OpenShift, AWS, Terraform and release delivery for 50+ microservices.' },
  twitter: { card: 'summary_large_image', title: 'Akansh Mowar — DevOps, Platform & Cloud Engineer', description: 'The control plane of a DevOps career: CI/CD, Kubernetes and OpenShift, AWS, Terraform and release delivery for 50+ microservices.' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: '#08090c', colorScheme: 'dark' };

const personSchema = {
  '@context': 'https://schema.org', '@type': 'Person', name: profile.name, jobTitle: 'DevOps Engineer', url: siteUrl,
  email: `mailto:${profile.email}`,
  address: { '@type': 'PostalAddress', addressLocality: 'Pune', addressCountry: 'IN' },
  worksFor: { '@type': 'Organization', name: 'Barclays' },
  alumniOf: { '@type': 'CollegeOrUniversity', name: 'University of Petroleum and Energy Studies' },
  sameAs: [profile.linkedin, profile.github], knowsAbout: [...profile.primaryCapabilities],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="engineer" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: modeBootScript }} />
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
        <ModeProvider>
          <a href="#index" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-ion focus:px-4 focus:py-2 focus:text-[#05060a]">Skip to content</a>
          <BootSequence /><Cursor /><ScrollPacket /><Nav /><CommandPalette /><main>{children}</main><Footer />
        </ModeProvider>
      </body>
    </html>
  );
}
