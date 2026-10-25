export const MAX_UPLOAD_SIZE = 5 * 1024 ** 3

export function createUploadQueue({ upload, onSuccess, errorMessage }) {
  let items = []
  let nextId = 0
  const listeners = new Set()
  const active = new Map()
  const emit = () => listeners.forEach((listener) => listener())
  const update = (id, patch) => {
    items = items.map((item) => item.id === id ? { ...item, ...patch } : item)
    emit()
  }

  function pump() {
    while (active.size < 3) {
      const item = items.find((entry) => entry.status === 'queued' && !active.has(entry.id))
      if (!item) break
      const controller = new AbortController()
      active.set(item.id, controller)
      update(item.id, { status: 'uploading', error: null })
      Promise.resolve().then(() => {
        controller.signal.throwIfAborted()
        return upload(item, {
          signal: controller.signal,
          onProgress: (progress) => update(item.id, { progress }),
          onFinishing: () => update(item.id, { status: 'finishing', progress: 100 }),
        })
      }).then(() => {
        update(item.id, { status: 'done', progress: 100, file: null })
        onSuccess(item)
      }).catch((error) => {
        update(item.id, {
          status: 'failed',
          error: controller.signal.aborted ? 'Upload cancelled.' : errorMessage(error),
        })
      }).finally(() => {
        active.delete(item.id)
        pump()
      })
    }
  }

  return {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    getSnapshot: () => items,
    add(files, destination) {
      items = [...items, ...files.filter((file) => file.size <= MAX_UPLOAD_SIZE).map((file) => ({
        id: ++nextId, file, name: file.name, ...destination, status: 'queued', progress: 0, error: null,
      }))]
      emit()
      pump()
    },
    cancel(id) {
      const item = items.find((entry) => entry.id === id)
      // Completion may already have committed a row; let it finish once the PUT succeeds.
      if (!item || !['queued', 'uploading'].includes(item.status)) return
      if (active.has(id)) active.get(id).abort()
      else update(id, { status: 'failed', error: 'Upload cancelled.' })
    },
    retry(id) {
      if (active.has(id) || !items.some((item) => item.id === id && item.status === 'failed')) return
      update(id, { status: 'queued', progress: 0, error: null })
      pump()
    },
    dismiss(id) {
      items = items.filter((item) => item.id !== id || !['done', 'failed'].includes(item.status))
      emit()
    },
    dispose() {
      items = items.filter((item) => item.status !== 'queued')
      active.forEach((controller) => controller.abort())
    },
  }
}
