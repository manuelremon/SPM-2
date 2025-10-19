import subprocess
import time
import requests

# Start the server in a subprocess
server = subprocess.Popen(["python", "-m", "src.backend.app"])

# Wait for the server to start
time.sleep(2)

# Make the request
response = requests.get("http://127.0.0.1:5001/api/almacenes?centro=1500")

print(f"Status: {response.status_code}")
print(f"Text: {response.text}")
try:
    print(f"JSON: {response.json()}")
except Exception as e:
    print(f"Not JSON: {e}")

# Kill the server
server.terminate()
