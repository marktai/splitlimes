import { Button } from '@/components/ui/button'
import { Github } from 'lucide-react'
import Link from 'next/link'

// FIX for https://github.com/vercel/next.js/issues/58615
// export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <main>
      <section className="py-16 md:py-24 lg:py-32">
        <div className="container flex max-w-screen-md flex-col items-center gap-4 text-center">
          <h1 className="!leading-none font-bold text-3xl sm:text-5xl md:text-6xl lg:text-7xl landing-header py-2">
            Share <strong>Expenses</strong> <br /> with <strong>Friends</strong>{' '}
            & <strong>Family</strong>
          </h1>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            Hey thanks for using Mark&lsquo;s shameless copy (AKA fork) of spliit.app. I&lsquo;ll be working on some new features
            over the next couple of months, so if you have any suggestions, please let me know!
          </p>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/groups">Go to groups</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="https://github.com/marktai/splitlimes">
                <Github className="w-4 h-4 mr-2" />
                GitHub
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
