from __future__ import annotations
import base64
import binascii
import os
import hmac
import time
from hashlib import pbkdf2_hmac
from typing import Dict, Any, Optional, Tuple

from flask import Request
import jwt
from .config import Settings
from .db import get_connection

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

def verify_refresh_token(token: str) -> Dict[str, Any]:
    data = jwt.decode(token, Settings.SECRET_KEY, algorithms=["HS256"])
    if data.get("typ") != "refresh":
        raise jwt.InvalidTokenError("Invalid token type")
    return data


def extract_token_from_request(req: Request, *, cookie_name: str = "spm_token") -> Optional[str]:
    """Return the JWT string carried by the incoming request, if any."""
    token = None
    try:
        token = req.cookies.get(cookie_name)
    except Exception:
        token = None
    if not token:
        header = req.headers.get("Authorization", "")
        if isinstance(header, str) and header.strip().lower().startswith("bearer "):
            token = header.split(" ", 1)[1].strip()
    return token or None


def get_request_token_payload(req: Request, *, cookie_name: str = "spm_token") -> Optional[Dict[str, Any]]:
    """Decode the JWT carried by the request and return its payload, if valid."""
    token = extract_token_from_request(req, cookie_name=cookie_name)
    if not token:
        return None
    try:
        return verify_access_token(token)
    except Exception:
        return None


def get_request_user(req: Request, *, cookie_name: str = "spm_token") -> Optional[Dict[str, Any]]:
    """Resolve the authenticated user (as stored in the DB) for the given request."""
    payload = get_request_token_payload(req, cookie_name=cookie_name)
    if not payload:
        return None
    uid = payload.get("sub")
    if not uid:
        return None
    with get_connection() as con:
        row = con.execute(
            """
            SELECT id_spm, nombre, apellido, rol, mail, telefono, posicion,
                   sector, jefe, gerente1, gerente2, estado_registro, id_ypf
              FROM usuarios
             WHERE lower(id_spm)=?
            """,
            (str(uid).lower(),),
        ).fetchone()
    if not row:
        return None
    user = dict(row)
    user["id_spm"] = user.get("id_spm") or str(uid)
    user["uid"] = user["id_spm"]
    user["token_payload"] = payload
    return user


