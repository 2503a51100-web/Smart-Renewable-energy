
import sqlite3

DATABASE = "renewable_energy.db"

connection = sqlite3.connect(DATABASE)
cursor = connection.cursor()

cursor.execute("PRAGMA table_info(users)")
existing_columns = {
    column[1] for column in cursor.fetchall()
}

new_columns = {
    "role": "VARCHAR(20) NOT NULL DEFAULT 'Viewer'",
    "is_approved": "BOOLEAN NOT NULL DEFAULT 0",
    "is_active": "BOOLEAN NOT NULL DEFAULT 1",
    "created_at": "DATETIME",
    "last_login": "DATETIME"
}

if not existing_columns:
    print("Users table not found. Check your database location.")
else:
    for column, definition in new_columns.items():
        if column not in existing_columns:
            cursor.execute(
                f"ALTER TABLE users ADD COLUMN {column} {definition}"
            )
            print(f"Added column: {column}")

    connection.commit()
    print("Database migration completed successfully!")

connection.close()
