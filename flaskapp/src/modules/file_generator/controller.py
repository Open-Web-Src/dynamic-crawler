from flask import Blueprint
from modules.file_generator.service import (
    PropertiesExcelGenerator,
    PropertyDetailExcelGenerator,
)


download_bp = Blueprint("download_bp", __name__)
download_bp.add_url_rule(
    "/download_excel",
    view_func=PropertiesExcelGenerator.as_view("download_excel_dashboard"),
    methods=["POST"],
)
download_bp.add_url_rule(
    "/download_excel/<string:property_id>",
    view_func=PropertyDetailExcelGenerator.as_view("download_excel_detail"),
    methods=["POST"],
)
