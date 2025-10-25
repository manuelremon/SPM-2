# setup_dev_db.py
import os
from src.backend.init_db import build_db
from src.backend.db import get_connection
from src.backend.security import hash_password

print("Setting up the development database...")

# Ensure the data directory exists
data_dir = os.path.join(os.path.dirname(__file__), 'src', 'backend', 'data')
os.makedirs(data_dir, exist_ok=True)

# 1. Create database schema without loading all the CSV data
print("Step 1: Creating database schema...")
try:
    build_db(force=True, data=False)
    print("Schema created successfully.")
except Exception as e:
    print(f"Error creating schema: {e}")
    exit(1)

# 2. Insert the default admin user
print("Step 2: Inserting default admin user...")
try:
    with get_connection() as con:
        # Check if user already exists
        cursor = con.execute("SELECT id_spm FROM usuarios WHERE id_spm = ?", ("1",))
        if cursor.fetchone():
            print("Admin user '1' already exists.")
        else:
            con.execute(
                """
                INSERT INTO usuarios (id_spm, nombre, apellido, rol, contrasena)
                VALUES (?, ?, ?, ?, ?)
                """,
                ("1", "Admin", "User", "Admin", hash_password("a1")),
            )
            con.commit()
            print("Default admin user ('1' / 'a1') created successfully.")
except Exception as e:
    print(f"Error inserting admin user: {e}")
    exit(1)

print("\nDevelopment database setup complete!")
print("You can now start the server and log in with:")
print("  - User: 1")
print("  - Password: a1")
