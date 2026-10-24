import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createStorageAccountSchema,
  updateStorageAccountSchema,
} from '@/lib/storageAccountSchema'

const emptyValues = {
  name: '',
  provider: 'r2',
  bucket_name: '',
  access_key_id: '',
  secret_access_key: '',
  account_id: '',
  endpoint_url: '',
}

const editableFields = ['name', 'provider', 'bucket_name', 'access_key_id', 'secret_access_key', 'account_id', 'endpoint_url']

function getApiFieldErrors(error) {
  const data = error.response?.data || {}
  const fields = {}
  const otherMessages = []

  Object.entries(data).forEach(([key, value]) => {
    const message = Array.isArray(value) ? value.join(' ') : String(value)
    if (editableFields.includes(key)) fields[key] = message
    else otherMessages.push(message)
  })

  return {
    fields,
    message: otherMessages.join(' ') || (error.response ? '' : 'Could not reach the server. Check your connection.'),
  }
}

export function StorageAccountDialog({
  open,
  onOpenChange,
  account,
  onSave,
  isSaving,
}) {
  const isEditing = Boolean(account)
  const [formMessage, setFormMessage] = useState('')
  const form = useForm({
    resolver: zodResolver(isEditing ? updateStorageAccountSchema : createStorageAccountSchema),
    shouldUnregister: true,
    defaultValues: emptyValues,
  })
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setError,
  } = form
  const provider = useWatch({ control, name: 'provider' })

  useEffect(() => {
    if (!open) {
      reset(emptyValues)
      return
    }

    if (account) {
      reset({ name: account.name, bucket_name: account.bucket_name })
    } else {
      reset(emptyValues)
    }
  }, [open, account, reset])

  function handleOpenChange(nextOpen) {
    if (!nextOpen) {
      reset(emptyValues)
      setFormMessage('')
    }
    onOpenChange(nextOpen)
  }

  async function submit(values) {
    setFormMessage('')
    try {
      await onSave(values, account)
      reset(emptyValues)
    } catch (error) {
      const apiErrors = getApiFieldErrors(error)
      Object.entries(apiErrors.fields).forEach(([field, message]) => {
        setError(field, { type: 'server', message })
      })
      if (apiErrors.message) setFormMessage(apiErrors.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90svh] max-w-xl overflow-y-auto rounded-2xl p-6 sm:p-7">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {isEditing ? 'Edit storage account' : 'Connect a storage account'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the display name or bucket for this connection.'
              : 'Connect a bucket from your own S3-compatible storage.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="mt-2 space-y-4">
          <FormField
            id="storage-name"
            label="Account name"
            placeholder="Personal files"
            autoComplete="off"
            error={errors.name?.message}
            {...register('name')}
          />

          {isEditing ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-800">Provider</p>
              <div className="flex h-11 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-600">
                {account.provider === 'r2' ? 'Cloudflare R2' : 'MinIO'}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="storage-provider" className="text-sm font-medium text-zinc-800">
                Provider
              </label>
              <Controller
                control={control}
                name="provider"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="storage-provider"
                      ref={field.ref}
                      onBlur={field.onBlur}
                      aria-invalid={Boolean(errors.provider)}
                      className="h-11 w-full rounded-xl border-zinc-200 bg-white px-3 shadow-sm"
                    >
                      <SelectValue placeholder="Choose a provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="r2">Cloudflare R2</SelectItem>
                      <SelectItem value="minio">MinIO</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.provider?.message && (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {errors.provider.message}
                </p>
              )}
            </div>
          )}

          <FormField
            id="storage-bucket"
            label="Bucket name"
            placeholder="my-files"
            autoComplete="off"
            error={errors.bucket_name?.message}
            {...register('bucket_name')}
          />

          {!isEditing && (
            <>
              {provider === 'r2' ? (
                <FormField
                  id="storage-account-id"
                  label="Cloudflare account ID"
                  placeholder="Account ID"
                  autoComplete="off"
                  error={errors.account_id?.message}
                  {...register('account_id')}
                />
              ) : (
                <FormField
                  id="storage-endpoint-url"
                  label="Endpoint URL"
                  type="url"
                  placeholder="https://minio.example.com"
                  autoComplete="url"
                  error={errors.endpoint_url?.message}
                  {...register('endpoint_url')}
                />
              )}
              <FormField
                id="storage-access-key"
                label="Access key ID"
                placeholder="Access key ID"
                autoComplete="off"
                error={errors.access_key_id?.message}
                {...register('access_key_id')}
              />
              <FormField
                id="storage-secret-key"
                label="Secret access key"
                type="password"
                placeholder="Secret access key"
                autoComplete="new-password"
                error={errors.secret_access_key?.message}
                {...register('secret_access_key')}
              />
              <p className="text-xs leading-5 text-zinc-500">
                Credentials are encrypted when saved and cannot be viewed later.
              </p>
            </>
          )}

          {formMessage && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
              {formMessage}
            </p>
          )}

          <DialogFooter className="mt-6 flex-row justify-end gap-2 border-0 bg-transparent p-0">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => handleOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" className="h-10 rounded-xl" disabled={isSaving}>
              {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Connect account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
