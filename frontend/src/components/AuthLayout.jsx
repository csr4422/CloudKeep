import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function AuthLayout({ title, description, children, footer }) {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#f5f5f2] px-4 py-10 text-zinc-950">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-48 size-[34rem] rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -bottom-64 -right-32 size-[38rem] rounded-full bg-amber-100/80 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#a1a1aa_0.7px,transparent_0.7px)] [background-size:20px_20px] opacity-30" />
      </div>

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/70 bg-white/50 shadow-[0_24px_100px_-40px_rgba(24,24,27,0.35)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between bg-zinc-950 p-10 text-white lg:flex xl:p-14">
          <Link to="/" className="flex w-fit items-center gap-3" aria-label="CloudKeep home">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-300 text-zinc-950">
              <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
                <path d="M7.5 18.25h9a4.25 4.25 0 0 0 .4-8.48A5.75 5.75 0 0 0 6.1 8.5a4.9 4.9 0 0 0 1.4 9.75Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M12 11.5v7m0-7-2.5 2.5M12 11.5l2.5 2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-lg font-semibold tracking-tight">CloudKeep</span>
          </Link>

          <div className="max-w-md py-12">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium tracking-wide text-emerald-200">
              <span className="size-1.5 rounded-full bg-emerald-300" />
              YOUR STORAGE. YOUR RULES.
            </div>
            <h1 className="text-4xl font-medium leading-[1.08] tracking-[-0.04em] xl:text-5xl">
              A calmer place for all your files.
            </h1>
            <p className="mt-5 max-w-sm text-base leading-7 text-zinc-400">
              Bring your own storage and keep your files organized in one simple workspace.
            </p>
          </div>

          <p className="text-xs text-zinc-500">Private by design. Connected by you.</p>
        </section>

        <section className="flex items-center justify-center p-5 sm:p-10 xl:p-14">
          <div className="w-full max-w-md">
            <Link to="/" className="mb-8 flex w-fit items-center gap-2.5 lg:hidden">
              <span className="grid size-9 place-items-center rounded-xl bg-zinc-950 text-emerald-300">
                <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
                  <path d="M7.5 18.25h9a4.25 4.25 0 0 0 .4-8.48A5.75 5.75 0 0 0 6.1 8.5a4.9 4.9 0 0 0 1.4 9.75Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  <path d="M12 11.5v7m0-7-2.5 2.5M12 11.5l2.5 2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="font-semibold tracking-tight">CloudKeep</span>
            </Link>
            <Card className="gap-0 border-0 bg-transparent py-0 shadow-none ring-0">
              <CardHeader className="px-0 pb-6">
                <CardTitle className="text-3xl font-semibold tracking-[-0.04em]">{title}</CardTitle>
                <CardDescription className="mt-2 text-sm leading-6">{description}</CardDescription>
              </CardHeader>
              <CardContent className="px-0">{children}</CardContent>
            </Card>
            <div className="mt-7 text-center text-sm text-zinc-500">{footer}</div>
          </div>
        </section>
      </div>
    </main>
  )
}
