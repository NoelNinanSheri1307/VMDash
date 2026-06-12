from flask import Blueprint, request, jsonify, session as flask_session
from werkzeug.security import check_password_hash, generate_password_hash
import re
from db import SessionLocal
from models.user_role_table import UserRoles
from flask import current_app
from datetime import datetime, timedelta

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

def validate_password(password):
    """
    Validates password meets all constraints:
    - At least 8 characters
    - At least 4 letters
    - At least 1 number
    - At least 1 special character
    """
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    
    elif not re.search(r"[A-Za-z]{4,}", password):
        raise ValueError("At least 4 letters required")

    elif not re.search(r"\d", password):
        raise ValueError("Password must contain at least one number")

    elif not re.search(r"[!@#$%^&*(),./?<>|{}:;'-=+_]", password):
        raise ValueError("At least one special Character is required")


@auth_bp.route('/login', methods=['POST'])
def login():
    
    session = SessionLocal()#to connect MSQL
    
    try:
        data = request.get_json()
        staff_code = data.get('staff_code')
        password = data.get('password')
        
        if not staff_code or not password:
            return jsonify({"error": "Staff code and password are required"}), 400
        
        # Find user in database
        user = session.query(UserRoles).filter_by(staff_code1=staff_code).first()
        
        if not user:
            return jsonify({"error": "User does not exist"}), 401
        
        # Check password: compare entered password with hashed password in database
        if not check_password_hash(user.password_hash, password):
            return jsonify({"error": "Invalid password"}), 401
        
        # Set Flask session (server-side)
        flask_session['staff_code'] = user.staff_code1
        flask_session['role'] = user.role
        flask_session.permanent = True
        
        # Also store in memory as fallback (for /auth/check validation)
        if not hasattr(current_app, 'sessions_store'):
            current_app.sessions_store = {}
        current_app.sessions_store[user.staff_code1] = {
            'staff_code': user.staff_code1,
            'role': user.role,
            'expires_at': datetime.now() + current_app.config['PERMANENT_SESSION_LIFETIME']
        }
        
        # Login successful
        return jsonify({
            "message": "Login successful",
            "staff_code": user.staff_code1,
            "role": user.role
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    finally:
        session.close()


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """
    Process:
    1. Get staff_code, new_password, confirm_password from request
    2. Check if user exists
    3. Check if user role is 'admin' - if yes, DENY password change
    4. Validate new_password == confirm_password
    5. Validate password constraints (8 chars, 4 letters, 1 number, 1 special char)
    6. Hash new password using generate_password_hash()
    7. Store hashed password in database
    """
    session = SessionLocal()
    print("At the beginning")
    try:
        data = request.get_json()
        staff_code = data.get('staff_code')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')
        
        # if not staff_code or not new_password or not confirm_password:
        #     return jsonify({"error": "All fields are required"}), 400
        
        # Find user in database
        user = session.query(UserRoles).filter_by(staff_code1=staff_code).first()
        
        if not user:
            return jsonify({"error": "User does not exist"}), 401
    
        # if user.role == 'admin':
        #     return jsonify({"error": "Admin users cannot change their password"}), 403
 
        # try:
        #     validate_password(new_password)
        # except ValueError as e:
        #     return jsonify({"error": str(e)}), 400
        print("Before")
        hashed_password = generate_password_hash(new_password)
        print("After")
        
        # Update password hash in database
        user.password_hash = hashed_password
        session.commit()
        
        return jsonify({
            "message": "Password changed successfully",
            "staff_code": user.staff_code1
        }), 200
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    
    finally:
        session.close() #temporary "locks" on tables are released


@auth_bp.route('/check', methods=['GET'])
def get_current_user():
    if 'staff_code' in flask_session:
        return jsonify({
            "staff_code": flask_session.get('staff_code'),
            "role": flask_session.get('role')
        }), 200
    
    # Fallback: check in-memory store with expiration
    if hasattr(current_app, 'sessions_store'):
        for staff_code, user_data in list(current_app.sessions_store.items()):
            if user_data.get('expires_at') and datetime.now() < user_data['expires_at']:
                return jsonify({
                    'staff_code': user_data['staff_code'],
                    'role': user_data['role']
                }), 200
            else:
                # Expired, remove it
                current_app.sessions_store.pop(staff_code, None)
    
    return jsonify({"error": "Not authenticated"}), 401


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    Clear user session (logout).
    """
    flask_session.clear()
    
    # Also clear from fallback store
    if hasattr(current_app, 'sessions_store'):
        current_app.sessions_store.clear()
    
    return jsonify({"message": "Logged out successfully"}), 200


@auth_bp.route('/change-password', methods=['POST'])
def change_password():
    """
    Authenticated change password (post-login): allow all roles.
    Expects: staff_code, new_password, confirm_password
    """
    session = SessionLocal()
    try:
        data = request.get_json()
        staff_code = data.get('staff_code')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')

        if not staff_code or not new_password or not confirm_password:
            return jsonify({"error": "All fields are required"}), 400

        user = session.query(UserRoles).filter_by(staff_code1=staff_code).first()
        if not user:
            return jsonify({"error": "User does not exist"}), 401

        try:
            validate_password(new_password)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        hashed_password = generate_password_hash(new_password)
        user.password_hash = hashed_password
        session.commit()

        return jsonify({
            "message": "Password changed successfully",
            "staff_code": user.staff_code1,
            "role": user.role,
        }), 200

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        session.close()


@auth_bp.route('/add-user', methods=['POST'])
def add_user():
    """
    Admin endpoint to add new user with default password.
    Expects: staff_code, role
    Default password: vssc@isro<staff_code>
    """
    session = SessionLocal()
    try:
        data = request.get_json()
        staff_code = data.get('staff_code')
        role = data.get('role')

        if not staff_code or not role:
            return jsonify({"error": "Staff code and role are required"}), 400

        if role not in ['admin', 'manager', 'user']:
            return jsonify({"error": "Role must be 'admin', 'manager', or 'user'"}), 400

        # Check if user already exists
        existing_user = session.query(UserRoles).filter_by(staff_code1=staff_code).first()
        if existing_user:
            return jsonify({"error": f"User {staff_code} already exists"}), 409

        # Generate default password
        default_password = f"vssc@isro{staff_code}"
        hashed_password = generate_password_hash(default_password)

        # Create new user
        new_user = UserRoles(
            staff_code1=staff_code,
            role=role,
            password_hash=hashed_password
        )

        session.add(new_user)
        session.commit()

        return jsonify({
            "message": f"User {staff_code} created successfully",
            "staff_code": staff_code,
            "role": role,
            "default_password": default_password
        }), 201

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        session.close()