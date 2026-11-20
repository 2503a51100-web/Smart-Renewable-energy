
import getpass

from backend.database import SessionLocal
from backend.models import User
from backend.routers.auth import hash_password

db = SessionLocal()

try:
    existing_admin = db.query(User).filter(
        User.role == "Admin"
    ).first()

    if existing_admin:
        print("An Admin account already exists.")
    else:
        username = input("Enter Admin name: ").strip()
        email = input("Enter Admin email: ").strip().lower()
        password = getpass.getpass("Enter Admin password: ")

        if not username or not email or "@" not in email:
            print("Please enter a valid name and email.")
        elif len(password) < 8:
            print("Password must contain at least 8 characters.")
        elif db.query(User).filter(User.email == email).first():
            print("This email is already registered.")
        else:
            admin = User(
                username=username,
                email=email,
                password_hash=hash_password(password),
                role="Admin",
                is_approved=True,
                is_active=True
            )

            db.add(admin)
            db.commit()

            print("Admin account created successfully!")

finally:
    db.close()

