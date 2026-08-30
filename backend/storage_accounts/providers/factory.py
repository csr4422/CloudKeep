from storage_accounts.providers.r2 import R2Provider


def get_provider(storage_account):
    if storage_account.provider == 'r2':
        return R2Provider(storage_account)

    raise NotImplementedError(
        f'No storage provider implementation for {storage_account.provider!r}.'
    )
