import { z } from 'zod'

const sharedFields = {
  name: z.string().trim().min(1, 'Enter an account name.').max(100),
  bucket_name: z.string().trim().min(1, 'Enter a bucket name.').max(255),
  access_key_id: z.string().min(1, 'Enter an access key ID.'),
  secret_access_key: z.string().min(1, 'Enter a secret access key.'),
}

export const createStorageAccountSchema = z.discriminatedUnion('provider', [
  z.object({
    ...sharedFields,
    provider: z.literal('r2'),
    account_id: z.string().trim().min(1, 'Enter your Cloudflare account ID.'),
  }),
  z.object({
    ...sharedFields,
    provider: z.literal('minio'),
    endpoint_url: z.string().trim().url('Enter a valid endpoint URL.'),
  }),
])

export const updateStorageAccountSchema = z.object({
  name: z.string().trim().min(1, 'Enter an account name.').max(100),
  bucket_name: z.string().trim().min(1, 'Enter a bucket name.').max(255),
})
