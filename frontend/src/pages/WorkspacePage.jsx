import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/button'

export function WorkspacePage() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="min-h-svh bg-[#f5f5f2] px-5 py-8 text-zinc-950 sm:px-10">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-zinc-950 text-emerald-300">
            <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
              <path d="M7.5 18.25h9a4.25 4.25 0 0 0 .4-8.48A5.75 5.75 0 0 0 6.1 8.5a4.9 4.9 0 0 0 1.4 9.75Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <path d="M12 11.5v7m0-7-2.5 2.5M12 11.5l2.5 2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="font-semibold tracking-tight">CloudKeep</span>
        </div>
        <Button variant="outline" className="h-10 rounded-xl bg-white" onClick={handleLogout}>
          Sign out
        </Button>
      </header>
      <section className="mx-auto mt-20 max-w-6xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-800">Workspace</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">You’re signed in.</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600">
          Your CloudKeep workspace is ready. Connect a storage account to get started.
        </p>
        <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-8 text-sm text-zinc-500">
          Storage account setup is the next step.
        </div>
      </section>
    </main>
  )
}
