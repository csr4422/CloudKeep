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
- Backend CORS allows `http://localhost:5173`

## Next Immediate Step

Continue the React frontend in this order:

1. Storage account connection form with test connection
2. File browser with folder navigation, breadcrumbs, list, and search
3. Drag-and-drop upload using the three-step presigned flow; PUT must send the exact signed `Content-Type`
4. File actions: rename, move, delete, and download

## Conventions

- New serializers reject unsupported fields rather than silently ignoring them
- Log provider exceptions with `exc_info` and return a generic 400
