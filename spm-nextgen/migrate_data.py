import os
import sqlite3
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models import Base, Usuario, Material, Solicitud, Presupuesto, Notificacion, ArchivoAdjunto
from backend.models import CatalogCentro, CatalogAlmacen, CatalogRol, CatalogPuesto, CatalogSector
from dotenv import load_dotenv

load_dotenv()

def get_legacy_db_connection(db_path):
    """Establece conexión con la base de datos SQLite antigua."""
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"No se encontró la base de datos SQLite en: {db_path}")
    return sqlite3.connect(db_path)

def get_new_db_session():
    """Establece una sesión con la nueva base de datos PostgreSQL."""
    engine = create_engine(os.environ.get("DATABASE_URL"))
    Base.metadata.create_all(engine)  # Crea las tablas si no existen
    Session = sessionmaker(bind=engine)
    return Session()

def migrate_usuarios(legacy_conn, new_session):
    print("Migrando usuarios...")
    legacy_conn.row_factory = sqlite3.Row
    cursor = legacy_conn.cursor()
    cursor.execute("SELECT * FROM usuarios")

    for row in cursor.fetchall():
        new_user = Usuario(
            id_spm=row['id_spm'],
            nombre=row['nombre'],
            apellido=row['apellido'],
            rol=row['rol'],
            contrasena=row['contrasena'],
            mail=row['mail'],
            posicion=row['posicion'],
            sector=row['sector'],
            centros=row['centros'],
            jefe=row['jefe'],
            gerente1=row['gerente1'],
            gerente2=row['gerente2'],
            telefono=row['telefono'],
            estado_registro=row['estado_registro'],
            id_ypf=row['id_ypf']
        )
        new_session.add(new_user)

    new_session.commit()
    print("Usuarios migrados.")

def migrate_materiales(legacy_conn, new_session):
    print("Migrando materiales...")
    legacy_conn.row_factory = sqlite3.Row
    cursor = legacy_conn.cursor()
    cursor.execute("SELECT * FROM materiales")

    for row in cursor.fetchall():
        new_material = Material(
            codigo=row['codigo'],
            descripcion=row['descripcion'],
            descripcion_larga=row['descripcion_larga'],
            centro=row['centro'],
            sector=row['sector'],
            unidad=row['unidad'],
            precio_usd=row['precio_usd']
        )
        new_session.add(new_material)

    new_session.commit()
    print("Materiales migrados.")

def migrate_solicitudes(legacy_conn, new_session):
    print("Migrando solicitudes...")
    legacy_conn.row_factory = sqlite3.Row
    cursor = legacy_conn.cursor()
    cursor.execute("SELECT * FROM solicitudes")

    for row in cursor.fetchall():
        new_solicitud = Solicitud(
            id=row['id'],
            id_usuario=row['id_usuario'],
            centro=row['centro'],
            sector=row['sector'],
            justificacion=row['justificacion'],
            centro_costos=row['centro_costos'],
            almacen_virtual=row['almacen_virtual'],
            criticidad=row['criticidad'],
            fecha_necesidad=row['fecha_necesidad'],
            data_json=row['data_json'],
            status=row['status'],
            aprobador_id=row['aprobador_id'],
            planner_id=row['planner_id'],
            total_monto=row['total_monto'],
        )
        new_session.add(new_solicitud)

    new_session.commit()
    print("Solicitudes migradas.")

def migrate_presupuestos(legacy_conn, new_session):
    print("Migrando presupuestos...")
    legacy_conn.row_factory = sqlite3.Row
    cursor = legacy_conn.cursor()
    cursor.execute("SELECT * FROM presupuestos")

    for row in cursor.fetchall():
        new_presupuesto = Presupuesto(
            centro=row['centro'],
            sector=row['sector'],
            monto_usd=row['monto_usd'],
            saldo_usd=row['saldo_usd']
        )
        new_session.add(new_presupuesto)

    new_session.commit()
    print("Presupuestos migrados.")

def migrate_notificaciones(legacy_conn, new_session):
    print("Migrando notificaciones...")
    legacy_conn.row_factory = sqlite3.Row
    cursor = legacy_conn.cursor()
    cursor.execute("SELECT * FROM notificaciones")

    for row in cursor.fetchall():
        new_notificacion = Notificacion(
            id=row['id'],
            destinatario_id=row['destinatario_id'],
            solicitud_id=row['solicitud_id'],
            mensaje=row['mensaje'],
            leido=bool(row['leido'])
        )
        new_session.add(new_notificacion)

    new_session.commit()
    print("Notificaciones migradas.")

def migrate_archivos_adjuntos(legacy_conn, new_session):
    print("Migrando archivos adjuntos...")
    legacy_conn.row_factory = sqlite3.Row
    cursor = legacy_conn.cursor()
    cursor.execute("SELECT * FROM archivos_adjuntos")

    for row in cursor.fetchall():
        new_archivo = ArchivoAdjunto(
            id=row['id'],
            solicitud_id=row['solicitud_id'],
            nombre_archivo=row['nombre_archivo'],
            nombre_original=row['nombre_original'],
            tipo_mime=row['tipo_mime'],
            tamano_bytes=row['tamano_bytes'],
            ruta_archivo=row['ruta_archivo'],
            usuario_id=row['usuario_id']
        )
        new_session.add(new_archivo)

    new_session.commit()
    print("Archivos adjuntos migrados.")

def migrate_catalogos(legacy_conn, new_session):
    print("Migrando catálogos...")
    legacy_conn.row_factory = sqlite3.Row
    cursor = legacy_conn.cursor()

    # Centros
    cursor.execute("SELECT * FROM catalog_centros")
    for row in cursor.fetchall():
        new_session.add(CatalogCentro(codigo=row['codigo'], nombre=row['nombre'], descripcion=row['descripcion'], activo=bool(row['activo'])))

    # Almacenes
    cursor.execute("SELECT * FROM catalog_almacenes")
    for row in cursor.fetchall():
        new_session.add(CatalogAlmacen(codigo=row['codigo'], nombre=row['nombre'], centro_codigo=row['centro_codigo'], descripcion=row['descripcion'], activo=bool(row['activo'])))

    # Roles
    cursor.execute("SELECT * FROM catalog_roles")
    for row in cursor.fetchall():
        new_session.add(CatalogRol(nombre=row['nombre'], descripcion=row['descripcion'], activo=bool(row['activo'])))

    # Puestos
    cursor.execute("SELECT * FROM catalog_puestos")
    for row in cursor.fetchall():
        new_session.add(CatalogPuesto(nombre=row['nombre'], descripcion=row['descripcion'], activo=bool(row['activo'])))

    # Sectores
    cursor.execute("SELECT * FROM catalog_sectores")
    for row in cursor.fetchall():
        new_session.add(CatalogSector(nombre=row['nombre'], descripcion=row['descripcion'], activo=bool(row['activo'])))

    new_session.commit()
    print("Catálogos migrados.")

def main(legacy_db_path):
    """Función principal para orquestar la migración."""
    try:
        legacy_conn = get_legacy_db_connection(legacy_db_path)
        new_session = get_new_db_session()

        migrate_usuarios(legacy_conn, new_session)
        migrate_materiales(legacy_conn, new_session)
        migrate_solicitudes(legacy_conn, new_session)
        migrate_presupuestos(legacy_conn, new_session)
        migrate_notificaciones(legacy_conn, new_session)
        migrate_archivos_adjuntos(legacy_conn, new_session)
        migrate_catalogos(legacy_conn, new_session)

        new_session.commit()
        print("\\n¡Migración completada exitosamente!")

    except Exception as e:
        print(f"\\nError durante la migración: {e}")
    finally:
        if 'legacy_conn' in locals():
            legacy_conn.close()
        if 'new_session' in locals():
            new_session.close()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Script para migrar datos de SQLite a PostgreSQL.")
    parser.add_argument("legacy_db_path", help="Ruta al archivo de la base de datos SQLite antigua (spm.db).")
    args = parser.parse_args()
    main(args.legacy_db_path)
