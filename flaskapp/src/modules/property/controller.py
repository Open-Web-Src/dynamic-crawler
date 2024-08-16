from flask import Blueprint
from modules.property.service import (
    PropertyDetailService,
    PropertyListService,
    PropertyConfigService,
)


property_bp = Blueprint("property_bp", __name__)
property_bp.add_url_rule(
    "/properties",
    view_func=PropertyListService.as_view("properties_list"),
    methods=["GET"],
)

property_bp.add_url_rule(
    "/properties/config",
    view_func=PropertyConfigService.as_view("properties_configuration"),
    methods=["GET"],
)

property_bp.add_url_rule(
    "/properties/<string:property_id>",
    view_func=PropertyDetailService.as_view("properties_detail"),
    methods=["GET"],
)

# Add the new endpoint for updating a property
property_bp.add_url_rule(
    "/properties/<string:property_id>",
    view_func=PropertyDetailService.as_view("properties_update"),
    methods=["PUT"],
)
