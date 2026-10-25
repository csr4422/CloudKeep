import { useEffect, useState, useSyncExternalStore } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { ArrowDownIcon, ArrowUpIcon, ChevronRightIcon, FileIcon, FolderIcon, SearchIcon } from 'lucide-react'
import { getFolder, listFiles, listFolders } from '@/api/files'
import { listStorageAccounts } from '@/api/storageAccounts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { uploadFile, uploadErrorMessage } from '@/api/uploads'
import { createUploadQueue, MAX_UPLOAD_SIZE } from '@/lib/uploadQueue'
import { UploadPanel } from '@/components/UploadPanel'

function LoadingRows() {
  return (
    <div role="status" className="space-y-5 p-6">
      <span className="sr-only">Loading files and folders</span>
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex gap-6" aria-hidden="true">
          <Skeleton className="h-7 flex-1" /><Skeleton className="h-7 w-20" /><Skeleton className="h-7 w-28" />
        </div>
      ))}
    </div>
  )
}

function QueryError({ message, retry, pending }) {
  return (
    <div role="alert" className="p-6">
      <p className="text-sm text-red-700">{message}</p>
      <Button variant="outline" className="mt-3" disabled={pending} onClick={retry}>
        {pending ? 'Retrying…' : 'Try again'}
      </Button>
    </div>
  )
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  if (!Number.isFinite(Number(bytes)) || bytes == null || bytes < 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(bytes / 1024 ** exponent)} ${units[exponent]}`
}

function formatDate(value) {
  const date = new Date(value)
  return value && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : '—'
}

function FolderBrowser({ account, accountName, folder, folderLink, queue }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [ordering, setOrdering] = useState('name')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const ancestorsQuery = useQuery({
    queryKey: ['folderAncestors', account, folder],
    queryFn: async ({ signal }) => {
      const ancestors = []
      const visited = new Set()
      let id = folder
      while (id) {
        if (signal.aborted) throw new Error('Navigation cancelled.')
        if (visited.has(String(id))) throw new Error('Invalid folder hierarchy.')
        visited.add(String(id))
        const folderId = String(id)
        const ancestor = await queryClient.fetchQuery({
          queryKey: ['folder', account, folderId],
          queryFn: ({ signal: folderSignal }) => getFolder(folderId, folderSignal),
        })
        if (String(ancestor.storage_account) !== account) throw new Error('Folder belongs to another account.')
        ancestors.unshift(ancestor)
        id = ancestor.parent
      }
      return ancestors
    },
  })

  const foldersQuery = useQuery({
    queryKey: ['folders', account, folder],
    queryFn: ({ signal }) => listFolders({ account, folder, signal }),
    enabled: ancestorsQuery.isSuccess,
  })
  const filesQuery = useInfiniteQuery({
    queryKey: ['files', account, folder, debouncedSearch, ordering],
    queryFn: ({ pageParam, signal }) => listFiles({ account, folder, search: debouncedSearch, ordering, next: pageParam, signal }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.next || undefined,
    enabled: ancestorsQuery.isSuccess,
  })
  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    noClick: true,
    noKeyboard: true,
    disabled: !ancestorsQuery.isSuccess,
    maxSize: MAX_UPLOAD_SIZE,
    onDrop: (accepted, rejected) => {
      rejected.forEach(({ file, errors }) => {
        toast.error(errors.some((error) => error.code === 'file-too-large')
          ? `${file.name} exceeds the 5 GB upload limit.`
          : `${file.name} could not be added to the upload queue.`)
      })
      queue.add(accepted, {
        account, folder,
        destinationLabel: `${accountName} / ${ancestorsQuery.data?.map((item) => item.name).join(' / ') || 'All files'}`,
      })
    },
  })

  const folders = [...(foldersQuery.data || [])].sort((a, b) => a.name.localeCompare(b.name) || String(a.id).localeCompare(String(b.id)))
  if (ordering === '-name') folders.reverse()
  const files = filesQuery.data?.pages.flatMap((page) => page.results) || []
  const listError = foldersQuery.isError || (filesQuery.isError && !filesQuery.isFetchNextPageError)
  const loading = ancestorsQuery.isPending || foldersQuery.isPending || filesQuery.isPending

  function sortHeader(label, field) {
    const active = ordering.replace(/^-/, '') === field
    const descending = ordering.startsWith('-')
    const Icon = descending ? ArrowDownIcon : ArrowUpIcon
    return (
      <th scope="col" className="px-5 py-3 text-left" aria-sort={active ? (descending ? 'descending' : 'ascending') : 'none'}>
        <Button variant="ghost" className="-ml-2" onClick={() => setOrdering(active && !descending ? `-${field}` : field)}>
          {label}{active && <Icon aria-hidden="true" className="size-3" />}
        </Button>
      </th>
    )
  }

  return (
    <>
      <nav aria-label="Breadcrumb" className="mt-8">
        <ol className="flex flex-wrap items-center gap-2 text-sm">
          <li><Link className="rounded hover:underline focus-visible:outline-2" to={folderLink(null)} aria-current={!folder ? 'page' : undefined}>All files</Link></li>
          {ancestorsQuery.data?.map((ancestor, index, ancestors) => (
            <li key={ancestor.id} className="flex min-w-0 items-center gap-2">
              <ChevronRightIcon className="size-4 shrink-0 text-zinc-400" aria-hidden="true" />
              <Link className="break-all rounded hover:underline focus-visible:outline-2" to={folderLink(ancestor.id)} aria-current={index === ancestors.length - 1 ? 'page' : undefined}>{ancestor.name}</Link>
            </li>
          ))}
          {folder && ancestorsQuery.isPending && <li><Skeleton className="h-5 w-32" /></li>}
        </ol>
      </nav>

      <div className="mt-6 flex items-center gap-2">
        <div className="relative w-full sm:max-w-sm">
          <SearchIcon className="absolute left-3 top-3 size-4 text-zinc-400" aria-hidden="true" />
          <Input type="search" aria-label="Search files in this folder" placeholder="Search files in this folder" value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 rounded-xl bg-white pl-9" />
        </div>
        {search && <Button variant="ghost" onClick={() => setSearch('')}>Clear</Button>}
        <Button className="ml-auto" onClick={open} disabled={!ancestorsQuery.isSuccess}>Upload</Button>
      </div>

      <section {...getRootProps()} aria-label="Files and folders" aria-busy={loading || search !== debouncedSearch} className={`mt-5 overflow-hidden rounded-2xl border bg-white shadow-sm ${isDragActive ? 'border-emerald-600 ring-2 ring-emerald-500' : 'border-zinc-200'}`}>
        <input {...getInputProps()} aria-label="Choose files to upload" />
        <p className={`border-b px-5 py-3 text-sm ${isDragActive ? 'bg-emerald-50 text-emerald-900' : 'text-zinc-500'}`}>
          {isDragActive ? 'Drop files here to upload' : 'Drop files here or use Upload. Maximum 5 GB per file.'}
        </p>
        {ancestorsQuery.isError ? (
          <QueryError message="Couldn’t open this folder. Try again or use All files to return to the root." retry={() => ancestorsQuery.refetch()} pending={ancestorsQuery.isFetching} />
        ) : listError ? (
          <QueryError message="Couldn’t load files and folders." retry={() => { foldersQuery.refetch(); filesQuery.refetch() }} pending={foldersQuery.isFetching || filesQuery.isFetching} />
        ) : loading ? <LoadingRows /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <caption className="sr-only">Folders followed by files in the current folder</caption>
                <thead className="border-b bg-zinc-50 text-zinc-600">
                  <tr>{sortHeader('Name', 'name')}{sortHeader('Size', 'size_bytes')}<th scope="col" className="px-5 py-3 text-left font-medium">Type</th>{sortHeader('Uploaded', 'uploaded_at')}</tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {folders.map((item) => (
                    <tr key={`folder-${item.id}`} className="hover:bg-zinc-50">
                      <td className="px-5 py-4"><Link to={folderLink(item.id)} className="flex items-center gap-3 rounded font-medium hover:underline focus-visible:outline-2"><FolderIcon className="size-5 shrink-0 text-emerald-700" aria-hidden="true" /><span className="break-all">{item.name}</span></Link></td>
                      <td className="px-5 py-4 text-zinc-500">—</td><td className="px-5 py-4 text-zinc-500">Folder</td><td className="px-5 py-4 text-zinc-500">—</td>
                    </tr>
                  ))}
                  {files.map((file) => (
                    <tr key={`file-${file.id}`}>
                      <td className="px-5 py-4"><span className="flex items-center gap-3"><FileIcon className="size-5 shrink-0 text-zinc-400" aria-hidden="true" /><span className="break-all">{file.name}</span></span></td>
                      <td className="whitespace-nowrap px-5 py-4 text-zinc-500">{formatSize(file.size_bytes)}</td>
                      <td className="break-all px-5 py-4 text-zinc-500">{file.content_type || 'File'}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-zinc-500">{formatDate(file.uploaded_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {files.length === 0 && (
              <div role="status" className="px-6 py-12 text-center">
                <h2 className="font-medium">{debouncedSearch ? 'No matching files' : folders.length ? 'No files in this folder' : 'This folder is empty'}</h2>
                <p className="mt-2 text-sm text-zinc-500">{debouncedSearch ? 'Try a different name or clear your search. Folders are shown above.' : folders.length ? 'Open a folder to keep browsing.' : 'Files and folders will appear here.'}</p>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
              <p role="status" className="text-xs text-zinc-500">{folders.length} folders · {files.length} of {filesQuery.data?.pages[0]?.count || 0} files</p>
              {filesQuery.hasNextPage && !filesQuery.isFetchNextPageError && <Button variant="outline" disabled={filesQuery.isFetching || search !== debouncedSearch} onClick={() => filesQuery.fetchNextPage()}>{filesQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}</Button>}
            </div>
            {filesQuery.isFetchNextPageError && <QueryError message="Couldn’t load more files. Your loaded files are still shown." retry={() => filesQuery.fetchNextPage()} pending={filesQuery.isFetching} />}
          </>
        )}
      </section>
    </>
  )
}

export function FilesPage() {
  const queryClient = useQueryClient()
  const [queue] = useState(() => createUploadQueue({
    upload: uploadFile,
    errorMessage: uploadErrorMessage,
    onSuccess: (item) => {
      void queryClient.invalidateQueries({ queryKey: ['files', item.account, item.folder] })
    },
  }))
  const uploads = useSyncExternalStore(queue.subscribe, queue.getSnapshot)
  useEffect(() => () => queue.dispose(), [queue])
  const [params, setParams] = useSearchParams()
  const accountsQuery = useQuery({ queryKey: ['storageAccounts'], queryFn: listStorageAccounts })
  const accounts = accountsQuery.data || []
  const requestedAccount = params.get('account')
  const account = accounts.find((item) => String(item.id) === requestedAccount)
  const folder = params.get('folder') || null

  function folderLink(id) {
    const next = new URLSearchParams(params)
    if (id != null) next.set('folder', String(id))
    else next.delete('folder')
    return `/app/files?${next}`
  }

  if (accountsQuery.isSuccess && accounts.length === 0) {
    return <Navigate to="/app/storage" replace state={{ prompt: 'Connect a storage account to start browsing your files.' }} />
  }
  if (accountsQuery.isSuccess && !account) {
    const next = new URLSearchParams(params)
    next.set('account', String(accounts[0].id))
    // Preserve a folder deep link when choosing the default account for the first time.
    if (requestedAccount) next.delete('folder')
    return <Navigate to={`/app/files?${next}`} replace />
  }

  return (
    <main className="min-h-svh bg-[#f5f5f2] px-5 py-8 text-zinc-950 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link to="/app" className="font-semibold tracking-tight">CloudKeep</Link>
          <Button asChild variant="outline" className="h-10 rounded-xl bg-white"><Link to="/app/storage">Storage accounts</Link></Button>
        </header>
        <div className="mt-12 flex flex-wrap items-end justify-between gap-6">
          <div><p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-800">Workspace</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Your files</h1></div>
          {account && <div className="w-full sm:w-72">
            <label id="account-label" className="mb-2 block text-sm text-zinc-600">Storage account</label>
            <Select value={String(account.id)} onValueChange={(value) => {
              const next = new URLSearchParams(params)
              next.set('account', value)
              next.delete('folder')
              setParams(next)
            }}>
              <SelectTrigger aria-labelledby="account-label" className="h-10 w-full rounded-xl bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>{accounts.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>}
        </div>
        {accountsQuery.isPending ? <LoadingRows /> : accountsQuery.isError ? <QueryError message="Couldn’t load storage accounts." retry={() => accountsQuery.refetch()} pending={accountsQuery.isFetching} /> : account && <FolderBrowser key={`${account.id}:${folder || 'root'}`} account={String(account.id)} accountName={account.name} folder={folder} folderLink={folderLink} queue={queue} />}
        <UploadPanel items={uploads} queue={queue} />
      </div>
    </main>
  )
}
