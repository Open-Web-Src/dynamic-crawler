class Constants:
    """
    Constants related to all scraping websites

    Attributes:
        USER_AGENT (str): Default user agent string for web scraping headers.
    """

    USER_AGENT = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 "
                  "Safari/537.36")

    """
    Constants for domain.com.au URLs.

    Attributes:
        DOMAIN_BASE_URL (str): Base URL for domain.com.au.
        DOMAIN_BUY (str): URL for searching properties available for sale.
        DOMAIN_RENT (str): URL for searching properties available for rent.
        DOMAIN_SOLD (str): URL for viewing sold property listings.
        DOMAIN_PROPERTY_PROFILE (str): URL for property profiles.
        DOMAIN_SUBURB_PROFILE (str): URL for suburb profiles.
    """
    DOMAIN_BASE_URL = "https://www.domain.com.au"
    DOMAIN_BUY = (
        f"{DOMAIN_BASE_URL}/sale/?ptype=development-site,free-standing,new-land,"
        "vacant-land&excludeunderoffer=1&landsize=1000-any&landsizeunit=m2"
    )
    DOMAIN_RENT = (
        f"{DOMAIN_BASE_URL}/rent/?ptype=development-site,duplex,free-standing,"
        "new-home-designs,new-house-land,new-land,semi-detached,terrace,"
        "town-house,vacant-land,villa&landsize=100-any&landsizeunit=m2"
    )
    DOMAIN_SOLD = (
        f"{DOMAIN_BASE_URL}/sold-listings/?ptype=development-site,duplex,free-standing,"
        "new-land,town-house,vacant-land&excludepricewithheld=1&landsizeunit=m2"
    )
    DOMAIN_PROPERTY_PROFILE = f"{DOMAIN_BASE_URL}/property-profile"
    DOMAIN_SUBURB_PROFILE = f"{DOMAIN_BASE_URL}/suburb-profile"
