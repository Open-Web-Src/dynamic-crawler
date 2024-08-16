from db import get_db
import math
from flask import jsonify, request, current_app
from flask.views import MethodView
from pymongo import UpdateOne
from util.constant import (
    PROPERTY_TYPE_HOUSE,
    PROPERTY_TYPE_DUPLEX,
    PROPERTY_TYPE_LAND,
    PROPERTY_TYPE_TOWN_HOUSE,
)

from bson import ObjectId


class FeasibilityCalculateService:
    def __init__(self):
        """
        Initialize the FeasibilityService class with a database client
        """
        self.db = get_db()
        self.config = self.fetch_configuration()

    def calculate_property(self, property):
        property_result = {"_id": property["_id"]}

        for strategy_name, strategy_id in self.get_strategies().items():
            # Net Realisation - (Box A)
            (
                gross_realisation,
                less_selling_costs,
                net_realisation,
                nr_to_sell,
                slope_a_1,
            ) = self.calculate_net_realisation(strategy=strategy_id, property=property)

            # Development Costs - (Box B)
            (
                cost_to_build_houses,
                professional_fees,
                contingencies,
                council_contributions_rates_utilities,
                interest_and_bank_fees,
                total_development_costs,
            ) = self.calculate_development_costs(
                strategy=strategy_id,
                property=property,
                nr_to_sell=nr_to_sell,
                slope_a_1=slope_a_1,
            )

            # Purchase Costs - (Box C)
            (
                purchase_costs,
                interest_charges_fees_for_land,
                total_purchase_costs,
                legal_costs_house_purchase,
            ) = self.calculate_purchase_costs(strategy=strategy_id, property=property)

            # ----------------------------------------------------------------
            # Gross Profit
            (gross_profit, gross_profit_on_cost, gross_profit_per_house) = (
                self.calculate_gross_profit(
                    strategy=strategy_id,
                    net_realisation=net_realisation,
                    total_development_costs=total_development_costs,
                    total_purchase_costs=total_purchase_costs,
                    less_selling_costs=less_selling_costs,
                    nr_to_sell=nr_to_sell,
                )
            )

            # ----------------------------------------------------------------
            # Net Profit
            (net_profit_after_gst, net_profit_on_cost, net_profit_per_house) = (
                self.calculate_net_profit_after_gst(
                    strategy=strategy_id,
                    property=property,
                    gross_realisation=gross_realisation,
                    slope_a_1=slope_a_1,
                    less_selling_costs=less_selling_costs,
                    cost_to_build_houses=cost_to_build_houses,
                    professional_fees=professional_fees,
                    contingencies=contingencies,
                    legal_costs_house_purchase=legal_costs_house_purchase,
                    council_contributions_rates_utilities=council_contributions_rates_utilities,
                    interest_and_bank_fees=interest_and_bank_fees,
                    interest_charges_fees_for_land=interest_charges_fees_for_land,
                    total_development_costs=total_development_costs,
                    total_purchase_costs=total_purchase_costs,
                    nr_to_sell=nr_to_sell,
                )
            )

            # round these value to 2 decimal places
            property_result.update(
                {
                    f"{strategy_name}_gross_profit": round(gross_profit, 2),
                    f"{strategy_name}_gross_profit_on_cost": round(
                        gross_profit_on_cost, 2
                    ),
                    f"{strategy_name}_gross_profit_per_house": round(
                        gross_profit_per_house, 2
                    ),
                    f"{strategy_name}_net_profit_after_gst": round(
                        net_profit_after_gst, 2
                    ),
                    f"{strategy_name}_net_profit_on_cost": round(net_profit_on_cost, 2),
                    f"{strategy_name}_net_profit_per_house": round(
                        net_profit_per_house, 2
                    ),
                }
            )

        list_gross_profit_on_cost_by_strategy = [
            property_result[f"{strategy_name}_gross_profit_on_cost"]
            for strategy_name in self.get_strategies().keys()
        ]
        highest_margin = max(list_gross_profit_on_cost_by_strategy)
        feasible = False
        for i in list_gross_profit_on_cost_by_strategy:
            if i > 0:
                feasible = True
                break

        property_result["highest_margin"] = highest_margin
        property_result["feasible"] = feasible
        return property_result

    def fetch_configuration(self):
        """
        Fetch fetch_configuration from the database for all strategies

        :return: dict, fetch_configuration retrieved from the database
        """
        collection = self.db["configuration"]

        document = collection.find_one(sort=[("version", -1)])

        if document:
            return document
        else:
            raise ValueError("No inputs found for the specified version")

    def fetch_properties(self):
        """
        Fetch properties from the database

        :return: list, properties retrieved from the database
        """
        collection = self.db["properties"]
        properties = list(collection.find({"for_sale": {"$in": ["FOR_SALE"]}}))
        return properties

    def get_strategies(self):
        """
        Get the mapping of strategy names to strategy IDs

        :return: dict, mapping of strategy names to IDs
        """
        return {
            "a_subdivision": 1,
            "b_subdivision_reno": 2,
            "c_demolish_subdivision": 3,
            "d_demolish_duplex": 4,
            "e_subdivision_reno_duplex": 5,
            "f_demolish_townhouse": 6,
        }

    def fetch_avg_sold_price(self, property, property_type):
        """
        Fetch average sold price for a given property type from the database

        :param property_type: str, the property type (duplexes or houses)
        :return: float, average sold price
        """
        collection = self.db["comparable_average"]
        document = collection.find_one(
            {
                "property_type": property_type,
                "bed": property.get("bed"),
                "suburb": property.get("suburb"),
            }
        )

        if document and "average_price" in document:
            return document["average_price"]
        else:
            return 0

    def calculate_number_of_houses(self, strategy, property):
        """
        Calculate the number of houses based on the strategy

        :param strategy: number, the strategy id
        :param property: dict, property detail
        :return: int, calculated number of houses
        """
        gross_site_area = float(property.get("size", 0))

        if strategy == 4 or strategy == 5:
            minimum_lot_size = property.get("minimum_lot_size_duplex", 600)
        else:
            minimum_lot_size = property.get("minimum_lot_size_subdivision", 600)

        if strategy == 4 or strategy == 3:
            home_size = 0
        else:
            home_size = float(property.get("home_size", 450))

        useable_land_input = float(self.config.get("useable_land"))
        if gross_site_area and useable_land_input is not None:
            useable_land = (gross_site_area - home_size) * (1 - useable_land_input)
        else:
            useable_land = 0

        if strategy == 6:
            return gross_site_area / self.config.get("average_house_m2", 135)
        else:
            # the rest of the strategies is the same
            return math.floor(useable_land / minimum_lot_size)

    def calculate_net_realisation(self, strategy, property):
        """
        Calculate the net realisation for the given strategy

        :param strategy: number, the strategy id
        :param property: dict, property detail
        :return: tuple, gross_realisation, less_selling_costs, net_realisation,
        nr_to_sell, slope_a_1
        """
        # Extract inputs

        # avg_sold_price
        if strategy == 4 or strategy == 5:
            avg_sold_price = self.fetch_avg_sold_price(property, PROPERTY_TYPE_DUPLEX)
        elif strategy == 6:
            avg_sold_price = self.fetch_avg_sold_price(
                property, PROPERTY_TYPE_TOWN_HOUSE
            )
        else:
            avg_sold_price = self.fetch_avg_sold_price(property, PROPERTY_TYPE_LAND)

        # sale_price_existing_houses
        if strategy == 1 or strategy == 3 or strategy == 4 or strategy == 6:
            sale_price_existing_houses = self.fetch_avg_sold_price(
                property, PROPERTY_TYPE_HOUSE
            )
        elif strategy == 2 or strategy == 5:
            sale_price_existing_houses = self.fetch_avg_sold_price(
                property, PROPERTY_TYPE_HOUSE
            ) * (1 + self.config.get("renovation_uplift"))

        # ----
        net_rental_income_per_week = self.config.get("net_rental_income_per_week") * 4
        agents_commission = self.config.get("agents_commission")
        legal_expenses = self.config.get("conveyancing_settlement_costs")
        advertising_marketing = self.config.get("advertising_and_marketing")

        number_of_houses = self.calculate_number_of_houses(strategy, property)

        # slope
        if strategy == 4:
            slope_a_1 = 0
        elif strategy == 5:
            slope_a_1 = number_of_houses * 2
        else:
            # the rest of the strategies is the same
            slope_a_1 = number_of_houses

        if strategy == 4:
            slope_a_2 = number_of_houses * 2
        elif strategy == 5 or strategy == 2 or strategy == 1:
            slope_a_2 = 1
        elif strategy == 6 or strategy == 3:
            slope_a_2 = 0

        if strategy == 4 or strategy == 6 or strategy == 3:
            months = 0
        elif strategy == 5 or strategy == 2 or strategy == 1:
            months = self.config.get("rental_term_months", 0)

        nr_to_sell = slope_a_1 + slope_a_2

        sum_avg_sold_price_duplexes_houses = (
            avg_sold_price * slope_a_1 + sale_price_existing_houses * slope_a_2
        )

        # Gross Realisation
        gross_realisation = (
            sum_avg_sold_price_duplexes_houses + net_rental_income_per_week * months
        )

        # Less Selling Costs
        less_selling_costs = (
            sum_avg_sold_price_duplexes_houses * agents_commission
            + sum_avg_sold_price_duplexes_houses * legal_expenses
            + advertising_marketing
        )

        # Net Realisation
        net_realisation = gross_realisation - less_selling_costs

        return (
            gross_realisation,
            less_selling_costs,
            net_realisation,
            nr_to_sell,
            slope_a_1,
        )

    def calculate_development_costs(self, strategy, property, nr_to_sell, slope_a_1):
        """
        Calculate development costs
        """
        civil_costs_per_block = self.config.get("civil_costs_per_block")
        demolition_costs = self.config.get("demolition_costs")

        if strategy == 4 or strategy == 6 or strategy == 1 or strategy == 3:
            renovation_costs = self.config.get("infrastructure_exceptional_costs")
        elif strategy == 5 or strategy == 2:
            renovation_costs = self.config.get("renovation_costs") * float(
                property.get("find_price", 0)
            )

        average_house_m2 = self.config.get("average_house_m2")
        build_cost_m2 = self.config.get("build_cost_m2")
        average_build_cost_per_house = average_house_m2 * build_cost_m2

        professional_fees_percentage = self.config.get(
            "professional_fees_based_on_construction_cost"
        )
        contingencies_percentage = self.config.get("contingencies_based_on_build_cost")
        council_contributions_per_house = self.config.get(
            "council_contributions_per_house"
        )
        rates_utilities_land_tax = self.config.get("rates_utilities_land_tax")

        if strategy == 4 or strategy == 5 or strategy == 6:
            months_to_finance = self.config.get("months_to_finance") + 6
        else:
            months_to_finance = self.config.get("months_to_finance")

        interest_on_development_costs = self.config.get("interest_on_development_costs")
        bank_fees = self.config.get("bank_fees")
        brokers_fees = self.config.get("brokers_fees")
        other_lending_costs = self.config.get("other_lending_costs")

        number_of_houses = self.calculate_number_of_houses(strategy, property)

        if strategy == 4 or strategy == 6:
            slope_b_1 = 1
        elif strategy == 5 or strategy == 1 or strategy == 2:
            slope_b_1 = 0
        elif strategy == 3:
            slope_b_1 = number_of_houses

        if strategy == 4 or strategy == 5:
            slope_b_2 = number_of_houses * 2           
        elif strategy == 6:
            slope_b_2 = number_of_houses
        else:
            slope_b_2 = 0

        slope_b_3 = nr_to_sell - slope_b_1

        # Cost to Build Houses
        cost_to_build_houses = (
            civil_costs_per_block * slope_a_1
            + demolition_costs * slope_b_1
            + renovation_costs * 1
            + average_build_cost_per_house * slope_b_2
        )

        # Professional Fees
        professional_fees = cost_to_build_houses * professional_fees_percentage

        # Contingencies
        contingencies = cost_to_build_houses * contingencies_percentage

        # Council Contributions, Rates & Utilities
        council_contributions_rates_utilities = (
            council_contributions_per_house * slope_b_3
            + rates_utilities_land_tax * slope_a_1
        )

        total_costs_and_fees = (
            cost_to_build_houses
            + professional_fees
            + contingencies
            + council_contributions_rates_utilities
        )

        # Interest & Bank Fees
        interest_and_bank_fees = (
            total_costs_and_fees
            * interest_on_development_costs
            * months_to_finance
            / 12
            + total_costs_and_fees * (bank_fees + brokers_fees + other_lending_costs)
        )

        # Total Development Costs
        total_development_costs = total_costs_and_fees + interest_and_bank_fees

        return (
            cost_to_build_houses,
            professional_fees,
            contingencies,
            council_contributions_rates_utilities,
            interest_and_bank_fees,
            total_development_costs,
        )

    def calculate_purchase_costs(self, strategy, property):
        """
        Calculate purchase costs
        """
        purchase_price_of_site = float(property.get("find_price", 0))
        stamp_duty = self.config.get("stamp_duty", 0.05)

        # Legal Costs-House purchase, COA & JV
        legal_costs_house_purchase = sum(
            [
                self.config.get("titles_office_transfer_on_purchase", 0),
                self.config.get("rates_adjustments_at_settlement", 0),
                self.config.get("conveyancing_fees", 0.005),
                self.config.get("miscellaneous_bank_fees", 0),
                self.config.get("mortgage_registration_fee", 0),
                self.config.get("title_transfer_fee", 0),
                self.config.get("bank_legal_fees_on_purchase", 0.005),
                self.config.get("bank_property_valuation", 0),
                self.config.get("bank_loan_application_fee", 0),
                self.config.get("insurance_on_existing_buildings", 0),
                self.config.get("rates", 0),
                self.config.get("other", 0),
            ]
        )

        residential_loan_lvr = self.config.get("residential_loan_lvr", 0.8)
        investor_input = 1 - residential_loan_lvr
        purchase_costs_fees = 0
        interest_on_purchase_costs = 0.05

        if strategy == 4 or strategy == 5 or strategy == 6:
            project_duration_months = self.config.get("project_duration_months", 12) + 6
        else:
            # strategy 1, 2, 3
            project_duration_months = self.config.get("project_duration_months", 12)

        # Purchase Costs
        purchase_costs = float(purchase_price_of_site) * (
            1 + stamp_duty + legal_costs_house_purchase
        )

        # Interest Charges & Fees for Land
        interest_charges_fees_for_land = (
            purchase_costs * purchase_costs_fees
            + purchase_costs * interest_on_purchase_costs * project_duration_months / 12
        )

        # Total Purchase Costs
        total_purchase_costs = purchase_costs + interest_charges_fees_for_land

        return (
            purchase_costs,
            interest_charges_fees_for_land,
            total_purchase_costs,
            legal_costs_house_purchase,
        )

    def calculate_gross_profit(
        self,
        strategy,
        net_realisation,
        total_development_costs,
        total_purchase_costs,
        less_selling_costs,
        nr_to_sell,
    ):
        """
        Calculate gross profit
        """
        # Gross Profit
        gross_profit = net_realisation - total_development_costs - total_purchase_costs

        # Gross Profit on cost
        sum_cost = total_development_costs + total_purchase_costs + less_selling_costs
        gross_profit_on_cost = gross_profit / sum_cost if sum_cost else 0

        # Gross Profit per House

        gross_profit_per_house = gross_profit / nr_to_sell if nr_to_sell else 0

        return gross_profit, gross_profit_on_cost, gross_profit_per_house

    def calculate_net_profit_after_gst(
        self,
        strategy,
        property,
        gross_realisation,
        slope_a_1,
        less_selling_costs,
        cost_to_build_houses,
        professional_fees,
        contingencies,
        legal_costs_house_purchase,
        council_contributions_rates_utilities,
        interest_and_bank_fees,
        interest_charges_fees_for_land,
        total_development_costs,
        total_purchase_costs,
        nr_to_sell,
    ):
        """
        Calculate net profit after GST
        """
        try:
            gross_realisation = float(gross_realisation)
            find_price = float(property.get("find_price", 0))
        except ValueError:
            raise ValueError("Inputs must be convertible to float")

        if strategy == 5:
            avg_sold_price = self.fetch_avg_sold_price(property, PROPERTY_TYPE_DUPLEX)
            left_part = (
                avg_sold_price * slope_a_1
                - (avg_sold_price * slope_a_1 - find_price) / 11
            )
        else:
            left_part = gross_realisation - (gross_realisation - find_price) / 11

        middle_part = (
            less_selling_costs
            + cost_to_build_houses
            + professional_fees
            + contingencies
            + find_price * legal_costs_house_purchase
        ) * (1 - 1 / 11)

        right_part = (
            council_contributions_rates_utilities
            + interest_and_bank_fees
            + interest_charges_fees_for_land
            + find_price * (1 + self.config.get("stamp_duty", 0.05))
        )

        # Net Profit after GST
        net_profit_after_gst = left_part - middle_part - right_part

        # Net Profit on cost
        sum_cost = total_development_costs + total_purchase_costs + less_selling_costs
        net_profit_on_cost = net_profit_after_gst / sum_cost if sum_cost else 0

        # Net profit per House
        net_profit_per_house = net_profit_after_gst / nr_to_sell if nr_to_sell else 0

        return net_profit_after_gst, net_profit_on_cost, net_profit_per_house

    def bulk_update_properties(self, batch_results):
        """
        Update properties in the database with the calculated results.

        :param batch_results: list, the batch of results to update
        """
        collection = self.db["properties"]
        operations = [
            UpdateOne({"_id": result["_id"]}, {"$set": result})
            for result in batch_results
        ]
        collection.bulk_write(operations)


class FeasibilityService(MethodView):
    def __init__(self):
        pass

    def post(self):
        feasibility_calculator = FeasibilityCalculateService()
        properties = feasibility_calculator.fetch_properties()
        batch_size = current_app.config["BATCH_SIZE"]
        batch_results = []

        for property in properties:
            property_results = feasibility_calculator.calculate_property(property)
            batch_results.append(property_results)

            if len(batch_results) >= batch_size:
                feasibility_calculator.bulk_update_properties(batch_results)
                batch_results = []

        if batch_results:
            feasibility_calculator.bulk_update_properties(batch_results)

        current_app.logger.info("Processed all properties")
        return jsonify({"message": "Processed all properties"}), 200


class FeasibilityDetailService(MethodView):
    def __init__(self):
        """
        Initialize the FeasibilityService class with a database client
        """
        self.db = get_db()

    def get_property_by_id(self, property_id):
        """
        Fetch a property by its ID

        :param property_id: str, the property ID
        :return: dict, the property
        """
        collection = self.db["properties"]
        property = collection.find_one({"_id": ObjectId(property_id)})
        return property

    def update_property(self, property_id, property_results):
        """
        Update a property with the calculated results

        :param property_id: str, the property ID
        :param property_results: dict, the calculated results
        """
        collection = self.db["properties"]
        collection.update_one(
            {"_id": ObjectId(property_id)}, {"$set": property_results}
        )

    def post(self, property_id):
        feasibility_calculator = FeasibilityCalculateService()
        property = self.get_property_by_id(property_id)
        property_results = feasibility_calculator.calculate_property(property)

        self.update_property(property_id, property_results)

        current_app.logger.info("Processed property ID %s success", property_id)
        return jsonify({"message": "Processed properties "}), 200
