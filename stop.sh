#!/usr/bin/env bash
set -e

echo "Stopping MinIO"
sudo docker stop minio

echo "Stopping PostgreSQL"
sudo systemctl stop postgresql
