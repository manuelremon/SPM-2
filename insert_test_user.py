from src.backend.db import get_connection
from src.backend.security import hash_password

with get_connection() as con:
    con.execute(
        """
        INSERT INTO usuarios (id_spm, nombre, apellido, rol, contrasena)
        VALUES (?, ?, ?, ?, ?)
        """,
        ("1", "Admin", "User", "Admin", hash_password("a1")),
    )
    con.commit()
