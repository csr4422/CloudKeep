import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { listStorageAccounts } from '@/api/storageAccounts'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/button'

export function WorkspacePage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const accountsQuery = useQuery({
    queryKey: ['storageAccounts'],
    queryFn: listStorageAccounts,
  })

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  if (accountsQuery.isLoading) {
    return (
      <main className="grid min-h-svh place-items-center bg-[#f5f5f2] text-sm text-zinc-500">
        Loading your workspace…
      </main>
    )
  }

  if (!accountsQuery.isError && accountsQuery.data?.length === 0) {
    return (
      <Navigate
        to="/app/storage"
        replace
        state={{ prompt: 'Connect a storage account to start using your workspace.' }}
      />
    )
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
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="h-10 rounded-xl bg-white">
            <Link to="/app/storage">Storage accounts</Link>
          </Button>
          <Button variant="outline" className="h-10 rounded-xl bg-white" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </header>
      <section className="mx-auto mt-20 max-w-6xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-800">Workspace</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">You’re signed in.</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600">
          Your CloudKeep workspace is ready. Connect a storage account to get started.
        </p>
        {accountsQuery.isError ? (
          <div className="mt-10 rounded-2xl border border-red-200 bg-white p-6">
            <p className="text-sm text-red-700">Couldn’t load your storage accounts.</p>
            <Button variant="outline" className="mt-4 rounded-xl" onClick={() => accountsQuery.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-8 text-sm text-zinc-500">
            <p>Your storage accounts are ready. Browse your files and folders.</p>
            <Button asChild className="mt-4"><Link to="/app/files">Browse files</Link></Button>
          </div>
        )}
      </section>
    </main>
  )
}
