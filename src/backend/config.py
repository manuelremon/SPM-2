from __future__ import annotations
import os
from typing import List
from dotenv import load_dotenv   # ✅

load_dotenv()  # ✅ carga variables del .env antes de definir Settings

def _split_csv(env: str, default: str) -> List[str]:
    raw = os.getenv(env, default)
    return [x.strip() for x in raw.split(",") if x.strip()]

class Settings:
    BASE_DIR = os.path.dirname(__file__)
    DATA_DIR = os.path.join(BASE_DIR, "data")
    LOGS_DIR = os.path.join(BASE_DIR, "logs")
    UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
    DB_PATH = os.getenv("SPM_DB_PATH", os.path.join(DATA_DIR, "spm.db"))
    LOG_PATH = os.getenv("SPM_LOG_PATH", os.path.join(LOGS_DIR, "app.log"))
    SECRET_KEY = os.getenv("SPM_SECRET_KEY", "CHANGE-ME-IN-PROD")
    ACCESS_TOKEN_TTL = int(os.getenv("SPM_ACCESS_TTL", "3600"))
    CORS_ORIGINS = _split_csv("SPM_CORS_ORIGINS", "http://localhost:8080")
    DEBUG = os.getenv("SPM_DEBUG", "0") == "1"
    ENV = os.getenv("SPM_ENV", "production")
    OLLAMA_ENDPOINT = os.getenv("SPM_OLLAMA_URL", "http://127.0.0.1:11434")
    OLLAMA_MODEL = os.getenv("SPM_OLLAMA_MODEL", "mistral")
    
    # Configuración de IA
    AI_ENABLE: bool = bool(int(os.getenv("AI_ENABLE", "1")))
    AI_EMBED_MODEL: str = os.getenv("AI_EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")  # si se usa local
    AI_PRICE_SMOOTHING: float = float(os.getenv("AI_PRICE_SMOOTHING", "0.5"))
    AI_MAX_SUGGESTIONS: int = int(os.getenv("AI_MAX_SUGGESTIONS", "5"))
    
    # Configuración de archivos adjuntos
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB máximo por archivo
    ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'xls', 'xlsx', 'csv'}

    STATUS_TIMEOUT_MS = int(os.getenv("STATUS_TIMEOUT_MS", "2000"))
    STATUS_CACHE_SECS = int(os.getenv("STATUS_CACHE_SECS", "30"))
    STATUS_CHECK_GITHUB = os.getenv("STATUS_CHECK_GITHUB", "1").strip().lower() not in {"0", "false", "no"}
    STATUS_CHECK_RENDER = os.getenv("STATUS_CHECK_RENDER", "1").strip().lower() not in {"0", "false", "no"}
    STATUS_CHECK_OLLAMA = os.getenv("STATUS_CHECK_OLLAMA", "1").strip().lower() not in {"0", "false", "no"}

    @classmethod
    def ensure_dirs(cls) -> None:
        os.makedirs(os.path.dirname(cls.DB_PATH), exist_ok=True)
        os.makedirs(os.path.dirname(cls.LOG_PATH), exist_ok=True)
        os.makedirs(cls.UPLOADS_DIR, exist_ok=True)

