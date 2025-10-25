from __future__ import annotations
import sqlite3
from flask import Blueprint, request, current_app, jsonify
from typing import Any, Dict, Optional, Tuple
from ..db import get_connection
from ..security import verify_access_token
from .admin import CATALOG_RESOURCES

bp = Blueprint("catalogos", __name__, url_prefix="/api/catalogos")
almacenes_bp = Blueprint("almacenes", __name__, url_prefix="/api/almacenes")
COOKIE_NAME = "spm_token"


def _require_auth() -> Optional[str]:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            token = header.split(" ", 1)[1].strip()
    if not token:
        return None
    try:
        payload = verify_access_token(token)
    except Exception:
        return None
    return payload.get("sub")


def _row_to_item(meta: Dict[str, Any], row: Dict[str, Any]) -> Dict[str, Any]:
    item = dict(row)
    for boolean_field in meta.get("bools", ()):  # type: ignore[arg-type]
        if boolean_field in item:
            item[boolean_field] = bool(item[boolean_field])
    return item


def _table_exists(con: sqlite3.Connection, name: str) -> bool:
    try:
        row = con.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1",
            (name,),
        ).fetchone()
    except sqlite3.Error:
        raise
    return bool(row)


def _fetch_catalog(
    con: sqlite3.Connection,
    resource: str,
    *,
    include_inactive: bool = False,
) -> Tuple[Optional[list], Optional[Dict[str, Any]]]:
    meta = CATALOG_RESOURCES.get(resource)
    if not meta:
        return None, None
    table = meta["table"]
    if not _table_exists(con, table):
        current_app.logger.warning("Tabla de catalogo faltante: %s (resource=%s)", table, resource)
        return [], {"resource": resource, "message": f"Tabla {table} ausente"}
    order_by = meta.get("order_by") or "id"
    try:
        rows = con.execute(f"SELECT * FROM {table} ORDER BY {order_by}").fetchall()
    except sqlite3.Error:
        current_app.logger.exception("Error consultando catalogo %s", resource)
        raise
    items = []
    for row in rows:
        item = _row_to_item(meta, row)
        if not include_inactive and "activo" in meta.get("fields", ()):  # type: ignore[arg-type]
            if not item.get("activo", False):
                continue
        items.append(item)
    return items, None


@bp.get("")
def obtener_catalogos():
    uid = _require_auth()
    if not uid:
        return {"ok": False, "error": {"code": "NOAUTH", "message": "No autenticado"}}, 401
    include_inactive_raw = request.args.get("include_inactive", "0").lower()
    include_inactive = include_inactive_raw in {"1", "true", "si", "s\u00ed"}
    data: Dict[str, Any] = {}
    warnings = []
    try:
        with get_connection() as con:
            for resource in CATALOG_RESOURCES:
                items, warning = _fetch_catalog(con, resource, include_inactive=include_inactive)
                if warning:
                    warnings.append(warning)
                data[resource] = items or []
            # Agregar catálogos adicionales proporcionales a los campos legacy
            centros = con.execute(
                "SELECT DISTINCT centro FROM solicitudes WHERE centro IS NOT NULL AND centro <> ''"
            ).fetchall()
            legacy_centros = [
                {"codigo": row["centro"], "nombre": row["centro"], "legacy": True}
                for row in centros
                if row.get("centro")
            ]
            if legacy_centros:
                existing_centros = {item["codigo"] for item in data.get("centros", [])}
                merged = data.get("centros", []) + [
                    item for item in legacy_centros if item["codigo"] not in existing_centros
                ]
                data["centros"] = merged
    except sqlite3.Error:
        return {"ok": False, "error": {"code": "DB_ERROR", "message": "DB error"}}, 500
    response: Dict[str, Any] = {"ok": True, "data": data}
    if warnings:
        response["warnings"] = warnings
    return response


@bp.get("/<resource>")
def obtener_catalogo(resource: str):
    uid = _require_auth()
    if not uid:
        return {"ok": False, "error": {"code": "NOAUTH", "message": "No autenticado"}}, 401
    include_inactive_raw = request.args.get("include_inactive", "0").lower()
    include_inactive = include_inactive_raw in {"1", "true", "si", "s\u00ed"}
    try:
        with get_connection() as con:
            items, warning = _fetch_catalog(con, resource, include_inactive=include_inactive)
            if items is None:
                return {"ok": False, "error": {"code": "UNKNOWN", "message": "Recurso desconocido"}}, 404
            response: Dict[str, Any] = {"ok": True, "items": items}
            if warning:
                response["warnings"] = [warning]
            return response
    except sqlite3.Error:
        current_app.logger.exception("Error consultando catalogo %s", resource)
        return {"ok": False, "error": {"code": "DB_ERROR", "message": "DB error"}}, 500


@almacenes_bp.get("")
def obtener_almacenes():
    # uid = _require_auth()
    # if not uid:
    #     return {"ok": False, "error": {"code": "NOAUTH", "message": "No autenticado"}}, 401
    centro = (request.args.get("centro") or "").strip() or None
    params = (centro, centro, centro)
    with get_connection() as con:
        rows = con.execute(
            """
            SELECT id, codigo, nombre, centro_codigo, activo
            FROM catalog_almacenes
            WHERE activo = 1
              AND (? IS NULL OR centro_codigo IS NULL OR centro_codigo = ?)
            ORDER BY
              CASE WHEN centro_codigo = ? THEN 0 ELSE 1 END,
              nombre COLLATE NOCASE
            """,
            params,
        ).fetchall()
    current_app.logger.debug("Almacenes activos devueltos: %d (centro=%s)", len(rows), centro or "todos")
    return jsonify(rows)
