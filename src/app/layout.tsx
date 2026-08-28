import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/bricolage-grotesque/wdth.css';
import '@fontsource-variable/instrument-sans/index.css';
import '@fontsource-variable/martian-mono/wdth.css';
import './globals.css';
import { CommissioningIntro } from '@/components/CommissioningIntro';
import { GamePortal } from '@/components/GamePortal';
import { JourneyProvider } from '@/components/JourneySystem';
import { OperatorChrome } from '@/components/OperatorChrome';
import { ProductionFinale } from '@/components/ProductionFinale';
import { CommandConsole } from '@/components/system/CommandConsole';
import { OperatingEnvironment } from '@/components/system/Environment';
import { ReleaseCapsule } from '@/components/system/ReleaseCapsule';
import { TourRunner } from '@/components/system/TourRunner';
import { XRayLayer } from '@/components/system/XRayLayer';
import {
  completedCredentials,
  contact,
  primaryEducation,
  profile,
  site,
} from '@/content';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: '%s — Akansh Mowar' },
  description: site.description,
  applicationName: 'The Lockworks',
  authors: [{ name: profile.name, url: site.url }],
  creator: profile.name,
  keywords: [
    'DevOps Engineer', 'Platform Engineer', 'Cloud Engineer', 'Kubernetes',
    'OpenShift', 'Helm', 'GitLab CI/CD', 'Terraform', 'Argo CD', 'AWS', 'Pune',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'profile',
    url: site.url,
    title: site.title,
    description: site.description,
    siteName: profile.name,
    locale: 'en_IN',
    firstName: profile.givenName,
    lastName: profile.familyName,
    images: [{
      url: site.ogImage,
      width: 1200,
      height: 630,
      alt: 'The Lockworks — Akansh Mowar, DevOps / Platform / Cloud Engineer',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: site.title,
    description: site.description,
    images: [site.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: '/apple-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#E6E8DF' },
    { media: '(prefers-color-scheme: dark)', color: '#0A1215' },
  ],
  colorScheme: 'dark',
};

const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: profile.name,
  jobTitle: 'DevOps Engineer',
  description: profile.summary,
  url: site.url,
  email: `mailto:${contact.email}`,
  address: {
    '@type': 'PostalAddress',
    addressLocality: profile.locality,
    addressRegion: profile.region,
    addressCountry: profile.country,
  },
  worksFor: { '@type': 'Organization', name: 'Barclays' },
  alumniOf: {
    '@type': 'CollegeOrUniversity',
    name: primaryEducation.institution,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Dehradun',
      addressCountry: 'IN',
    },
  },
  sameAs: [contact.linkedin, contact.github],
  knowsAbout: [
    'DevOps', 'Platform engineering', 'Kubernetes', 'Red Hat OpenShift', 'Helm',
    'GitLab CI/CD', 'Docker', 'Terraform', 'Argo CD', 'GitOps',
    'Amazon Web Services', 'Microsoft Azure', 'Release engineering', 'Observability',
  ],
  hasCredential: [
    {
      '@type': 'EducationalOccupationalCredential',
      name: `${primaryEducation.degree} — ${primaryEducation.field}`,
      credentialCategory: 'degree',
      recognizedBy: { '@type': 'CollegeOrUniversity', name: primaryEducation.institution },
    },
    ...completedCredentials.map((c) => ({
      '@type': 'EducationalOccupationalCredential',
      name: c.code ? `${c.name} (${c.code})` : c.name,
      credentialCategory: 'certification',
      recognizedBy: { '@type': 'Organization', name: c.issuer },
    })),
  ],
};

const openingBootstrap = `
(() => {
  const ready = () => { document.documentElement.dataset.opening = 'ready'; };
  try {
    /* The opening belongs to the works, not to every route. */
    if (window.location.pathname !== '/') { ready(); return; }
    const params = new URLSearchParams(window.location.search);
    const forced = params.get('intro') === '1';
    const automationBypass = navigator.webdriver === true && !forced;
    const seen = sessionStorage.getItem('lockworks:opening:v9') === 'seen';
    document.documentElement.dataset.opening = forced || (!seen && !automationBypass)
      ? 'commissioning'
      : 'ready';
  } catch {
    ready();
  }
  /* Hydration is not allowed to hold the page hostage. If React has not
     adopted the opening within eight seconds, the works open anyway. */
  setTimeout(() => {
    if (document.documentElement.dataset.opening === 'commissioning'
      && !document.querySelector('[role="dialog"][aria-label="Commissioning the Lockworks"]')) {
      ready();
    }
  }, 8000);
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local';

  return (
    <html lang="en">
      <head>
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: openingBootstrap }} />
      </head>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <JourneyProvider commit={commit}>
          {/* V10. The run lifecycle is inside; the world that reacts to it is
              outside. Order matters only here: everything below consumes the
              environment, nothing above it does. */}
          <OperatingEnvironment>
            <CommissioningIntro />
            {children}
            <GamePortal />
            <OperatorChrome />
            <ReleaseCapsule />
            <XRayLayer />
            <CommandConsole />
            <TourRunner />
            <ProductionFinale />
          </OperatingEnvironment>
        </JourneyProvider>
        <div className="paper-grain" aria-hidden="true" />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />
      </body>
    </html>
  );
}
