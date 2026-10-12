import boto3
from botocore.config import Config

from storage_accounts.providers.base import StorageProvider


class MinIOProvider(StorageProvider):
    def __init__(self, storage_account):
        self.storage_account = storage_account
        self.client = boto3.client(
            's3',
            endpoint_url=storage_account.endpoint_url,
            aws_access_key_id=storage_account.access_key_id,
            aws_secret_access_key=storage_account.secret_access_key,
            region_name='auto',
            config=Config(signature_version='s3v4'),
        )

    def generate_presigned_upload_url(self, object_key, content_type, expires_in):
        return self.client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': self.storage_account.bucket_name,
                'Key': object_key,
                'ContentType': content_type,
            },
            ExpiresIn=expires_in,
        )

    def generate_presigned_download_url(self, object_key, expires_in):
        return self.client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': self.storage_account.bucket_name,
                'Key': object_key,
            },
            ExpiresIn=expires_in,
        )

    def head_object(self, object_key):
        result = self.client.head_object(
            Bucket=self.storage_account.bucket_name,
            Key=object_key,
        )
        return {
            'size': result['ContentLength'],
            'content_type': result.get('ContentType'),
        }

    def list_objects(self, prefix):
        return self.client.list_objects_v2(
            Bucket=self.storage_account.bucket_name,
            Prefix=prefix,
        )

    def delete_object(self, object_key):
        return self.client.delete_object(
            Bucket=self.storage_account.bucket_name,
            Key=object_key,
        )

    def get_usage(self):
        paginator = self.client.get_paginator('list_objects_v2')
        return sum(
            obj['Size']
            for page in paginator.paginate(Bucket=self.storage_account.bucket_name)
            for obj in page.get('Contents', [])
        )
