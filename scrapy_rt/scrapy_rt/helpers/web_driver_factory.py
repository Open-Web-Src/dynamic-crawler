import logging
import time
from selenium import webdriver
from selenium.webdriver.firefox.options import Options


class WebDriverFactory:
    """
    Factory class to create and manage Selenium WebDriver instances.
    """

    def __init__(self, max_retries=3, base_delay=5):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.driver = None

    def set_firefox_options(self) -> Options:
        """Sets firefox options for Selenium.
        Firefox options for headless browser is enabled.
        """
        firefox_options = Options()
        firefox_options.add_argument("--headless")
        firefox_options.add_argument("--disable-gpu")
        firefox_options.add_argument("--no-sandbox")
        firefox_options.add_argument("--disable-dev-shm-usage")
        firefox_options.add_argument("--disable-notifications")
        firefox_options.add_argument("--disable-infobars")
        firefox_options.add_argument("--mute-audio")
        firefox_options.add_argument('--ignore-certificate-errors')
        firefox_options.add_argument('--allow-insecure-localhost')
        firefox_options.add_argument('--disable-software-rasterizer')
        firefox_options.add_argument(
            '--disable-blink-features=AutomationControlled')

        firefox_options.set_preference(
            "network.stricttransportsecurity.preloadlist", False)
        firefox_options.set_preference(
            "security.cert_pinning.enforcement_level", 0)
        firefox_options.set_preference(
            "security.enterprise_roots.enabled", True)
        firefox_options.set_preference(
            "webdriver_accept_untrusted_certs", True)
        firefox_options.set_preference(
            "webdriver_assume_untrusted_issuer", True)
        firefox_options.set_preference("browser.tabs.remote.autostart", False)

        profile = webdriver.FirefoxProfile()
        profile.set_preference("general.useragent.override",
                               "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36")
        profile.set_preference("intl.accept_languages",
                               "en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7")
        profile.set_preference(
            "network.http.accept-encoding", "gzip, deflate, br, zstd")
        profile.set_preference("network.http.sendRefererHeader", 2)
        profile.set_preference("network.http.referer.spoofSource", True)
        firefox_options.profile = profile

        return firefox_options

    def get_webdriver(self):
        """
        Context manager to handle WebDriver setup and teardown.

        Yields:
            webdriver.Remote: The configured Selenium WebDriver instance.
        """
        attempt = 0
        while attempt < self.max_retries:
            try:
                options = self.set_firefox_options()
                driver = webdriver.Remote(
                    command_executor='http://selenium.app.local:4444/wd/hub',
                    options=options,
                )

                driver.set_page_load_timeout(60)
                driver.maximize_window()

                return driver

            except Exception as e:
                logging.exception(
                    f"An error occurred while setting up the WebDriver: {e}")
                if driver:
                    driver.quit()
                    attempt += 1
                    delay = self.base_delay ** attempt
                    logging.info(f"Retrying in {delay} seconds...")
                    time.sleep(delay)
                else:
                    raise Exception(
                        "Failed to setup WebDriver after multiple attempts")
