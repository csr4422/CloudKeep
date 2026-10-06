# CloudKeep

BYOS file manager for S3-compatible object storage.

CloudKeep lets users connect their own object storage, then manage files and folders through a web app. Uploads and downloads use presigned URLs so file bytes move directly between the client and storage provider.

## Tech Stack

- Django
- Django REST Framework
- PostgreSQL
- React
- Vite
- JWT
- boto3
- Cloudflare R2
- MinIO

## Setup

```bash
cd backend
python -m venv keeper
source keeper/bin/activate
pip install -r requirements.txt
python manage.py migra
python manage.py runserver
```

```bash
cd frontend
npm install
npm run dev
```

## Status

See [AGENTS.md](AGENTS.md).
