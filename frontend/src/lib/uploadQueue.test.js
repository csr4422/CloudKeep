import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createUploadQueue, MAX_UPLOAD_SIZE } from './uploadQueue.js'

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))
const files = (count) => Array.from({ length: count }, (_, id) => ({ name: `${id}.txt`, size: 10 }))

function harness() {
  const transfers = []
  const completed = []
  const queue = createUploadQueue({
    upload: (item, callbacks) => new Promise((resolve, reject) => {
      callbacks.signal.addEventListener('abort', () => reject(new Error('aborted')))
      transfers.push({ item, ...callbacks, resolve, reject })
    }),
    onSuccess: (item) => completed.push(item),
    errorMessage: (error) => error.message,
  })
  return { queue, transfers, completed }
}

test('limits concurrency to three and retains each original destination', async () => {
  const { queue, transfers, completed } = harness()
  queue.add(files(4), { account: 'a', folder: 'f' })
  queue.add(files(1), { account: 'b', folder: null })
  await tick()
  assert.equal(transfers.length, 3)
  assert.deepEqual(queue.getSnapshot().map((item) => item.status), ['uploading', 'uploading', 'uploading', 'queued', 'queued'])
  transfers[0].onProgress(45)
  assert.equal(queue.getSnapshot()[0].progress, 45)
  transfers[0].onFinishing()
  assert.equal(queue.getSnapshot()[0].status, 'finishing')
  transfers[0].resolve()
  await tick()
  assert.equal(transfers.length, 4)
  assert.equal(completed[0].folder, 'f')
  assert.equal(queue.getSnapshot()[0].file, null)
  transfers[1].resolve()
  await tick()
  assert.equal(transfers[4].item.account, 'b')
  assert.equal(transfers[4].item.folder, null)
  queue.dispose()
  await tick()
})

test('cancels active and queued files, retries failures, and dismisses done files', async () => {
  const { queue, transfers } = harness()
  queue.add(files(4), { account: 'a', folder: null })
  await tick()
  queue.cancel(4)
  queue.cancel(1)
  await tick()
  assert.equal(transfers[0].signal.aborted, true)
  assert.equal(transfers.length, 3)
  assert.equal(queue.getSnapshot()[0].error, 'Upload cancelled.')
  assert.equal(queue.getSnapshot()[3].status, 'failed')
  queue.retry(1)
  await tick()
  assert.equal(transfers.length, 4)
  transfers[3].reject(new Error('Storage unavailable'))
  await tick()
  assert.equal(queue.getSnapshot()[0].error, 'Storage unavailable')
  queue.retry(1)
  await tick()
  transfers[4].resolve()
  await tick()
  assert.equal(queue.getSnapshot()[0].status, 'done')
  queue.dismiss(1)
  assert.equal(queue.getSnapshot().some((item) => item.id === 1), false)
  queue.dispose()
  await tick()
})

test('rejects oversized files and aborts without starting queued work on disposal', async () => {
  const { queue, transfers } = harness()
  queue.add([{ name: 'huge', size: MAX_UPLOAD_SIZE + 1 }, ...files(5)], { account: 'a' })
  await tick()
  assert.equal(queue.getSnapshot().length, 5)
  queue.dispose()
  await tick()
  assert.equal(transfers.length, 3)
  assert.ok(transfers.every((transfer) => transfer.signal.aborted))
  assert.equal(queue.getSnapshot().some((item) => item.status === 'queued'), false)
})
