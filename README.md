# CloudKeep

Self-hosted, Dropbox-inspired file manager for your own Cloudflare R2 storage. Django REST Framework + React, BYOS architecture.

## What is this?

CloudKeep is an open-source, Bring Your Own Storage (BYOS) cloud file manager. It doesn't host your files — you connect your own Cloudflare R2 bucket (later, any S3-compatible provider: MinIO, Backblaze B2, AWS S3), and CloudKeep gives you a web interface to upload, organize, search, and share those files.

Files never touch CloudKeep's servers. Uploads/downloads go directly to/from your bucket via presigned URLs. You retain full ownership of your data.

## Why

Object storage like R2 is cheap and provider-agnostic. CloudKeep gives it a usable interface without vendor lock-in.

Also a learning project: Django + DRF backend, React frontend, PostgreSQL, S3-compatible API.

## Planned Features

- Connect your own Cloudflare R2 account (encrypted credential storage)
- File and folder management, drag-and-drop uploads
- File previews and downloads via presigned URLs
- Storage usage dashboard
- Search and filtering
- Shareable links (expiring, revocable)
- File version history
- Docker support for self-hosting

## Tech Stack

- Backend: Django, Django REST Framework, PostgreSQL
- Frontend: React (Vite, JavaScript)
- Storage: Cloudflare R2 (S3-compatible API), pluggable provider architecture
- Auth: JWT (djangorestframework-simplejwt)

## Architecture Notes

- Presigned URLs only — Django never proxies file bytes
- R2 credentials encrypted at rest, never sent back to frontend after setup
- Storage access behind an abstract provider interface for future MinIO/S3/B2 support

## Status

Early development. See PROGRESS.md for what's built and what's next.

## Local Development Setup

\`\`\`bash
# Backend
cd backend
python -m venv keeper
source keeper/bin/activate
pip install -r requirements.txt
# create backend/.env — see .env.example
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev
\`\`\`

## License

TBD