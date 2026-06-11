import re
from werkzeug.security import generate_password_hash, check_password_hash

def validate_password(password):
    if len(password) < 8 :
        raise ValueError("Password must be atleast 8 characters")
    elif not re.search(r"[A-Za-z]{4, }"):
        raise ValueError("At least 4 letters required")
    elif not re.search(r"\d", password):
        raise ValueError("At leadt one number")
    elif not re.search(r"[!@#$%^&*(),./?<>|{}:;'-=+_]", password):
        raise ValueError("At least one special Character is required")

def set_password(password):
    validate_password(password)
    password_hash=generate_password_hash(password)

    return password_hash

def check_password(self, password):
    return check_password_hash(self.password_hash, password)