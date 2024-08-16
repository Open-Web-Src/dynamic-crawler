from flask import jsonify, send_file, request
from flask.views import MethodView
from modules.file_generator.excel_writer import ExcelWriter
from modules.file_generator.excel_generator import ExcelGenerator
from bson import ObjectId
import pandas as pd
from db import get_db, fetch_data_from_db, convert_objectid_to_str


class PropertiesExcelGenerator(MethodView):
    def __init__(self):
        """
        Initialize the FeasibilityService class with a database client
        """
        self.db_client = get_db()
        self.generator = ExcelGenerator()

    def post(self):
        property_ids = request.json.get("property_ids", [])
        try:
            if not property_ids:
                filter = {"for_sale": "FOR_SALE"}
            else:
                object_ids = [ObjectId(pid) for pid in property_ids]
                filter = {"_id": {"$in": object_ids}}

            projection = {
                "address": 1,
                "advertised_price": 1,
                "size": 1,
                "bed": 1,
                "bath": 1,
                "car": 1,
                "state": 1,
                "suburb": 1,
                "postcode": 1,
                "date_listed": 1,
                "days_on_market": 1,
                "a_subdivision_gross_profit_on_cost": 1,
                "b_subdivision_reno_gross_profit_on_cost": 1,
                "c_demolish_subdivision_gross_profit_on_cost": 1,
                "d_demolish_duplex_gross_profit_on_cost": 1,
                "e_subdivision_reno_duplex_gross_profit_on_cost": 1,
                "f_demolish_townhouse_gross_profit_on_cost": 1,
                "highest_margin": 1,
                "feasible": 1,
            }

            sort = [("feasible", -1), ("highest_margin", -1)]

            properties = fetch_data_from_db(
                db=self.db_client,
                collection_name="properties",
                filter=filter,
                projection=projection,
                sort=sort,
            )

            dashboard_file = self.generator.generate_dashboard(
                pd.DataFrame(convert_objectid_to_str(properties))
            )

            return send_file(
                dashboard_file,
                mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                download_name="dashboard.xlsx",
                as_attachment=True,
            )
        except Exception as e:
            return jsonify({"error": str(e)}), 500


class PropertyDetailExcelGenerator(MethodView):
    def __init__(self):
        """
        Initialize the FeasibilityService class with a database client
        """
        self.db_client = get_db()
        self.generator = None

    def post(self, property_id):
        # initialize the ExcelWriter
       
        try:
            self.generator = ExcelWriter()
        except Exception as e:
            return jsonify({"error": str(e)}), 400

        if not property_id:
            return jsonify({"error": "property_id parameter is required"}), 400
        try:
            configuration_projection = {
                "_id": 0,
                "version": 0,
            }
            configuration_data = fetch_data_from_db(
                db=self.db_client,
                collection_name="configuration",
                projection=configuration_projection,
                sort=[("version", -1)],
            )

            projection = {
                "_id": 0,
                "address": 1,
                "advertised_price": 1,
                "lower_price": 1,
                "mid_price": 1,
                "upper_price": 1,
                "find_price": 1,
                "find_price_description": 1,
                "size": 1,
                "home_size": 1,
                "min_lot_size_subdivision": 1,
                "min_lot_size_duplex": 1,
                "min_frontage": 1,
                "bed": 1,
                "bath": 1,
                "car": 1,
                "council": 1,
                "zoning": 1,
                "for_sale": 1,
                "sold_price": 1,
                "listing_agency": 1,
                "suburb": 1,
            }
            property_data = fetch_data_from_db(
                db=self.db_client,
                collection_name="properties",
                filter={"_id": ObjectId(property_id)},
                projection=projection,
            )
            if not property_data:
                raise ValueError("Property not found")

            # Convert ObjectId to string and lists to strings
            property_data = convert_objectid_to_str(property_data)
            configuration_data = convert_objectid_to_str(configuration_data)

            property_record = property_data[0]
            configuration_record = configuration_data[0]
            merged_data = {**property_record, **configuration_record}

            self.generator.write_input_sheet(merged_data)
            # write comparable data
            sold_properties = fetch_data_from_db(
                db=self.db_client,
                collection_name="properties",
                filter={"for_sale": "SOLD"},
                projection=projection,
            )
            self.generator.write_comparable_data_sheet(sold_properties)

            # write comparable average
            comparable_data = fetch_data_from_db(
                db=self.db_client,
                collection_name="comparable_summary",
                filter={
                    "suburb": property_record.get("suburb"),
                    "bed": property_record.get("bed"),
                },
            )
            self.generator.write_comparable_summary_sheet(comparable_data)
            file_data = self.generator.get_file()

            return send_file(
                file_data,
                mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                download_name=f"property_detail_{property_id}.xlsx",
                as_attachment=True,
            )

        except Exception as e:
            return jsonify({"error": str(e)}), 500
