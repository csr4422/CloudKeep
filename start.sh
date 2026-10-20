#!/usr/bin/env bash
set -e

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting PostgreSQL"
sudo systemctl start postgresql

echo "Waiting for PostgreSQL"
until pg_isready -h localhost -p 5432 >/dev/null 2>&1; do
    sleep 1
done

echo "Starting MinIO"
sudo docker start minio

echo "Waiting for MinIO"
until curl --silent --show-error --output /dev/null --max-time 2 http://localhost:9000 2>/dev/null; do
    sleep 1
done

echo "Starting Django development server"
cd "$REPO_ROOT/backend"
source keeper/bin/activate
python manage.py runserver
