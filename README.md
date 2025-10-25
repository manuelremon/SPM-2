# SPM · Solicitudes (CSV)

Aplicación mínima para cargar y listar solicitudes de materiales basada en Flask (API + estáticos) y JS vanilla.

## Requisitos

- Python 3.12+
- (Opcional) Docker / Docker Compose v2

## Ejecución local (todo-en-uno)

```bash
# 1) Crear entorno e instalar dependencias
python -m venv .venv
. .venv/bin/activate  # En Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 2) Configurar la base de datos de desarrollo
python setup_dev_db.py

# 3) Levantar el backend
python wsgi.py
```

Abrí <http://127.0.0.1:5001/> en el navegador. Podrás iniciar sesión con las credenciales por defecto:

- **Usuario:** `1`
- **Contraseña:** `a1`

> **Nota**: El script `setup_dev_db.py` crea la base de datos `src/backend/data/spm.db` con el esquema necesario y un usuario administrador. Este archivo no debe ser versionado. Si necesitas regenerar la base de datos desde cero, simplemente vuelve a ejecutar el script.

## Docker

```bash
docker build -t spm-backend -f infra/docker/backend.Dockerfile .
docker run --rm -p 5000:5000 -e SPM_SECRET_KEY="cambia-esto" spm-backend
```

Para levantar backend + Nginx en modo desarrollo:

```bash
docker compose -f infra/docker/docker-compose.yml up --build
```

O bien usar el script cross-platform:

```bash
# Linux / macOS
./scripts/init.sh

# Windows (PowerShell / CMD)
scripts\\init.bat
```

## Endpoints rápidos (para probar)

```bash
curl -i http://localhost:5000/api/health

# Login
curl -i -X POST http://localhost:5000/api/login \
  -H 'Content-Type: application/json' \
  -d '{"id":"usuario1","password":"changeme123"}'

# Búsqueda de materiales
curl -i 'http://localhost:5000/api/materiales?q=valvula&limit=5'
```

## Estructura

- `src/backend/`: API Flask, base SQLite y cargas desde CSV.
- `src/backend/data/Centros.csv`, `Almacenes.csv`, `Roles.csv`, `Puestos.csv`, `Sectores.csv`: catálogos editables sincronizados con Admin > Configuración (corre `python -m backend.init_db` si los modificás manualmente).
- `src/frontend/`: HTML/CSS/JS estático que se sirve desde Flask o Nginx.
- `src/agent/`: prototipos FastAPI auxiliares (no requeridos por la app principal, instalar con `pip install -r requirements/agent.txt`).
- `infra/`: definición de Docker, Nginx y despliegues (Render).
- `requirements/`: archivos de dependencias segmentados.
- `scripts/`: utilidades para levantar o detener el stack.
- `docs/`: material auxiliar y vistas previas.

---

Hecho con cariño y obsesión por los bordes extraños del mundo del software. :)
