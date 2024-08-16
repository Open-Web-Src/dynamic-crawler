import json
import logging
import re
import scrapy
from scrapy.loader import ItemLoader
from ..helpers.constants import Constants
from ..items import DomainItem


class DomainSoldSpider(scrapy.Spider):
    name = "domain_sold"
    allowed_domains = ["www.domain.com.au"]
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7",
        "Cache-Control": "max-age=0",
        "User-Agent": Constants.USER_AGENT
    }

    def __init__(self, domain_sold=None, *args, **kwargs):
        super(DomainSoldSpider, self).__init__(*args, **kwargs)
        self.domain_sold = domain_sold or Constants.DOMAIN_SOLD

    def start_requests(self):
        yield scrapy.Request(
            url=self.domain_sold,
            callback=self.parse,
            headers=self.headers
        )

    def parse(self, response):
        try:
            # Ensure the response body is correctly decoded and parsed
            json_resp = json.loads(response.body)

            # Access the nested keys correctly
            props = json_resp.get("props", {})

            # Filter dictionary using the list of strings
            listings_map = props.get("listingsMap", {})
            property_advs = {k: v for k,
                             v in listings_map.items() if len(k) == 10}

            for adv_id, adv in property_advs.items():
                loader = ItemLoader(item=DomainItem(), response=response)
                loader.add_value('short_address', adv.get(
                    'listingModel', {}).get('address', {}).get('street'))
                loader.add_value('latitude', adv.get(
                    'listingModel', {}).get('address', {}).get('lat'))
                loader.add_value('longtitude', adv.get(
                    'listingModel', {}).get('address', {}).get('lng'))

                loader.add_value('auction', adv.get(
                    'listingModel', {}).get('auction'))

                url_suf_path = adv.get('listingModel', {}).get('url')

                loader.add_value(
                    'data_id', url_suf_path[1:] if url_suf_path.startswith('/') else url_suf_path)
                loader.add_value('property_id', adv_id)
                loader.add_value(
                    'advert_web_link', f"{Constants.DOMAIN_BASE_URL}{url_suf_path}")

                item = loader.load_item()

                yield scrapy.Request(
                    url=item["advert_web_link"],
                    callback=self.parse_property_adv,
                    headers=self.headers,
                    meta={'item': item}
                )

            current_page = props["currentPage"]
            total_pages = props["totalPages"]
            if current_page < total_pages:
                yield scrapy.Request(
                    url=f'{self.domain_sold}&page={current_page + 1}',
                    callback=self.parse,
                    headers=self.headers
                )
        except json.JSONDecodeError as e:
            logging.error(f"JSON Decode Error: {e}")

    def parse_property_adv(self, response):
        try:
            # Ensure the response body is correctly decoded and parsed
            json_resp = json.loads(response.body)

            loader = ItemLoader(
                item=response.meta['item'], response=response)

            digital_data = json_resp.get("digitalData", {})
            if not digital_data:
                redirect = json_resp.get("redirect").get("destination")
                yield scrapy.Request(
                    url=f'{Constants.DOMAIN_BASE_URL}/{redirect}',
                    callback=self.parse_property_adv,
                    headers=self.headers,
                    meta={'item': response.meta['item']}
                )
            else:
                page_info = digital_data.get(
                    "page").get("pageInfo")

                loader.add_value('sale_date', page_info.get("issueDate"))
                loader.add_value('date_listed', page_info.get(
                    "property").get("dateListed"))
                loader.add_value('days_on_market', page_info.get(
                    "property").get("daysListed"))
                loader.add_value('address', page_info.get(
                    "property").get("address"))
                loader.add_value('bed', page_info.get(
                    "property").get("bedrooms"))
                loader.add_value('bath', page_info.get(
                    "property").get("bathrooms"))
                loader.add_value('car', page_info.get(
                    "property").get("parking"))
                loader.add_value('listing_agency', page_info.get(
                    "property").get("agency"))
                loader.add_value('photo_url', page_info.get(
                    "property").get("images"))
                loader.add_value('for_sale', "SOLD")
                loader.add_value('locality', page_info.get(
                    "property").get("suburb"))

                price = page_info.get("property").get("price")
                auction = response.meta['item'].get("auction")

                # Regular expression to match a price pattern
                price_pattern = re.compile(
                    r'\$\s?\d{1,3}(?:,\d{3})*(?:\+\s?\d{1,3}(?:,\d{3})*)*')

                loader.add_value('advertised_price', price)
                loader.add_value('price_description', (
                    "Auction" if not price_pattern.search(price) and auction
                    else "Not disclosed" if not price_pattern.search(price) and not auction
                    else None
                ))
                loader.add_value('find_price', None)

                props = json_resp.get("props")

                loader.add_value('street_name', props.get("street"))
                loader.add_value('color', props.get("projectColor"))
                loader.add_value('suburb', props.get("suburb"))
                loader.add_value('postcode', props.get("postcode"))
                loader.add_value('property_type', props.get("propertyType"))
                loader.add_value('size', props.get("rootGraphQuery", {}).get(
                    "listingByIdV2", {}).get("landAreaSqm"))

                displayable_address = props.get("rootGraphQuery", {}).get(
                    "listingByIdV2", {}).get("displayableAddress", {})
                loader.add_value('state', displayable_address.get("state"))

                sold_details = props.get("rootGraphQuery", {}).get(
                    "listingByIdV2", {}).get("soldDetails", {})
                if sold_details:
                    loader.add_value('sold_date', sold_details.get(
                        "soldDate", {}).get("isoDate"))
                    loader.add_value('sold_price', sold_details.get(
                        "soldPrice", {}).get("rawValues", {}).get("exactPrice"))

                # if soldPrice is null, continue find in priceDetails
                if not loader.get_output_value("sold_price"):
                    price_details = (
                        props.get("rootGraphQuery", {})
                        .get("listingByIdV2", {})
                        .get("priceDetails", {})
                    )
                    sold_price = price_details.get(
                        "rawValues", {}).get("exactPriceV2")

                    if not sold_price:
                        sold_price_from = price_details.get(
                            "rawValues", {}).get("from")
                        sold_price_to = price_details.get(
                            "rawValues", {}).get("to")
                        sold_price = (sold_price_from + sold_price_to) / 2

                    loader.add_value("sold_price", sold_price)

                yield loader.load_item()
        except json.JSONDecodeError as e:
            logging.error(f"Extract Detail Error: {e}")
