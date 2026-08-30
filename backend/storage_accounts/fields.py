from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.db import models


class EncryptedTextField(models.TextField):
    """A text field encrypted with the application's Fernet key at rest."""

    @property
    def fernet(self):
        return Fernet(settings.FIELD_ENCRYPTION_KEY.encode())

    def from_db_value(self, value, expression, connection):
        if value is None:
            return value

        try:
            return self.fernet.decrypt(value.encode()).decode()
        except InvalidToken:
            return value

    def to_python(self, value):
        if value is None or not isinstance(value, str):
            return value

        try:
            return self.fernet.decrypt(value.encode()).decode()
        except InvalidToken:
            return value

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if value is None:
            return value
        return self.fernet.encrypt(value.encode()).decode()
