
from getpass import getpass

from backend.database import SessionLocal
from backend.models import User
from backend.routers.auth import hash_password

db = SessionLocal()

try:
    admin = db.query(User).filter(
        User.role == "Admin"
    ).first()

    if not admin:
        print("Admin account not found.")
    else:
        print("Current Admin email:", admin.email)

        new_email = input(
            "Enter correct Admin email: "
        ).strip().lower()

        new_password = getpass(
            "Enter new Admin password: "
        )

        confirm_password = getpass(
            "Confirm new Admin password: "
        )

        if not new_email or "@" not in new_email or "." not in new_email:
            print("Please enter a valid email.")

        elif len(new_password) < 8:
            print("Password must contain at least 8 characters.")

        elif new_password != confirm_password:
            print("Passwords do not match.")

        else:
            existing = db.query(User).filter(
                User.email == new_email,
                User.user_id != admin.user_id
            ).first()

            if existing:
                print("This email is already used by another account.")

            else:
                admin.email = new_email
                admin.password_hash = hash_password(new_password)
                admin.is_approved = True
                admin.is_active = True

                db.commit()

                print("Admin email and password updated successfully!")

finally:
    db.close()
