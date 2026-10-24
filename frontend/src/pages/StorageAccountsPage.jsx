import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { LoaderCircleIcon, MoreHorizontalIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  createStorageAccount,
  deleteStorageAccount,
  listStorageAccounts,
  testStorageAccountConnection,
  updateStorageAccount,
} from '@/api/storageAccounts'
import { StorageAccountDialog } from '@/components/StorageAccountDialog'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const storageAccountsQueryKey = ['storageAccounts']
const accountGridColumns = 'xl:grid-cols-[minmax(14rem,1fr)_9rem_12rem_9rem_3rem]'

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function providerLabel(provider) {
  return provider === 'r2' ? 'Cloudflare R2' : 'MinIO'
}

function AccountMark({ provider }) {
  return (
    <span className={`grid size-11 shrink-0 place-items-center rounded-2xl text-sm font-semibold ${provider === 'r2' ? 'bg-orange-100 text-orange-800' : 'bg-violet-100 text-violet-800'}`}>
      {provider === 'r2' ? 'R2' : 'M'}
    </span>
  )
}

export function StorageAccountsPage() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [deletingAccount, setDeletingAccount] = useState(null)

  const accountsQuery = useQuery({
    queryKey: storageAccountsQueryKey,
    queryFn: listStorageAccounts,
  })

  const createMutation = useMutation({
    mutationFn: createStorageAccount,
    gcTime: 0,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: storageAccountsQueryKey })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateStorageAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: storageAccountsQueryKey })
      toast.success('Storage account updated.')
    },
    onError: () => toast.error('Unable to update this storage account.'),
  })

  const testMutation = useMutation({
    mutationFn: testStorageAccountConnection,
    onSuccess: () => toast.success('Storage connection succeeded.'),
    onError: () => toast.error('Storage connection failed. Check the account settings.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteStorageAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: storageAccountsQueryKey })
      toast.success('Storage account deleted.')
      setDeletingAccount(null)
    },
    onError: () => toast.error('Unable to delete this storage account.'),
  })

  async function saveAccount(values, account) {
    if (account) {
      await updateMutation.mutateAsync({
        id: account.id,
        values: { name: values.name, bucket_name: values.bucket_name },
      })
      setDialogOpen(false)
      setEditingAccount(null)
      return
    }

    let created
    try {
      created = await createMutation.mutateAsync(values)
    } catch (error) {
      createMutation.reset()
      throw error
    }
    createMutation.reset()
    setDialogOpen(false)
    setEditingAccount(null)
    testMutation.mutate(created.id)
  }

  function openAddDialog() {
    setEditingAccount(null)
    setDialogOpen(true)
  }

  function openEditDialog(account) {
    setEditingAccount(account)
    setDialogOpen(true)
  }

  const accounts = accountsQuery.data || []
  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <main className="min-h-svh bg-[#f5f5f2] px-5 py-8 text-zinc-950 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/app" className="grid size-10 place-items-center rounded-xl bg-zinc-950 text-emerald-300" aria-label="CloudKeep workspace">
              <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
                <path d="M7.5 18.25h9a4.25 4.25 0 0 0 .4-8.48A5.75 5.75 0 0 0 6.1 8.5a4.9 4.9 0 0 0 1.4 9.75Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M12 11.5v7m0-7-2.5 2.5M12 11.5l2.5 2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <div>
              <p className="text-sm font-semibold tracking-tight">CloudKeep</p>
              <p className="text-xs text-zinc-500">Your storage connections</p>
            </div>
          </div>
          <Button
            className="h-10 rounded-xl bg-zinc-950 px-4 text-white hover:bg-zinc-800"
            onClick={openAddDialog}
          >
            <span aria-hidden="true" className="mr-1 text-lg leading-none">+</span>
            Add account
          </Button>
        </header>

        <section className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-800">Storage</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Your accounts</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600">
                Connect storage you control and manage it from one place.
              </p>
            </div>
            <Link to="/app" className="text-sm font-medium text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950">
              Back to workspace
            </Link>
          </div>

          {location.state?.prompt && (
            <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-950">
              {location.state.prompt}
            </div>
          )}

          {accountsQuery.isLoading ? (
            <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500">
              Loading storage accounts…
            </div>
          ) : accountsQuery.isError ? (
            <div className="mt-8 rounded-3xl border border-red-200 bg-white p-8">
              <p className="font-medium text-zinc-900">Couldn’t load storage accounts.</p>
              <p className="mt-1 text-sm text-zinc-500">Check your connection and try again.</p>
              <Button variant="outline" className="mt-5 rounded-xl" onClick={() => accountsQuery.refetch()}>
                Try again
              </Button>
            </div>
          ) : accounts.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-zinc-300 bg-white/70 px-6 py-14 text-center sm:px-12">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-900">
                <svg viewBox="0 0 24 24" fill="none" className="size-7" aria-hidden="true">
                  <path d="M7.5 18.25h9a4.25 4.25 0 0 0 .4-8.48A5.75 5.75 0 0 0 6.1 8.5a4.9 4.9 0 0 0 1.4 9.75Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M12 12v6m0-6-2.2 2.2M12 12l2.2 2.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <h2 className="mt-5 text-xl font-semibold tracking-tight">No storage accounts yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                Connect your R2 or MinIO bucket to start keeping your files organized.
              </p>
              <Button className="mt-6 h-10 rounded-xl bg-zinc-950 px-4 text-white hover:bg-zinc-800" onClick={openAddDialog}>
                Connect an account
              </Button>
            </div>
          ) : (
            <div className="mt-8 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm shadow-zinc-900/[0.03]">
              <div className={`hidden ${accountGridColumns} gap-4 border-b border-zinc-100 bg-zinc-50/70 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 xl:grid`}>
                <span className="pl-14">Account</span>
                <span>Provider</span>
                <span>Bucket</span>
                <span>Added</span>
                <span className="text-right">Actions</span>
              </div>
              <div className="divide-y divide-zinc-100">
                {accounts.map((account) => (
                  <article key={account.id} className={`grid gap-4 px-5 py-5 sm:px-6 xl:items-center ${accountGridColumns}`}>
                    <div className="flex min-w-0 items-center gap-3">
                      <AccountMark provider={account.provider} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-zinc-900">{account.name}</p>
                        <p className="mt-1 text-xs text-zinc-500 xl:hidden">{providerLabel(account.provider)}</p>
                      </div>
                    </div>
                    <div className="hidden text-sm text-zinc-600 xl:block">{providerLabel(account.provider)}</div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 xl:hidden">Bucket</p>
                      <p className="truncate font-mono text-sm text-zinc-700">{account.bucket_name}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 xl:hidden">Added</p>
                      <p className="text-sm text-zinc-600">{formatDate(account.created_at)}</p>
                    </div>
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="rounded-xl text-zinc-600"
                            aria-label={`Actions for ${account.name}`}
                          >
                            {testMutation.isPending && testMutation.variables === account.id ? (
                              <LoaderCircleIcon className="size-4 animate-spin" />
                            ) : (
                              <MoreHorizontalIcon className="size-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-48">
                          <DropdownMenuItem
                            disabled={testMutation.isPending && testMutation.variables === account.id}
                            onSelect={() => testMutation.mutate(account.id)}
                          >
                            Test connection
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openEditDialog(account)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeletingAccount(account)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <StorageAccountDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingAccount(null)
        }}
        account={editingAccount}
        onSave={saveAccount}
        isSaving={isSaving}
      />

      <AlertDialog open={Boolean(deletingAccount)} onOpenChange={(open) => !open && setDeletingAccount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete storage account?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes “{deletingAccount?.name}” from CloudKeep. Files in the bucket are not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" disabled={deleteMutation.isPending}>Cancel</Button>
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deletingAccount && deleteMutation.mutate(deletingAccount.id)}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete account'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
