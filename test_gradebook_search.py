import time
from playwright.sync_api import sync_playwright
import os

def main():
    os.makedirs("/home/jules/verification/videos", exist_ok=True)
    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos",
            viewport={'width': 1280, 'height': 800}
        )
        page = context.new_page()

        print("Navigating to app...")
        page.goto("http://localhost:5173/")
        page.wait_for_timeout(3000)

        page.screenshot(path="/home/jules/verification/screenshots/verification.png", full_page=True)
        print("Screenshot saved to /home/jules/verification/screenshots/verification.png")

        context.close()
        browser.close()

if __name__ == "__main__":
    main()
