import { Button } from '@/components/ui/button'

export function UploadPanel({ items, queue }) {
  if (!items.length) return null
  return (
    <section aria-label="Uploads" className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="font-semibold">Uploads</h2>
      <ul className="mt-4 max-h-80 space-y-5 overflow-y-auto">
        {items.map((item) => (
          <li key={item.id} className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="break-all text-sm font-medium">{item.name}</p>
                <p className="text-xs text-zinc-500">{item.destinationLabel}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {['queued', 'uploading'].includes(item.status) && <Button variant="ghost" onClick={() => queue.cancel(item.id)}>Cancel</Button>}
                {item.status === 'failed' && <Button variant="outline" onClick={() => queue.retry(item.id)}>Retry</Button>}
                {['done', 'failed'].includes(item.status) && <Button variant="ghost" aria-label={`Dismiss ${item.name}`} onClick={() => queue.dismiss(item.id)}>Dismiss</Button>}
              </div>
            </div>
            <progress aria-label={`Upload progress for ${item.name}`} value={item.progress} max="100" className="block h-2 w-full overflow-hidden rounded-full accent-emerald-700" />
            <p role="status" className="text-xs capitalize text-zinc-600">{item.status}{item.status === 'uploading' ? ` · ${item.progress}%` : ''}</p>
            {item.error && <p role="alert" className="text-sm text-red-700">{item.error}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
