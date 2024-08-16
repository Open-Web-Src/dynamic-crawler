from flask import Blueprint
from modules.summary.controller import summary_bp
from modules.feasibility.controller import feasibility_bp
from modules.health.controller import health_bp
from modules.property.controller import property_bp
from modules.file_generator.controller import download_bp

app_bp = Blueprint("app_bp", __name__)

app_bp.register_blueprint(summary_bp, url_prefix="/api")
app_bp.register_blueprint(feasibility_bp, url_prefix="/api")
app_bp.register_blueprint(health_bp, url_prefix="/health")
app_bp.register_blueprint(property_bp, url_prefix="/api")
app_bp.register_blueprint(download_bp, url_prefix="/file")
