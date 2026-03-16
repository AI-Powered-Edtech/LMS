from playwright.sync_api import sync_playwright
import os

def test(page):
    page.goto("http://localhost:5173/creator")
    page.wait_for_load_state("networkidle")

    # Create dummy file
    with open("dummy.txt", "w") as f:
        f.write("This is a dummy test text for AI.")

    # In order to test we might need to bypass login if it exists, let's see what is rendered.
    page.screenshot(path="creator-upload.png")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    test(page)
    browser.close()
