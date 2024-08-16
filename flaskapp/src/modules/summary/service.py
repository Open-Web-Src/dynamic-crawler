from flask import request, jsonify, current_app
from flask.views import MethodView
from db import get_db
import re
from util import res

LIST_PROPERTY_MAP = {
    "HOUSE": ["House"],
    "DUPLEX": ["Duplex"],
    "TOWNHOUSE": ["Townhouse"],
    "LAND": ["Development Site", "New Land", "Vacant Land"],
}


class SummaryService(MethodView):
    def __init__(self):
        """
        Initialize the SummaryService class with a database client
        """
        self.db_client = get_db()

    def get_price_from_string(self, price_str):
        # Define the regex pattern to extract the first number
        pattern = r"\$\d{1,3}(?:,\d{3})*"

        # Search for the pattern in the text
        match = re.search(pattern, price_str)

        if match:
            # Remove the dollar sign and commas from the matched string
            number = match.group(0).replace("$", "").replace(",", "")
            # Convert to integer
            number = int(number)
            return number
        else:
            return None

    def calculate_properties_summary(self, property_types):

        data = self.db_client.properties.aggregate(
            [
                {
                    "$match": {
                        "property_type": {"$in": property_types},
                        "for_sale": "SOLD",
                    }
                },
                {"$sort": {"sold_date": -1}},
                {
                    "$group": {
                        "_id": {
                            "suburb": "$suburb",
                            "bed": "$bed",
                        },
                        "properties": {
                            "$push": "$$ROOT",
                        },
                    },
                },
                {
                    "$project": {
                        "properties": {
                            "$slice": ["$properties", 10],
                        },
                    },
                },
                {
                    "$addFields": {
                        "total": {"$sum": "$properties.sold_price"},
                        "count": {"$size": "$properties"},
                    }
                },
                {"$addFields": {"average_price": {"$divide": ["$total", "$count"]}}},
            ]
        )
        return list(data)

    def clean_comparable_summary(self):

        self.db_client.comparable_summary.delete_many({})
        self.db_client.comparable_average.delete_many({})

    def create_comparable_summary(self, property_type: str, list_group_properties=[]):

        # map list properties one by one and return new object
        data = []
        average_data = []
        for group_suburb in list_group_properties:

            # get all average data
            average_data.append(
                {
                    "suburb": group_suburb.get("_id", {}).get("suburb"),
                    "bed": group_suburb.get("_id", {}).get("bed"),
                    "property_type": property_type,
                    "average_price": group_suburb.get("average_price", 0),
                }
            )
            # get all properties
            for p in group_suburb.get("properties", []):
                data.append(
                    {
                        "property_type": property_type,
                        "suburb": p.get("suburb"),
                        "address": p.get("address"),
                        "sold_price": p.get("sold_price", 0),
                        "sold_date": p.get("sold_date"),
                        "bed": p.get("bed"),
                        "bath": p.get("bath"),
                        "car": p.get("car"),
                        "size": p.get("size"),
                    }
                )

        # insert comperable summary
        self.db_client.comparable_summary.insert_many(data)

        # insert comperable average
        self.db_client.comparable_average.insert_many(average_data)

    def get_list_comparable_summary(self):
        data = self.db_client.comparable_average.find()
        list_data = []
        for p in list(data):
            p["_id"] = str(p["_id"])
            list_data.append(p)
        return list_data

    def post(self):
        self.clean_comparable_summary()
        for property_type, property_types in LIST_PROPERTY_MAP.items():
            # get top 10 properties each type: HOUSE, DUPLEX, TOWNHOUSE, LAND
            list_property = self.calculate_properties_summary(property_types)
            if not list_property:
                continue
            # save to summary
            self.create_comparable_summary(property_type, list_property)

        data = self.get_list_comparable_summary()
        return res.success(data), 200
