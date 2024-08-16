from flask import Blueprint
from modules.feasibility.service import FeasibilityService, FeasibilityDetailService


feasibility_bp = Blueprint("feasibility_bp", __name__)
feasibility_bp.add_url_rule(
    "/feasibility",
    view_func=FeasibilityService.as_view("feasibility"),
    methods=["POST"],
)

feasibility_bp.add_url_rule(
    "/feasibility/<string:property_id>",
    view_func=FeasibilityDetailService.as_view("feasibility-detail"),
    methods=["POST"],
)
