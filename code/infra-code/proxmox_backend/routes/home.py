data = request.get_json()
passwrod = data.password
hashed_paasword = set_password(passwrod)

session = SessionLocal()

new_user = UserRoles(staff_code = data.staff_code, role = data.role, password = hashed_paasword)
session.add(new_user)
session.commit()