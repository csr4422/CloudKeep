import { useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileIcon, FolderIcon, MoreHorizontalIcon } from 'lucide-react'
import { toast } from 'sonner'
import { deleteFile, getFileDownloadUrl, listFolders, moveFile, renameFile } from '@/api/files'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

function errorMessage(error) {
  const data = error.response?.data
  if (error.response?.status === 400 && data && typeof data === 'object') {
    return Object.values(data).flat().join(' ') || 'The request was rejected.'
  }
  return 'Could not complete this action. Please try again.'
}

function FolderPicker({ account, currentFolder, pending, onMove }) {
  const [path, setPath] = useState([])
  const target = path.at(-1)?.id ?? null
  const query = useQuery({
    queryKey: ['folders', account, target == null ? null : String(target)],
    queryFn: ({ signal }) => listFolders({ account, folder: target, signal }),
  })
  const isCurrent = String(target ?? '') === String(currentFolder ?? '')
  return (
    <>
      <nav aria-label="Destination folder" className="flex flex-wrap gap-1 text-sm">
        <Button variant="ghost" disabled={pending} onClick={() => setPath([])}>Root</Button>
        {path.map((folder, index) => <Button key={folder.id} variant="ghost" className="max-w-full truncate" disabled={pending} onClick={() => setPath(path.slice(0, index + 1))}>/ {folder.name}</Button>)}
      </nav>
      <div className="max-h-60 min-h-24 overflow-auto rounded-lg border p-2" aria-busy={query.isFetching}>
        {query.isPending ? <p role="status" className="p-2 text-sm">Loading folders…</p> : query.isError ? (
          <div role="alert" className="p-2"><p>Couldn’t load folders.</p><Button variant="outline" disabled={query.isFetching || pending} onClick={() => query.refetch()}>Try again</Button></div>
        ) : query.data.length ? query.data.map((folder) => (
          <Button key={folder.id} variant="ghost" className="h-auto w-full justify-start py-2 text-left whitespace-normal" disabled={pending} onClick={() => setPath([...path, folder])}>
            <FolderIcon aria-hidden="true" /><span className="break-all">{folder.name}</span>
          </Button>
        )) : <p className="p-2 text-sm text-zinc-500">No subfolders.</p>}
      </div>
      <p className="text-sm text-zinc-500">{isCurrent ? 'This is the file’s current folder. Choose another destination.' : `Destination: ${path.at(-1)?.name || 'Root'}`}</p>
      <Button disabled={pending || isCurrent || !query.isSuccess} onClick={() => onMove(target)}>{pending ? 'Moving…' : 'Move here'}</Button>
    </>
  )
}

export function FileRow({ file, account, size, date }) {
  const queryClient = useQueryClient()
  const nameId = useId()
  const [dialog, setDialog] = useState(null)
  const [name, setName] = useState(file.name)
  const [nameError, setNameError] = useState('')

  const mutation = useMutation({
    mutationFn: ({ action, value }) => {
      if (action === 'rename') return renameFile(file.id, value)
      if (action === 'move') return moveFile(file.id, value)
      if (action === 'delete') return deleteFile(file.id)
      return getFileDownloadUrl(file.id)
    },
    onSuccess: async (data, { action, tab }) => {
      if (action === 'open' || action === 'download') {
        try {
          const url = new URL(data.download_url)
          if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid download URL')
          if (action === 'open') {
            if (!tab.closed) tab.location.href = url.href
          } else {
            const anchor = document.createElement('a')
            anchor.href = url.href
            anchor.download = file.name
            anchor.rel = 'noopener noreferrer'
            anchor.hidden = true
            document.body.appendChild(anchor)
            anchor.click()
            anchor.remove()
          }
        } catch {
          tab?.close()
          toast.error('Could not open the file URL. Please try again.')
          return
        }
      } else {
        setDialog(null)
        toast.success(action === 'delete' ? 'File deleted.' : action === 'move' ? 'File moved.' : 'File renamed.')
        if (action === 'delete') {
          queryClient.setQueriesData({ queryKey: ['files', account] }, (cached) => {
            if (!cached?.pages) return cached
            const containsFile = cached.pages.some((page) => page.results.some((item) => item.id === file.id))
            if (!containsFile) return cached
            return { ...cached, pages: cached.pages.map((page) => ({ ...page, count: Math.max(0, page.count - 1), results: page.results.filter((item) => item.id !== file.id) })) }
          })
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['files', account] })
    },
    onError: (error, { action, tab }) => {
      tab?.close()
      if (action === 'rename' && error.response?.status === 400 && error.response.data?.name) {
        const messages = error.response.data.name
        setNameError(Array.isArray(messages) ? messages.join(' ') : String(messages))
      } else toast.error(errorMessage(error))
    },
  })
  const pending = mutation.isPending

  function openFile() {
    if (pending) return
    const tab = window.open('', '_blank')
    if (!tab) {
      toast.error('Allow popups to open this file.')
      return
    }
    tab.opener = null
    mutation.mutate({ action: 'open', tab })
  }

  function openDialog(action) {
    setName(file.name)
    setNameError('')
    setDialog(action)
  }

  function submitRename(event) {
    event.preventDefault()
    if (pending) return
    const value = name.trim()
    if (!value || Array.from(value).length > 255) {
      setNameError(!value ? 'Enter a file name.' : 'Use at most 255 characters.')
      return
    }
    setNameError('')
    mutation.mutate({ action: 'rename', value })
  }

  return (
    <>
      <tr>
        <td className="px-5 py-4"><button type="button" disabled={pending} onClick={openFile} className="flex items-center gap-3 rounded text-left hover:underline focus-visible:outline-2 disabled:opacity-50"><FileIcon className="size-5 shrink-0 text-zinc-400" aria-hidden="true" /><span className="break-all">{file.name}</span></button></td>
        <td className="whitespace-nowrap px-5 py-4 text-zinc-500">{size}</td>
        <td className="break-all px-5 py-4 text-zinc-500">{file.content_type || 'File'}</td>
        <td className="whitespace-nowrap px-5 py-4 text-zinc-500">{date}</td>
        <td className="px-3 py-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={pending} aria-label={`Actions for ${file.name}`}><MoreHorizontalIcon aria-hidden="true" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={pending} onSelect={openFile}>Open</DropdownMenuItem>
              <DropdownMenuItem disabled={pending} onSelect={() => mutation.mutate({ action: 'download' })}>Download</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={pending} onSelect={() => openDialog('rename')}>Rename</DropdownMenuItem>
              <DropdownMenuItem disabled={pending} onSelect={() => openDialog('move')}>Move</DropdownMenuItem>
              <DropdownMenuItem disabled={pending} variant="destructive" onSelect={() => openDialog('delete')}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>
      <Dialog open={dialog === 'rename' || dialog === 'move'} onOpenChange={(open) => { if (!open && !pending) setDialog(null) }}>
        <DialogContent showCloseButton={!pending}>
          <DialogHeader><DialogTitle>{dialog === 'move' ? 'Move file' : 'Rename file'}</DialogTitle><DialogDescription className="break-all">{file.name}</DialogDescription></DialogHeader>
          {dialog === 'rename' && <form onSubmit={submitRename} className="space-y-4" noValidate>
            <div className="space-y-2"><Label htmlFor={nameId}>File name</Label><Input id={nameId} value={name} disabled={pending} onChange={(event) => { setName(event.target.value); setNameError('') }} aria-invalid={Boolean(nameError)} aria-describedby={nameError ? `${nameId}-error` : undefined} autoFocus />{nameError && <p id={`${nameId}-error`} role="alert" className="text-sm text-red-700">{nameError}</p>}</div>
            <DialogFooter><Button type="button" variant="outline" disabled={pending} onClick={() => setDialog(null)}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button></DialogFooter>
          </form>}
          {dialog === 'move' && <FolderPicker account={account} currentFolder={file.folder} pending={pending} onMove={(value) => mutation.mutate({ action: 'move', value })} />}
        </DialogContent>
      </Dialog>
      <AlertDialog open={dialog === 'delete'} onOpenChange={(open) => { if (!open && !pending) setDialog(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete file?</AlertDialogTitle><AlertDialogDescription className="break-all">Delete “{file.name}” from storage? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel><Button variant="destructive" disabled={pending} onClick={() => mutation.mutate({ action: 'delete' })}>{pending ? 'Deleting…' : 'Delete'}</Button></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
