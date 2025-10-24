from __future__ import annotations  # ← debe ir primero, sin nada antes

# import logging
# logging.basicConfig(level=logging.DEBUG)

# Standard library
# from logging.handlers import RotatingFileHandler
import os

# Third-party
from flask import Flask, current_app, g, jsonify, request
# from flask_cors import CORS  # type: ignore[import]

# Local package
from .config import Settings
# from .db import health_ok
# from .routes.admin import bp as admin_bp
# from .routes.abastecimiento import bp as abastecimiento_bp
# from .routes.archivos import bp as archivos_bp
# from .routes.auth import bp as auth_bp
from .routes.catalogos import bp as catalogos_bp, almacenes_bp
# from .routes.usuarios import bp as usuarios_bp, bp_me as usuarios_me_bp
# from .routes.materiales import bp as mat_bp
# from .routes.notificaciones import bp as notif_bp
# from .routes.planificador import bp as planner_bp
# from .routes.presupuestos import bp as presup_bp
# from .routes.solicitudes import bp as sol_bp
# from .routes.chatbot import bp as chatbot_bp
# from .routes.ai import bp as ai_bp
# from .catalog_schema import ensure_catalog_tables

def _setup_logging(app: Flask) -> None:
    Settings.ensure_dirs()
    handler = RotatingFileHandler(Settings.LOG_PATH, maxBytes=5_000_000, backupCount=3, encoding="utf-8")
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
    handler.setFormatter(formatter)
    app.logger.addHandler(handler)
    app.logger.setLevel(logging.DEBUG)

def create_app() -> Flask:
    # Serve the frontend from ../frontend as the app's static folder
    FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
    app = Flask(__name__, static_folder=FRONTEND_DIR)
    # app.config["ENV"] = Settings.ENV
    app.config["DEBUG"] = Settings.DEBUG
    app.config["JSON_SORT_KEYS"] = False
    app.config["JSONIFY_PRETTYPRINT_REGULAR"] = Settings.DEBUG
    # app.config["MAX_CONTENT_LENGTH"] = Settings.MAX_CONTENT_LENGTH
    app.config["JSON_AS_ASCII"] = False  # ← Nueva línea para permitir UTF-8 en JSON

    # _setup_logging(app)
    # ensure_catalog_tables(app.logger)

    # @app.after_request
    # def add_no_store_headers(response):
    #     content_type = response.headers.get("Content-Type", "")
    #     if isinstance(content_type, str) and 'text/html' in content_type.lower():
    #         response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    #     # Force UTF-8 charset
    #     if "charset" not in content_type.lower():
    #         if "application/json" in content_type:
    #             response.headers["Content-Type"] = "application/json; charset=utf-8"
    #         elif "text/html" in content_type:
    #             response.headers["Content-Type"] = "text/html; charset=utf-8"
    #     return response

    # try:
    #     build_db(force=False)
    # except Exception as e:
    #     app.logger.exception("Failed to initialize database")
    #     app.logger.info("Continuing without database initialization")

    # Enable CORS for /api/* when developing the frontend separately.
    # Set env SPM_CORS_ORIGINS to a comma-separated list, e.g. "http://localhost:8080,http://127.0.0.1:5173"
    # if Settings.CORS_ORIGINS:
    #     CORS(app, resources={r"/api/*": {"origins": Settings.CORS_ORIGINS}}, supports_credentials=True)

    # @app.before_request
    # def _attach_request_id():
    #     g.reqid = request.headers.get("X-Request-Id") or request.environ.get("FLASK_REQUEST_ID")

    # @app.errorhandler(400)
    # @app.errorhandler(404)
    # @app.errorhandler(405)
    # @app.errorhandler(422)
    # def client_error(err):
    #     code = getattr(err, "code", 400)
    #     return jsonify({"ok": False, "error": {"code": "HTTP_" + str(code), "message": str(err)}}), code

    # @app.errorhandler(Exception)
    # def server_error(err):
    #     return jsonify({"ok": False, "error": {"code": "SERVER_ERROR", "message": "Ocurrió un error inesperado"}}), 500

    # Register API blueprints
    # app.register_blueprint(auth_bp)
    # app.register_blueprint(mat_bp)
    # app.register_blueprint(sol_bp)
    # app.register_blueprint(notif_bp)
    # app.register_blueprint(admin_bp)
    # app.register_blueprint(presup_bp)
    # app.register_blueprint(planner_bp)
    # app.register_blueprint(chatbot_bp)
    app.register_blueprint(catalogos_bp)
    app.register_blueprint(almacenes_bp)
    # app.register_blueprint(usuarios_bp)
    # app.register_blueprint(usuarios_me_bp)
    # app.register_blueprint(archivos_bp)
    # app.register_blueprint(abastecimiento_bp)
    # app.register_blueprint(ai_bp)

    @app.get("/api/health")
    def health():
        return {"ok": True}

    # Frontend entry points
    @app.route("/", defaults={"path": "index.html"})
    @app.route("/<path:path>")
    def serve_frontend(path):
        return app.send_static_file(path)

    return app

if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 5001))
    app.run(host="127.0.0.1", port=port, debug=Settings.DEBUG)
