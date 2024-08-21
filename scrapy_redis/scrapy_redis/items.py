# Define here the models for your scraped items
#
# See documentation in:
# https://docs.scrapy.org/en/latest/topics/items.html

import scrapy
from scrapy.loader.processors import TakeFirst, Identity


class ScrapyRtItem(scrapy.Item):
    # define the fields for your item here like:
    # name = scrapy.Field()
    pass


class DomainItem(scrapy.Item):
    project_name = scrapy.Field(
        output_processor=TakeFirst()
    )
    short_address = scrapy.Field(
        output_processor=TakeFirst()
    )
    latitude = scrapy.Field(
        output_processor=TakeFirst()
    )
    longtitude = scrapy.Field(
        output_processor=TakeFirst()
    )
    size = scrapy.Field(
        output_processor=TakeFirst()
    )
    data_id = scrapy.Field(
        output_processor=TakeFirst()
    )
    property_id = scrapy.Field(
        output_processor=TakeFirst()
    )
    advert_web_link = scrapy.Field(
        output_processor=TakeFirst()
    )
    sale_date = scrapy.Field(
        output_processor=TakeFirst()
    )
    date_listed = scrapy.Field(
        output_processor=TakeFirst()
    )
    days_on_market = scrapy.Field(
        output_processor=TakeFirst()
    )
    address = scrapy.Field(
        output_processor=TakeFirst()
    )
    bed = scrapy.Field(
        output_processor=TakeFirst()
    )
    bath = scrapy.Field(
        output_processor=TakeFirst()
    )
    car = scrapy.Field(
        output_processor=TakeFirst()
    )
    listing_agency = scrapy.Field(
        output_processor=TakeFirst()
    )
    advertised_price = scrapy.Field(
        output_processor=TakeFirst()
    )
    photo_url = scrapy.Field(
        output_processor=Identity()
    )
    for_sale = scrapy.Field(
        output_processor=TakeFirst()
    )
    locality = scrapy.Field(
        output_processor=TakeFirst()
    )
    street_name = scrapy.Field(
        output_processor=TakeFirst()
    )
    color = scrapy.Field(
        output_processor=TakeFirst()
    )
    property_description = scrapy.Field(
        output_processor=Identity()
    )
    property_description_insight = scrapy.Field(
        output_processor=TakeFirst()
    )
    schools = scrapy.Field(
        output_processor=Identity()
    )
    neighborhood_insights = scrapy.Field(
        output_processor=TakeFirst()
    )
    inspection = scrapy.Field(
        output_processor=TakeFirst()
    )
    demographics = scrapy.Field(
        output_processor=TakeFirst()
    )
    sales_growth_list = scrapy.Field(
        output_processor=Identity()
    )
    profile_web_link = scrapy.Field(
        output_processor=TakeFirst()
    )
    estimate_range = scrapy.Field(
        output_processor=TakeFirst()
    )
    property_history = scrapy.Field(
        output_processor=Identity()
    )
    find_price = scrapy.Field(
        output_processor=TakeFirst()
    )
    find_price_description = scrapy.Field(
        output_processor=TakeFirst()
    )
    price_description = scrapy.Field(
        output_processor=TakeFirst()
    )
    auction = scrapy.Field(
        output_processor=TakeFirst()
    )
    suburb = scrapy.Field(
        output_processor=TakeFirst()
    )
    postcode = scrapy.Field(
        output_processor=TakeFirst()
    )
    property_type = scrapy.Field(
        output_processor=TakeFirst()
    )
    state = scrapy.Field(
        output_processor=TakeFirst()
    )
    sold_price = scrapy.Field(
        output_processor=TakeFirst()
    )
    sold_date = scrapy.Field(
        output_processor=TakeFirst()
    )

    lower_price = scrapy.Field(
        output_processor=TakeFirst()
    )
    mid_price = scrapy.Field(
        output_processor=TakeFirst()
    )
    upper_price = scrapy.Field(
        output_processor=TakeFirst()
    )
