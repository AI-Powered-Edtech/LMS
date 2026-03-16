from playwright.sync_api import sync_playwright

def verify(page):
    page.goto("http://localhost:5173/creator")
    page.wait_for_load_state("networkidle")

    # Take a screenshot of the initial creator page
    page.screenshot(path="creator-initial.png")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    verify(page)
    browser.close()
