import { ApplePwaSplash } from '@/app/apple-pwa-splash'
import { ProgressBar } from '@/components/progress-bar'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { env } from '@/lib/env'
import type { Metadata, Viewport } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_BASE_URL),
  title: {
    default: 'splitlimes · Share Expenses with Friends & Family',
    template: '%s · splitlimes',
  },
  description:
    'splitlimes is a minimalist web application to share expenses with friends and family. No ads, no account, no problem.',
  openGraph: {
    title: 'splitlimes · Share Expenses with Friends & Family',
    description:
      'splitlimes is a minimalist web application to share expenses with friends and family. No ads, no account, no problem.',
    images: `/banner.png`,
    type: 'website',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@scastiel',
    site: '@scastiel',
    images: `/banner.png`,
    title: 'splitlimes · Share Expenses with Friends & Family',
    description:
      'splitlimes is a minimalist web application to share expenses with friends and family. No ads, no account, no problem.',
  },
  appleWebApp: {
    capable: true,
    title: 'splitlimes',
  },
  applicationName: 'splitlimes',
  icons: [
    {
      url: '/limes-512x512.png',
      sizes: '512x512',
      type: 'image/png',
    },
  ],
}

export const viewport: Viewport = {
  themeColor: '#047857',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <ApplePwaSplash icon="/limes-512x512.png" color="#027756" />
      <body className="pt-16 min-h-[100dvh] flex flex-col items-stretch bg-slate-50 bg-opacity-30 dark:bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense>
            <ProgressBar />
          </Suspense>
          <header className="fixed top-0 left-0 right-0 h-16 flex justify-between bg-white dark:bg-gray-950 bg-opacity-50 dark:bg-opacity-50 p-2 border-b backdrop-blur-sm z-50">
            <Link
              className="flex items-center gap-2 hover:scale-105 transition-transform"
              href="/"
            >
              <h1>
                <Image
                  src="/limes-512x512.png"
                  className="m-1 h-auto w-auto"
                  // width={(35 * 522) / 180}
                  width={24}
                  height={24}
                  alt="splitlimes"
                />
              </h1>
            </Link>
            <div role="navigation" aria-label="Menu" className="flex">
              <ul className="flex items-center text-sm">
                <li>
                  <Button
                    variant="ghost"
                    asChild
                    className="-my-3 text-primary"
                  >
                    <Link href="/groups">Groups</Link>
                  </Button>
                </li>
                <li>
                  <ThemeToggle />
                </li>
              </ul>
            </div>
          </header>

          <div className="flex-1 flex flex-col">{children}</div>

          <footer className="sm:p-8 md:p-16 sm:mt-16 sm:text-sm md:text-base md:mt-32 bg-slate-50 dark:bg-card border-t p-6 mt-8 flex flex-col sm:flex-row sm:justify-between gap-4 text-xs [&_a]:underline">
            <div className="flex flex-col space-y-2">
              <div className="sm:text-lg font-semibold text-base flex space-x-2 items-center">
                <Link className="flex items-center gap-2" href="/">
                  <Image
                    src="/limes-512x512.png"
                    className="m-1 h-auto w-auto"
                    width={(35 * 522) / 180}
                    height={35}
                    alt="splitlimes"
                  />
                </Link>
              </div>
              <div className="flex flex-col space-y a--no-underline-text-white">
                <span>
                  Donate to{' '}
                  <a
                    href="https://charity.marktai.com"
                    target="_blank"
                    rel="noopener"
                  >
                    charity.marktai.com!
                  </a>
                </span>
                <span>
                  Built by{' '}
                  <a href="https://scastiel.dev" target="_blank" rel="noopener">
                    Sebastien Castiel
                  </a>{' '}
                  and{' '}
                  <a
                    href="https://github.com/spliit/spliit/graphs/contributors"
                    target="_blank"
                    rel="noopener"
                  >
                    contributors
                  </a>
                  , and shamelessly stolen by Mark Tai
                </span>
              </div>
            </div>
          </footer>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
