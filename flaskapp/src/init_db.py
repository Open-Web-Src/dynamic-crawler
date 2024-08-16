from flask import current_app
from db import get_db


def initialize_configuration():
    db = get_db()
    collection = db["configuration"]

    configuration = {
        "version": 1,
        "stamp_duty": 0.05,
        "titles_office_transfer_on_purchase": 0,
        "rates_adjustments_at_settlement": 0,
        "conveyancing_fees": 0.005,
        "miscellaneous_bank_fees": 0,
        "mortgage_registration_fee": 0,
        "title_transfer_fee": 0,
        "bank_legal_fees_on_purchase": 0.005,
        "bank_property_valuation": 0,
        "bank_loan_application_fee": 0,
        "insurance_on_existing_buildings": 0,
        "rates": 0,
        "other": 0,
        "residential_loan_lvr": 0.8,
        "project_duration_months": 12,
        "interest_on_residential_loan": 0.06,
        "construction_loan_lvr": 0.7,
        "interest_on_construction_loan": 0.09,
        "rental_term_months": 10,
        "net_rental_income_per_week": 380,
        "renovation_uplift": 0.3,
        "agents_commission": 0.025,
        "advertising_and_marketing": 0,
        "conveyancing_settlement_costs": 0.005,
        "rates_adjustment_on_settlement": 0,
        "mortgage_discharge_fee": 0,
        "register_discharge_titles_office": 0,
        "gst_liability_on_sales": 0.04,
        "input_credits": 0,
        "civil_costs_per_block": 10000,
        "demolition_costs": 30000,
        "infrastructure_exceptional_costs": 0,
        "professional_fees_based_on_construction_cost": 0.03,
        "contingencies_based_on_build_cost": 0.05,
        "average_house_m2": 135,
        "build_cost_m2": 3000,
        "council_contributions_per_house": 15000,
        "rates_utilities_land_tax": 2000,
        "months_to_finance": 12,
        "interest_on_development_costs": 0.05,
        "bank_fees": 0.02,
        "brokers_fees": 0.01,
        "other_lending_costs": 0.01,
        "finance": 0.2,
        "investor_input": 0.8,
        "renovation_costs": 0.1,
        "useable_land": 0.2,
        "construction_deposit": 0.3
    }

    try:
        existing = collection.find_one({"version": 1})
        if not existing:
            collection.insert_one(configuration)
            print("Configuration initialized successfully")
        else:
            print("Configuration already exists, skipping initialization")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
