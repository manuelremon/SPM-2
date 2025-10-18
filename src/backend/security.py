from __future__ import annotations
import base64
import binascii
import os
import hmac
import time
from hashlib import pbkdf2_hmac
from typing import Dict, Any, Tuple
import jwt
from .config import Settings

_ITER = 390_000
_SALT = 16

def hash_password(pw: str) -> str:
    pw = (pw or "").strip()
    salt = os.urandom(_SALT)
    dig = pbkdf2_hmac("sha256", pw.encode("utf-8"), salt, _ITER)
    return base64.b64encode(salt + dig).decode("ascii")

def verify_password(stored: str, candidate: str) -> Tuple[bool, bool]:
    """Return tuple(valid, needs_rehash).

    When stored is legacy plain-text and matches, needs_rehash=True.
    """
    stored = (stored or "").strip()
    candidate = (candidate or "").strip()
    if not stored or not candidate:
        return False, False
    try:
        raw = base64.b64decode(stored.encode("ascii"), validate=True)
        salt, dig = raw[:_SALT], raw[_SALT:]
        cand = pbkdf2_hmac("sha256", candidate.encode("utf-8"), salt, _ITER)
        return hmac.compare_digest(dig, cand), False
    except (binascii.Error, ValueError):
        match = stored == candidate
        return match, match

def create_access_token(sub: str) -> str:
    now = int(time.time())
    payload = {"sub": sub, "iat": now, "exp": now + Settings.ACCESS_TOKEN_TTL, "iss": "spm", "typ": "access"}
    return jwt.encode(payload, Settings.SECRET_KEY, algorithm="HS256")

def create_refresh_token(sub: str) -> str:
    now = int(time.time())
    ttl = getattr(Settings, "REFRESH_TOKEN_TTL", Settings.ACCESS_TOKEN_TTL * 24)
    payload = {"sub": sub, "iat": now, "exp": now + ttl, "iss": "spm", "typ": "refresh"}
    return jwt.encode(payload, Settings.SECRET_KEY, algorithm="HS256")

def verify_access_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, Settings.SECRET_KEY, algorithms=["HS256"])

