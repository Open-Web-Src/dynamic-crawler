from flask import Blueprint, request, jsonify, current_app
from modules.summary.service import SummaryService


summary_bp = Blueprint('summary_bp', __name__)
summary_bp.add_url_rule(
    '/summary', view_func=SummaryService.as_view('summary'), methods=['POST'])
