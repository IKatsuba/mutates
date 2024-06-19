import clsx from 'clsx';
import { type Metadata } from 'next';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';

import { Layout } from '../components/Layout';
import { Providers } from './providers';

import '../styles/tailwind.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Use local version of Lexend so that we can use OpenType features
const lexend = localFont({
  src: '../fonts/lexend.woff2',
  display: 'swap',
  variable: '--font-lexend',
});

export const metadata: Metadata = {
  title: {
    template: '%s - Mutates Docs',
    default: 'Mutates Docs',
  },
  description: 'Mutates is a set of tools for mutating TS source code.',
  metadataBase: new URL('https://mutates.katsuba.dev'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={clsx('h-full antialiased', inter.variable, lexend.variable)}
      suppressHydrationWarning
    >
      <body className="flex min-h-full bg-white dark:bg-slate-900">
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
      </body>
    </html>
  );
}
