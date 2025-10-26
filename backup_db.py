import sqlite3
import shutil
import os
from datetime import datetime
from src.backend.config import Settings

def backup_db(backup_path=None):
    """Crea un backup de la base de datos."""
    if not os.path.exists(Settings.DB_PATH):
        print(f"Error: La base de datos no existe en '{Settings.DB_PATH}'")
        return

    if backup_path is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = os.path.join(Settings.DATA_DIR, "backups")
        os.makedirs(backup_dir, exist_ok=True)
        backup_path = os.path.join(backup_dir, f"spm_backup_{timestamp}.db")

    try:
        shutil.copy2(Settings.DB_PATH, backup_path)
        print(f"Backup creado exitosamente en: {backup_path}")
    except Exception as e:
        print(f"Error al crear el backup: {e}")

def restore_db(backup_path):
    """Restaura la base de datos desde un backup."""
    if not os.path.exists(backup_path):
        print(f"Error: El archivo de backup no existe en '{backup_path}'")
        return

    try:
        shutil.copy2(backup_path, Settings.DB_PATH)
        print(f"Base de datos restaurada exitosamente desde: {backup_path}")
    except Exception as e:
        print(f"Error al restaurar la base de datos: {e}")

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Script para hacer backup y restaurar la base de datos.")
    parser.add_argument("accion", choices=["backup", "restore"], help="La acción a realizar.")
    parser.add_argument("--path", help="La ruta al archivo de backup. Requerido para restaurar.")

    args = parser.parse_args()

    if args.accion == "backup":
        backup_db(args.path)
    elif args.accion == "restore":
        if not args.path:
            print("Error: La ruta al archivo de backup es requerida para la acción de restaurar.")
        else:
            restore_db(args.path)
