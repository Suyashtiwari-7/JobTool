"""AES-256 Encryption & Decryption utilities using Fernet."""

import base64
import hashlib
import logging
from cryptography.fernet import Fernet
from app.config import settings

logger = logging.getLogger(__name__)

# Derive a 32-byte url-safe base64 key from SECRET_KEY
def _get_fernet_key() -> bytes:
    key_material = settings.secret_key.encode('utf-8')
    digest = hashlib.sha256(key_material).digest()
    return base64.urlsafe_b64encode(digest)


_fernet = Fernet(_get_fernet_key())


def encrypt_secret(plain_text: str) -> str:
    """Encrypt a secret string (e.g. email app password) to ciphertext."""
    if not plain_text:
        return ""
    return _fernet.encrypt(plain_text.encode('utf-8')).decode('utf-8')


def decrypt_secret(cipher_text: str) -> str:
    """Decrypt a ciphertext back to plain text."""
    if not cipher_text:
        return ""
    try:
        return _fernet.decrypt(cipher_text.encode('utf-8')).decode('utf-8')
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        return ""
