from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    try:
        page.goto("http://localhost:3000/")

        # Llenar formulario de Crear Solicitud
        page.wait_for_selector('div[aria-haspopup="listbox"]')
        page.click('div[aria-haspopup="listbox"]')
        page.click('li[data-value="1008"]') # Seleccionar un centro de ejemplo
        page.click('button:has-text("Continuar")')

        # Esperar a la página de Agregar Materiales
        page.wait_for_selector('h1:has-text("Agregar Materiales")')

        # Buscar un material
        page.fill('input[label="Buscar material por código o descripción"]', 'bulon')
        page.click('button:has-text("Buscar")')

        # Esperar resultados y añadir al carrito
        page.wait_for_selector('table >> text=bulon')
        page.click('button[aria-label="add to shopping cart"]')

        # Verificar que el material está en el carrito
        page.wait_for_selector('div[role="table"] >> text=bulon')

        # Tomar captura de pantalla
        page.screenshot(path="jules-scratch/verification/flow_verification.png")
        print("Captura de pantalla guardada en jules-scratch/verification/flow_verification.png")

    except Exception as e:
        print(f"Error durante la verificación: {e}")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
