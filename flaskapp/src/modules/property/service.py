import json
import math
from flask import jsonify, request, current_app
from flask.views import MethodView
from bson import ObjectId
from util import res, req

# from flask_smorest import Blueprint
from db import get_db


class PropertyDetailService(MethodView):
    def __init__(self):
        """
        Initialize the FeasibilityService class with a database client
        """
        self.db_client = get_db()

    def get(self, property_id):
        properties = self.db_client.properties.find_one(
            {"_id": ObjectId(property_id)},
            {
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
                "zoning": 1
            },
        )
        if not properties:
            return res.error("Property not found"), 404

        properties["_id"] = str(properties["_id"])
        return res.success(properties)

    def put(self, property_id):
        data = request.json
        update_fields = {
            "address": data.get("address"),
            "advertised_price": data.get("advertised_price"),
            "lower_price": data.get("lower_price"),
            "mid_price": data.get("mid_price"),
            "upper_price": data.get("upper_price"),
            "find_price": data.get("find_price"),
            "find_price_description": data.get("find_price_description"),
            "size": data.get("size"),
            "home_size": data.get("home_size"),
            "min_lot_size_subdivision": data.get("min_lot_size_subdivision"),
            "min_lot_size_duplex": data.get("min_lot_size_duplex"),
            "min_frontage": data.get("min_frontage"),
            "bed": data.get("bed"),
            "bath": data.get("bath"),
            "car": data.get("car"),
            "council": data.get("council"),
            "zoning": data.get("zoning")
        }
        # Remove fields that are None
        update_fields = {k: v for k,
                         v in update_fields.items() if v is not None}

        result = self.db_client.properties.update_one(
            {"_id": ObjectId(property_id)},
            {"$set": update_fields}
        )

        if result.matched_count == 0:
            return res.error("Property not found"), 404

        if result.modified_count == 0:
            return res.success("No changes made to the property"), 200

        return res.success("Property updated successfully")


class PropertyListService(MethodView):
    def __init__(self):
        """
        Initialize the FeasibilityService class with a database client
        """
        self.db_client = get_db()

    def get(self):
        query = request.args
        print("First request args")
        print(query)

        # define pipeline
        pipeline = []

        filter = {}
        if query.get("bed"):
            filter["bed"] = int(query.get("bed"))

        if query.get("bath"):
            filter["bath"] = int(query.get("bath"))

        if query.get("car"):
            filter["car"] = int(query.get("car"))

        if query.get("days_on_market"):
            filter["days_on_market"] = int(query.get("days_on_market"))

        if query.get("size"):
            filter["size"] = int(query.get("days_on_market"))

        if query.get("for_sale"):
            filter["for_sale"] = query.get("for_sale")

        if query.get("feasible"):
            filter["feasible"] = query.get("feasible")

        if query.get("keyword"):
            keyword = query.get("keyword")
            filter["$or"] = [
                {"address": {"$regex": keyword, "$options": "i"}},
                {"advertised_price": {"$regex": keyword, "$options": "i"}},
                {"postcode": {"$regex": keyword, "$options": "i"}},
                {"suburb": {"$regex": keyword, "$options": "i"}},
                {"state": {"$regex": keyword, "$options": "i"}},
            ]

        pipeline.append({"$match": filter})

        pipeline.append({
            "$project": {
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
        })

        # Add sort stage to the pipeline to sort by 'feasible' field in descending order
        pipeline.append({"$sort": {"feasible": -1, "highest_margin": -1}})

        limit, offset, page = req.get_pagination(
            query.get("page_size"), query.get("page")
        )

        # get data with pagination
        properties = self.db_client.properties.aggregate(
            [
                *pipeline,
                {"$skip": offset},
                {"$limit": limit},
            ]
        )

        # count data
        total_data = self.db_client.properties.aggregate(
            [*pipeline, {"$count": "total"}]
        )

        # return data
        total = list(total_data)[0]["total"]
        list_data = []
        for p in list(properties):
            p["_id"] = str(p["_id"])
            list_data.append(p)

        return res.success_with_pagination(list_data, total, page, limit)


class PropertyConfigService(MethodView):
    def __init__(self):
        """
        Initialize the FeasibilityService class with a database client
        """
        self.db_client = get_db()

    def get(self):
        config = self.db_client.configuration.find_one(
            {},
            {"_id": 0},
        )
        if not config:
            return res.error("Config not found"), 404

        return res.success(config)
