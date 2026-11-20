
import sqlite3

conn = sqlite3.connect("renewable_energy.db")
cursor = conn.cursor()

columns = [
    row[1] for row in cursor.execute(
        "PRAGMA table_info(alerts)"
    ).fetchall()
]

if "is_read" not in columns:
    cursor.execute(
        "ALTER TABLE alerts ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT 0"
    )
    print("Added is_read column")

if "is_acknowledged" not in columns:
    cursor.execute(
        "ALTER TABLE alerts ADD COLUMN is_acknowledged BOOLEAN NOT NULL DEFAULT 0"
    )
    print("Added is_acknowledged column")

conn.commit()
conn.close()

print("Alert database update completed!")
