
import re
from playwright.sync_api import Page, expect

def test_login(page: Page):
    page.goto("http://127.0.0.1:5000")
    page.get_by_label("Usuario (ID SPM o email)").click()
    page.get_by_label("Usuario (ID SPM o email)").fill("1")
    page.locator("#pw").click()
    page.locator("#pw").fill("a1")
    page.get_by_role("button", name="Ingresar").click()
    expect(page).to_have_url("http://127.0.0.1:5000/home.html")
    page.screenshot(path="jules-scratch/verification/home_page.png")
