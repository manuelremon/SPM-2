from flask import Blueprint, jsonify
from .models import CatalogCentro, CatalogAlmacen, CatalogRol, CatalogPuesto, CatalogSector
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
import os

catalogos_bp = Blueprint('catalogos', __name__, url_prefix='/api/catalogos')

engine = create_engine(os.environ.get("DATABASE_URL"))
Session = sessionmaker(bind=engine)

@catalogos_bp.route('/centros', methods=['GET'])
def get_centros():
    session = Session()
    try:
        centros = session.query(CatalogCentro).filter_by(activo=True).all()
        return jsonify([{"codigo": c.codigo, "nombre": c.nombre} for c in centros])
    finally:
        session.close()

materiales_bp = Blueprint('materiales', __name__, url_prefix='/api/materiales')

@materiales_bp.route('', methods=['GET'])
def search_materiales():
    search_term = request.args.get('q', '')
    session = Session()
    try:
        query = session.query(Material)
        if search_term:
            query = query.filter(
                (Material.codigo.ilike(f'%{search_term}%')) |
                (Material.descripcion.ilike(f'%{search_term}%'))
            )
        materiales = query.limit(50).all()
        return jsonify([
            {
                "codigo": m.codigo,
                "descripcion": m.descripcion,
                "unidad": m.unidad,
                "precio_usd": m.precio_usd,
            } for m in materiales
        ])
    finally:
        session.close()

solicitudes_bp = Blueprint('solicitudes', __name__, url_prefix='/api/solicitudes')

@solicitudes_bp.route('', methods=['POST'])
def create_solicitud():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No se recibieron datos"}), 400

    session = Session()
    try:
        new_solicitud = Solicitud(
            id_usuario="testuser",  # Temporal, hasta que tengamos autenticación
            centro=data.get('centro'),
            sector="testsector",  # Temporal
            justificacion=data.get('justificacion', ''),
            centro_costos=data.get('centro_costos'),
            almacen_virtual=data.get('almacen_virtual'),
            criticidad=data.get('criticidad'),
            fecha_necesidad=data.get('fecha_necesidad'),
            data_json="{}",  # Temporal
            status="draft"
        )
        session.add(new_solicitud)
        session.commit()
        return jsonify({"id": new_solicitud.id}), 201
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@catalogos_bp.route('/almacenes', methods=['GET'])
def get_almacenes():
    session = Session()
    try:
        almacenes = session.query(CatalogAlmacen).filter_by(activo=True).all()
        return jsonify([{"codigo": a.codigo, "nombre": a.nombre, "centro_codigo": a.centro_codigo} for a in almacenes])
    finally:
        session.close()

@catalogos_bp.route('/roles', methods=['GET'])
def get_roles():
    session = Session()
    try:
        roles = session.query(CatalogRol).filter_by(activo=True).all()
        return jsonify([{"nombre": r.nombre} for r in roles])
    finally:
        session.close()

@catalogos_bp.route('/puestos', methods=['GET'])
def get_puestos():
    session = Session()
    try:
        puestos = session.query(CatalogPuesto).filter_by(activo=True).all()
        return jsonify([{"nombre": p.nombre} for p in puestos])
    finally:
        session.close()

@catalogos_bp.route('/sectores', methods=['GET'])
def get_sectores():
    session = Session()
    try:
        sectores = session.query(CatalogSector).filter_by(activo=True).all()
        return jsonify([{"nombre": s.nombre} for s in sectores])
    finally:
        session.close()
