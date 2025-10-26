import subprocess
import time
import requests
import openpyxl
from io import BytesIO

# Start the server
server = subprocess.Popen(["python", "wsgi.py"])
time.sleep(3)

# Create a test user
subprocess.run([
    "python",
    "create_or_reset_user.py",
    "--user",
    "test",
    "--last",
    "user",
    "--password",
    "password",
])

# Authenticate and get the session cookie
auth_response = requests.post(
    "http://127.0.0.1:5001/api/login",
    json={"user_id": "test", "password": "password"},
)
cookie = auth_response.cookies.get_dict()

# Create a test request
requests.post(
    "http://127.0.0.1:5001/api/solicitudes",
    json={
        "centro": "1500",
        "sector": "test",
        "justificacion": "test",
        "items": [
            {
                "codigo": "123",
                "descripcion": "test",
                "cantidad": 1,
                "precio_unitario": 10.0,
            }
        ],
    },
    cookies=cookie,
)

# Make the export request
export_response = requests.get(
    "http://127.0.0.1:5001/api/solicitudes/export/excel", cookies=cookie
)

# Verify the response
assert export_response.status_code == 200
assert (
    export_response.headers["Content-Type"]
    == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
)

# Load the workbook and verify its contents
workbook = openpyxl.load_workbook(BytesIO(export_response.content))
sheet = workbook.active
assert sheet["A1"].value == "ID"
assert sheet["B1"].value == "Centro"
assert sheet["C1"].value == "Sector"

# Kill the server
server.terminate()
