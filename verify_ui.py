from playwright.sync_api import sync_playwright

def verify_ui(page):
    page.goto("http://localhost:5173/")
    # Wait for the page to load, there might be a login screen or similar. Let's just wait a bit and take a screenshot of whatever is there, ideally finding an input or select field.
    page.wait_for_timeout(2000)
    page.screenshot(path="verification_ui.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_ui(page)
        finally:
            browser.close()
