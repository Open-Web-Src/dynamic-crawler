import io
import pandas as pd
from openpyxl import load_workbook

TEMPLATE_PATH = "./../template/rough_feasibility_template.xlsx"

CONFIGURATION_MAP = {
    "D25": "stamp_duty",
    "D26": "titles_office_transfer_on_purchase",
    "D27": "rates_adjustments_at_settlement",
    "D28": "conveyancing_fees",
    "D29": "miscellaneous_bank_fees",
    "D30": "mortgage_registration_fee",
    "D31": "title_transfer_fee",
    "D32": "bank_legal_fees_on_purchase",
    "D33": "bank_property_valuation",
    "D34": "bank_loan_application_fee",
    "D35": "insurance_on_existing_buildings",
    "D36": "rates",
    "D37": "other",
    "D41": "residential_loan_lvr",
    "D42": "project_duration_months",
    "D43": "interest_on_residential_loan",
    "D44": "construction_loan_lvr",
    "D45": "interest_on_construction_loan",
    "D49": "rental_term_months",
    "D50": "net_rental_income_per_week",
    "D51": "renovation_uplift",
    "D55": "agents_commission",
    "D56": "advertising_and_marketing",
    "D57": "conveyancing_settlement_costs",
    "D58": "rates_adjustment_on_settlement",
    "D59": "mortgage_discharge_fee",
    "D60": "register_discharge_titles_office",
    "D61": "gst_liability_on_sales",
    "D62": "input_credits",
    "D66": "civil_costs_per_block",
    "D67": "demolition_costs",
    "D68": "infrastructure_exceptional_costs",
    "D69": "professional_fees_based_on_construction_cost",
    "D70": "contingencies_based_on_build_cost",
    "D71": "average_house_m2",
    "D72": "build_cost_m2",
    "D73": "council_contributions_per_house",
    "D74": "rates_utilities_land_tax",
    "D75": "months_to_finance",
    "D76": "interest_on_development_costs",
    "D77": "bank_fees",
    "D78": "brokers_fees",
    "D79": "other_lending_costs",
    "D80": "finance",
    "D81": "investor_input",
    "D82": "renovation_costs",
}

PROPERTIES_MAP = {
    "D5": "address",
    "D6": "advertised_price",
    "D7": "lower_price",
    "D8": "mid_price",
    "D9": "upper_price",
    "D10": "find_price",
    "D11": "size",
    "D12": "home_size",
    "D13": "useable_land",
    "D14": "minimum_lot_size_subdivision",
    "D15": "minimum_lot_size_duplex",
    "D16": "minimum_frontage",
    "D17": "bed",
    "D18": "bath",
    "D19": "car",
    "D20": "council",
    "D21": "zoning",
}

DEFAULT_PROPERTIES_MAP = {
    "minimum_lot_size_duplex": 600,
    "minimum_lot_size_subdivision": 600,
    "home_size": 450,
}
PROPERTIES_SUMMARY_START_ROW_MAP = {
    "HOUSE": 6,
    "LAND": 21,
    "DUPLEX": 36,
    "TOWNHOUSE": 51,
}


class ExcelWriter:
    def __init__(self):
        """
        Initialize the FeasibilityService class with a database client
        """
        self.workbook = load_workbook("src/template/feasibility.xlsx")


    def get_default_value(self, key):
        if key in DEFAULT_PROPERTIES_MAP:
            return DEFAULT_PROPERTIES_MAP.get(key)
        return None

    def write_input_sheet(self, data):
        # write configuration
        for cell, key_property in CONFIGURATION_MAP.items():
            self.workbook["Input"][cell] = data.get(key_property)

        # writer properties
        for cell, key_property in PROPERTIES_MAP.items():
            cell_value = data.get(key_property)
            if cell_value is None:
                cell_value = self.get_default_value(key_property)
            self.workbook["Input"][cell] = cell_value

        # write date
        self.workbook["Input"]["D1"] = pd.Timestamp.now().strftime("%Y-%m-%d")

    def write_comparable_data_sheet(self, list_properties):
        row_number = 6
        for p in list_properties:
            self.workbook["Comparables_data"][f"A{row_number}"] = p.get("address")
            self.workbook["Comparables_data"][f"B{row_number}"] = p.get(
                "advertised_price"
            )
            self.workbook["Comparables_data"][f"C{row_number}"] = p.get("bed")
            self.workbook["Comparables_data"][f"D{row_number}"] = p.get("bath")
            self.workbook["Comparables_data"][f"E{row_number}"] = p.get("car")
            self.workbook["Comparables_data"][f"F{row_number}"] = p.get("size")
            self.workbook["Comparables_data"][f"G{row_number}"] = p.get("sold_price")
            self.workbook["Comparables_data"][f"H{row_number}"] = p.get(
                "listing_agency"
            )

            row_number += 1

        # write suburb and date
        self.workbook["Comparables_data"]["A4"] = list_properties[0].get("suburb")
        self.workbook["Comparables_data"]["B4"] = pd.Timestamp.now().strftime(
            "%Y-%m-%d"
        )

    def write_comparable_summary_sheet(self, list_summary):
        # group summary by property_type
        summary_group = {}
        for s in list_summary:
            if s.get("property_type") not in summary_group:
                summary_group[s.get("property_type")] = []
            summary_group[s.get("property_type")].append(s)

        for property_type, start_row in PROPERTIES_SUMMARY_START_ROW_MAP.items():

            data = summary_group.get(property_type)

            if data is None:
                continue
            count = 0
            for p in data:
                row_number = start_row + count
                count += 1
                self.workbook["Comparables_summary"][f"B{row_number}"] = count
                self.workbook["Comparables_summary"][f"C{row_number}"] = p.get(
                    "address"
                )
                self.workbook["Comparables_summary"][f"D{row_number}"] = p.get(
                    "sold_date"
                )

                if property_type == "LAND":
                    self.workbook["Comparables_summary"][f"E{row_number}"] = p.get(
                        "size"
                    )
                    self.workbook["Comparables_summary"][f"F{row_number}"] = p.get(
                        "sold_price"
                    )
                    continue

                self.workbook["Comparables_summary"][f"E{row_number}"] = p.get("bed")
                self.workbook["Comparables_summary"][f"F{row_number}"] = p.get("bath")
                self.workbook["Comparables_summary"][f"G{row_number}"] = p.get("car")
                self.workbook["Comparables_summary"][f"I{row_number}"] = p.get("size")
                self.workbook["Comparables_summary"][f"J{row_number}"] = p.get(
                    "sold_price"
                )

    def save(self):
        self.workbook.save("output.xlsx")

    def get_file(self):
        output = io.BytesIO()
        self.workbook.save(output)
        output.seek(0)
        return output
