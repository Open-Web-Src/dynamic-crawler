import json
import logging
import re
import scrapy
from scrapy.loader import ItemLoader
from ..helpers.constants import Constants
from ..items import DomainItem


class DomainBuySpider(scrapy.Spider):
    name = "domain_buy"
    allowed_domains = ["www.domain.com.au"]
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7",
        "Cache-Control": "max-age=0",
        "User-Agent": Constants.USER_AGENT
    }

    def __init__(self, domain_buy=None, *args, **kwargs):
        super(DomainBuySpider, self).__init__(*args, **kwargs)
        self.domain_buy = domain_buy or Constants.DOMAIN_BUY

    def start_requests(self):
        yield scrapy.Request(
            url=self.domain_buy,
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
                    url=f'{self.domain_buy}&page={current_page + 1}',
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
                loader.add_value('for_sale', "FOR_SALE")
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

                item = loader.load_item()
                profile_slug = props.get("propertyProfileUrlSlug")
                yield scrapy.Request(
                    url=f'{Constants.DOMAIN_PROPERTY_PROFILE}/{profile_slug}',
                    callback=self.parse_property_profile,
                    headers=self.headers,
                    meta={'item': item}
                )
        except json.JSONDecodeError as e:
            logging.error(f"Extract Detail Error: {e}")

    def parse_property_profile(self, response):
        try:
            loader = ItemLoader(
                item=response.meta['item'], response=response)

            script_tag = response.xpath(
                "//script[@id='__NEXT_DATA__']/text()").get()
            json_resp = json.loads(script_tag)

            data = json_resp.get("props", {}).get("pageProps", {})
            status = data.get("statusCode", 200)
            if status != 404:
                address = "-".join(response.meta["item"].get(
                    "data_id").split("-")[:-1])
                formatted_string = f'propertyByPropertySlug({json.dumps({"propertySlug": address}, separators=(",", ":"))})'

                ref = data.get("__APOLLO_STATE__").get(
                    "ROOT_QUERY").get(formatted_string).get("__ref")

                valuation = data.get("__APOLLO_STATE__").get(
                    ref).get("valuation")

                lower_price = valuation.get("lowerPrice")
                mid_price = valuation.get("midPrice")
                upper_price = valuation.get("upperPrice")

            price_pattern = re.compile(
                r'\$\s?\d{1,3}(?:,\d{3})*(?:\+\s?\d{1,3}(?:,\d{3})*)*')

            matched_prices = price_pattern.findall(
                response.meta['item'].get("advertised_price"))
            cleaned_prices = [int(matched_price.replace('$', '').replace(
                ',', '').replace(' ', '')) for matched_price in matched_prices]

            if len(cleaned_prices) == 1 and not response.meta['item'].get("auction"):
                loader.add_value('find_price', cleaned_prices)
                loader.add_value('find_price_description', "Calculation")
            else:
                if mid_price:
                    loader.add_value('find_price', mid_price)
                    loader.add_value('find_price_description',
                                     "Mid Market Value")
                else:
                    loader.add_value('find_price', 0)
                    loader.add_value('find_price_description', "Not found")

            loader.add_value('lower_price', lower_price)
            loader.add_value('mid_price', mid_price)
            loader.add_value('upper_price', upper_price)

            yield loader.load_item()

        except json.JSONDecodeError as e:
            logging.error(f"JSON Decode Error: {e}")
