# CloudKeep Progress

## Done

- BYOS file manager monorepo with Django backend and React + Vite scaffold
- Custom `accounts.User`; JWT register, login, refresh at `/api/auth/`
- `StorageAccount` with R2 and MinIO providers, encrypted credentials and `endpoint_url`; CRUD and `test_connection` at `/api/storage-accounts/`; credentials are write-only
- Provider layer: abstract `StorageProvider` with presigned upload/download URLs, `head_object`, `list_objects`, `delete_object`, and `get_usage`; `R2Provider`, `MinIOProvider`, and `get_provider` factory
- Files API at `/api/files/`: presigned upload (`POST upload-url/`, no DB write), completion (`POST complete/`, verifies with `head_object` and takes size from storage), and `GET <id>/download-url/`
- Folder CRUD with cycle checks; storage objects are deleted before folder rows
- File list, search, rename, move, delete; PATCH accepts only `name` and `folder`, rejecting other fields with 400; page size 50 and deterministic ordering
- 25 backend tests with mocked providers; run with `cd backend && python manage.py test`
- Local development: PostgreSQL on host; MinIO in Docker (`ghcr.io/coollabsio/minio`, `minio-data` volume, `user` bucket); root `start.sh`, `stop.sh`, and `token.sh`
- Frontend setup: React Router, Axios with JWT access/refresh, one-time 401 refresh with concurrent-request queue, protected routes, Tailwind, shadcn/ui
- Frontend auth pages at `/register` and `/login`, API field errors, token storage, and protected `/app` page
- Storage account management at `/app/storage`: list, test connection, add with provider-specific validation and automatic connection test, edit name/bucket, and confirmed delete; credentials are never returned or prefilled
- Empty workspaces redirect to `/app/storage` with a prompt to connect an account
- Backend CORS allows `http://localhost:5173`
- File browser at `/app/files`: URL-based account and folder navigation, cached ancestor breadcrumbs, folders-first listing, 300ms debounced search, sorting, and Load more pagination; loading, empty, and retry states
- Drag-and-drop uploads and file picker with react-dropzone: presign, storage PUT, then completion; exact Content-Type matching and no JWT on storage requests
- Upload queue: maximum three concurrent transfers, progress and status panel, cancellation while queued/uploading, retries, dismissible results, and rejection above 5 GB; destinations remain fixed when navigating
- File actions: click a file name to open, plus Open, Download, Rename, Move, and Delete in each row menu; action controls disable during requests and successful actions invalidate file queries
- Open/download URLs are fetched only on click; Open creates its blank tab synchronously and closes it on failure; Download uses a hidden anchor
- Rename validates non-empty names up to 255 characters and displays backend field errors; Move lazily loads folders within the same account and disables the current folder as a destination
- Delete requires confirmation naming the file; successful deletion removes the row, while backend failures show a toast and retain it

## Validation and Current State

- Frontend lint and production build pass; Vite reports a bundle-size warning
- Upload queue tests: `cd frontend && node --test src/lib/uploadQueue.test.js`
- Mocked HTTP/browser checks passed for uploads, navigation, and file actions, including exact upload headers, rename field errors, lazy folder selection, failed-delete retention, and blank-tab cleanup
- Real-provider end-to-end validation remains outstanding

## Next Immediate Step

- Add frontend folder actions; only file actions are implemented so far
- Multipart uploads remain out of scope for the current implementation

## Conventions

- New serializers reject unsupported fields rather than silently ignoring them
- Log provider exceptions with `exc_info` and return a generic 400
- Frontend code is JavaScript; use the existing Axios instance, React Query, shadcn/ui, and sonner
- Send only `{name}` or `{folder}` in file PATCH requests
- Presigned storage requests must not use the authenticated API client or send JWT/custom headers; upload PUT Content-Type must exactly match the presign request
- Fetch download URLs on demand and invalidate file queries after successful actions
