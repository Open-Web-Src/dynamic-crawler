from flask import Blueprint
from modules.health.service import HealthCheckService


health_bp = Blueprint('health_bp', __name__)
health_bp.add_url_rule(
    '', view_func=HealthCheckService.as_view('health'), methods=['GET'])
