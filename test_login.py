from playwright.sync_api import Page, expect

def test_login(page: Page):
    page.goto("http://127.0.0.1:5001")
    page.locator('#id').fill("1")
    page.locator('#pw').fill("a1")
    page.locator('#login').click()
    expect(page.locator(".home-hero")).to_be_visible()
