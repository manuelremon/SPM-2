from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
import os
from dotenv import load_dotenv

load_dotenv()

Base = declarative_base()

class Usuario(Base):
    __tablename__ = 'usuarios'
    id_spm = Column(String, primary_key=True)
    nombre = Column(String, nullable=False)
    apellido = Column(String, nullable=False)
    rol = Column(String, nullable=False)
    contrasena = Column(String, nullable=False)
    mail = Column(String)
    posicion = Column(String)
    sector = Column(String)
    centros = Column(String)
    jefe = Column(String)
    gerente1 = Column(String)
    gerente2 = Column(String)
    telefono = Column(String)
    estado_registro = Column(String)
    id_ypf = Column(String)

class Material(Base):
    __tablename__ = 'materiales'
    codigo = Column(String, primary_key=True)
    descripcion = Column(String, nullable=False)
    descripcion_larga = Column(Text)
    centro = Column(String)
    sector = Column(String)
    unidad = Column(String)
    precio_usd = Column(Float, default=0)

class Solicitud(Base):
    __tablename__ = 'solicitudes'
    id = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario = Column(String, ForeignKey('usuarios.id_spm'), nullable=False)
    centro = Column(String, nullable=False)
    sector = Column(String, nullable=False)
    justificacion = Column(Text, nullable=False)
    centro_costos = Column(String)
    almacen_virtual = Column(String)
    criticidad = Column(String, nullable=False, default='Normal')
    fecha_necesidad = Column(String)
    data_json = Column(Text, nullable=False)
    status = Column(String, nullable=False, default='draft')
    aprobador_id = Column(String)
    planner_id = Column(String)
    total_monto = Column(Float, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    usuario = relationship("Usuario")

class Presupuesto(Base):
    __tablename__ = 'presupuestos'
    centro = Column(String, primary_key=True)
    sector = Column(String, primary_key=True)
    monto_usd = Column(Float, default=0)
    saldo_usd = Column(Float, default=0)

class Notificacion(Base):
    __tablename__ = 'notificaciones'
    id = Column(Integer, primary_key=True, autoincrement=True)
    destinatario_id = Column(String, nullable=False)
    solicitud_id = Column(Integer, ForeignKey('solicitudes.id'))
    mensaje = Column(Text, nullable=False)
    leido = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ArchivoAdjunto(Base):
    __tablename__ = 'archivos_adjuntos'
    id = Column(Integer, primary_key=True, autoincrement=True)
    solicitud_id = Column(Integer, ForeignKey('solicitudes.id'), nullable=False)
    nombre_archivo = Column(String, nullable=False)
    nombre_original = Column(String, nullable=False)
    tipo_mime = Column(String)
    tamano_bytes = Column(Integer)
    ruta_archivo = Column(String, nullable=False)
    usuario_id = Column(String, ForeignKey('usuarios.id_spm'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# --- Tablas de Catálogo ---

class CatalogCentro(Base):
    __tablename__ = 'catalog_centros'
    id = Column(Integer, primary_key=True, autoincrement=True)
    codigo = Column(String, unique=True, nullable=False)
    nombre = Column(String)
    descripcion = Column(Text)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class CatalogAlmacen(Base):
    __tablename__ = 'catalog_almacenes'
    id = Column(Integer, primary_key=True, autoincrement=True)
    codigo = Column(String, unique=True, nullable=False)
    nombre = Column(String)
    centro_codigo = Column(String)
    descripcion = Column(Text)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class CatalogRol(Base):
    __tablename__ = 'catalog_roles'
    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String, unique=True, nullable=False)
    descripcion = Column(Text)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class CatalogPuesto(Base):
    __tablename__ = 'catalog_puestos'
    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String, unique=True, nullable=False)
    descripcion = Column(Text)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class CatalogSector(Base):
    __tablename__ = 'catalog_sectores'
    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String, unique=True, nullable=False)
    descripcion = Column(Text)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


if __name__ == '__main__':
    engine = create_engine(os.environ.get("DATABASE_URL"))
    Base.metadata.create_all(engine)
    print("Tablas creadas en la base de datos.")
