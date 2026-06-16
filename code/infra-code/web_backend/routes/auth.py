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
            
        if user.status == 'inactive':
            return jsonify({"error": "Account is deactivated. Please contact an administrator."}), 403
        
        # Check password: compare entered password with hashed password in database
        if not check_password_hash(user.password_hash, password):
            return jsonify({"error": "Invalid password"}), 401
        
        # Update last login timestamp
        user.last_login_at = datetime.now()
        session.commit()

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
        session.rollback()
        return jsonify({"error": str(e)}), 500
    
    finally:
        session.close()


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    session = SessionLocal()
    try:
        data = request.get_json() or {}
        staff_code = data.get('staff_code')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')
        
        if not staff_code or not new_password or not confirm_password:
            return jsonify({"error": "All fields are required"}), 400
            
        if new_password != confirm_password:
            return jsonify({"error": "Passwords do not match"}), 400

        try:
            validate_password(new_password)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        
        # Find user in database
        user = session.query(UserRoles).filter_by(staff_code1=staff_code).first()
        if not user:
            return jsonify({"error": "User does not exist"}), 401
            
        current_user_role = flask_session.get('role')
        if user.role in ['admin', 'manager']:
            if current_user_role != 'admin':
                return jsonify({"error": "Admin and Manager passwords can only be reset by an Administrator."}), 403

        if current_user_role != 'admin':
            # Perform identity verification via Employee details in DB
            from models.user_table import User
            emp = session.query(User).filter_by(staff_code=staff_code).first()
            if not emp:
                return jsonify({"error": "Identity verification failed. Employee record not found."}), 400
            
            verify_entity = data.get('entity')
            verify_division = data.get('division')
            if not verify_entity or not verify_division:
                return jsonify({"error": "Identity verification required. Please provide your Entity and Division."}), 400
                
            if emp.entity.lower() != verify_entity.lower() or emp.division.lower() != verify_division.lower():
                return jsonify({"error": "Verification failed. Entity or Division details are incorrect."}), 400

        hashed_password = generate_password_hash(new_password)
        user.password_hash = hashed_password
        session.commit()
        
        # Write notification to audit trail in proxmox_db
        try:
            from sqlalchemy import text
            session.execute(
                text("INSERT INTO proxmox_db.notifications (recipient_staff_code, notification_type, title, message, severity) "
                     "VALUES (:recipient, :ntype, :title, :msg, :sev)"),
                {
                    "recipient": staff_code,
                    "ntype": "password_reset",
                    "title": "Password Reset Notification",
                    "msg": "Your password has been successfully reset.",
                    "sev": "warning"
                }
            )
            session.commit()
        except Exception as e:
            current_app.logger.error(f"Failed to create notification: {e}")
            
        return jsonify({
            "message": "Password changed successfully",
            "staff_code": user.staff_code1
        }), 200
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    
    finally:
        session.close()


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


@auth_bp.route('/users', methods=['GET'])
def get_users():
    current_role = flask_session.get('role')
    if current_role not in ['admin', 'manager']:
        return jsonify({"error": "Unauthorized"}), 403
    
    session = SessionLocal()
    try:
        from models.emp_table import EmpDetails
        users = session.query(UserRoles).all()
        emp_map = {e.staff_code: e for e in session.query(EmpDetails).all()}
        
        result = []
        for u in users:
            emp = emp_map.get(u.staff_code1)
            result.append({
                "staff_code": u.staff_code1,
                "role": u.role,
                "status": u.status,
                "last_login_at": u.last_login_at.strftime("%Y-%m-%d %H:%M:%S") if u.last_login_at else None,
                "created_at": u.created_at.strftime("%Y-%m-%d %H:%M:%S") if u.created_at else None,
                "name": emp.name if emp else "Unknown",
                "division": emp.division if emp else "—",
                "groupname": emp.groupname if emp else "—",
                "entity": emp.entity if emp else "—"
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@auth_bp.route('/users/<staff_code>', methods=['GET'])
def get_user_detail(staff_code):
    current_role = flask_session.get('role')
    if current_role not in ['admin', 'manager']:
        return jsonify({"error": "Unauthorized"}), 403
        
    session = SessionLocal()
    try:
        from models.emp_table import EmpDetails
        u = session.query(UserRoles).filter_by(staff_code1=staff_code).first()
        if not u:
            return jsonify({"error": "User not found"}), 404
        emp = session.query(EmpDetails).filter_by(staff_code=staff_code).first()
        return jsonify({
            "staff_code": u.staff_code1,
            "role": u.role,
            "status": u.status,
            "last_login_at": u.last_login_at.strftime("%Y-%m-%d %H:%M:%S") if u.last_login_at else None,
            "created_at": u.created_at.strftime("%Y-%m-%d %H:%M:%S") if u.created_at else None,
            "name": emp.name if emp else "Unknown",
            "division": emp.division if emp else "—",
            "groupname": emp.groupname if emp else "—",
            "entity": emp.entity if emp else "—"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@auth_bp.route('/users/<staff_code>', methods=['PUT'])
def update_user(staff_code):
    current_role = flask_session.get('role')
    if current_role != 'admin':
        return jsonify({"error": "Unauthorized. Admin access required."}), 403
        
    session = SessionLocal()
    try:
        data = request.get_json() or {}
        u = session.query(UserRoles).filter_by(staff_code1=staff_code).first()
        if not u:
            return jsonify({"error": "User not found"}), 404
            
        new_role = data.get('role')
        if new_role and new_role in ['admin', 'manager', 'user']:
            u.role = new_role
            
        new_status = data.get('status')
        if new_status and new_status in ['active', 'inactive']:
            u.status = new_status
            
        session.commit()
        return jsonify({"message": "User updated successfully"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@auth_bp.route('/users/reset-password', methods=['POST'])
def admin_reset_password():
    current_role = flask_session.get('role')
    if current_role != 'admin':
        return jsonify({"error": "Unauthorized. Admin access required."}), 403
        
    session = SessionLocal()
    try:
        data = request.get_json() or {}
        staff_code = data.get('staff_code')
        new_password = data.get('new_password')
        
        if not staff_code or not new_password:
            return jsonify({"error": "Staff code and new password are required"}), 400
            
        try:
            validate_password(new_password)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
            
        u = session.query(UserRoles).filter_by(staff_code1=staff_code).first()
        if not u:
            return jsonify({"error": "User not found"}), 404
            
        u.password_hash = generate_password_hash(new_password)
        session.commit()
        
        try:
            from sqlalchemy import text
            session.execute(
                text("INSERT INTO proxmox_db.notifications (recipient_staff_code, notification_type, title, message, severity) "
                     "VALUES (:recipient, :ntype, :title, :msg, :sev)"),
                {
                    "recipient": staff_code,
                    "ntype": "password_reset",
                    "title": "Password Reset",
                    "msg": "Your password has been reset by an administrator.",
                    "sev": "warning"
                }
            )
            session.commit()
        except Exception as e:
            current_app.logger.error(f"Failed to create notification: {e}")
            
        return jsonify({"message": "Password reset successful"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@auth_bp.route('/users/change-role', methods=['POST'])
def admin_change_role():
    current_role = flask_session.get('role')
    if current_role != 'admin':
        return jsonify({"error": "Unauthorized. Admin access required."}), 403
        
    session = SessionLocal()
    try:
        data = request.get_json() or {}
        staff_code = data.get('staff_code')
        new_role = data.get('role')
        
        if not staff_code or not new_role or new_role not in ['admin', 'manager', 'user']:
            return jsonify({"error": "Staff code and valid role (admin/manager/user) are required"}), 400
            
        u = session.query(UserRoles).filter_by(staff_code1=staff_code).first()
        if not u:
            return jsonify({"error": "User not found"}), 404
            
        u.role = new_role
        session.commit()
        
        try:
            from sqlalchemy import text
            session.execute(
                text("INSERT INTO proxmox_db.notifications (recipient_staff_code, notification_type, title, message, severity) "
                     "VALUES (:recipient, :ntype, :title, :msg, :sev)"),
                {
                    "recipient": staff_code,
                    "ntype": "role_changed",
                    "title": "Role Updated",
                    "msg": f"Your role has been updated to '{new_role}' by an administrator.",
                    "sev": "info"
                }
            )
            session.commit()
        except Exception as e:
            current_app.logger.error(f"Failed to create notification: {e}")
            
        return jsonify({"message": "Role changed successfully"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@auth_bp.route('/users/toggle-status', methods=['POST'])
def admin_toggle_status():
    current_role = flask_session.get('role')
    if current_role != 'admin':
        return jsonify({"error": "Unauthorized. Admin access required."}), 403
        
    session = SessionLocal()
    try:
        data = request.get_json() or {}
        staff_code = data.get('staff_code')
        
        if not staff_code:
            return jsonify({"error": "Staff code is required"}), 400
            
        u = session.query(UserRoles).filter_by(staff_code1=staff_code).first()
        if not u:
            return jsonify({"error": "User not found"}), 404
            
        current_user_staff = flask_session.get('staff_code')
        if u.staff_code1 == current_user_staff:
            return jsonify({"error": "You cannot activate or deactivate your own account"}), 400
            
        new_status = 'inactive' if u.status == 'active' else 'active'
        u.status = new_status
        session.commit()
        
        try:
            from sqlalchemy import text
            session.execute(
                text("INSERT INTO proxmox_db.notifications (recipient_staff_code, notification_type, title, message, severity) "
                     "VALUES (:recipient, :ntype, :title, :msg, :sev)"),
                {
                    "recipient": staff_code,
                    "ntype": "account_status",
                    "title": "Account Status Updated",
                    "msg": f"Your account has been {'activated' if new_status == 'active' else 'deactivated'} by an administrator.",
                    "sev": "warning"
                }
            )
            session.commit()
        except Exception as e:
            current_app.logger.error(f"Failed to create notification: {e}")
            
        return jsonify({"message": f"Account status updated to {new_status}"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@auth_bp.route('/profile', methods=['GET'])
def get_profile():
    if 'staff_code' in flask_session:
        staff_code = flask_session.get('staff_code')
    else:
        # Fallback: check in-memory store with expiration
        staff_code = None
        if hasattr(current_app, 'sessions_store'):
            for sc, user_data in list(current_app.sessions_store.items()):
                if user_data.get('expires_at') and datetime.now() < user_data['expires_at']:
                    staff_code = sc
                    break
        if not staff_code:
            return jsonify({"error": "Not authenticated"}), 401
        
    session = SessionLocal()
    try:
        from models.user_table import User
        from models.emp_table import EmpDetails
        
        # Find in UserRoles
        u = session.query(UserRoles).filter_by(staff_code1=staff_code).first()
        if not u:
            return jsonify({"error": "User not found"}), 404
            
        # Try to find in User table
        user_data = session.query(User).filter_by(staff_code=staff_code).first()
        # Also check EmpDetails
        emp_data = session.query(EmpDetails).filter_by(staff_code=staff_code).first()
        
        # Get fields, prioritize User table then EmpDetails
        name = (user_data.name if user_data else None) or (emp_data.name if emp_data else "Unknown")
        entity = (user_data.entity if user_data else None) or (emp_data.entity if emp_data else "—")
        groupname = (user_data.groupname if user_data else None) or (emp_data.groupname if emp_data else "—")
        division = (user_data.division if user_data else None) or (emp_data.division if emp_data else "—")
        center = (user_data.center if user_data else "—")
        section = (user_data.section if user_data else "—")
        
        # Let's also see what VMs this user owns!
        # user_data.vms has the relationship! Let's get the list of VMs owned by this user
        vms = []
        if user_data and user_data.vms:
            for vm in user_data.vms:
                vms.append({
                    "vm_name": vm.vm_name,
                    "host_name": vm.host_name,
                    "environment": vm.environment,
                    "cluster": vm.cluster,
                    "ram": vm.ram,
                    "cores": vm.cores,
                    "ip": vm.ip,
                    "mac": vm.mac,
                    "os": vm.os,
                    "disk_size": vm.disk_size,
                    "source": vm.source,
                    "narc": vm.narc,
                    "time_created": vm.time_created,
                    "gpu": vm.gpu,
                    "request_source": vm.request_source
                })
        
        return jsonify({
            "staff_code": u.staff_code1,
            "role": u.role,
            "status": u.status,
            "last_login_at": u.last_login_at.strftime("%Y-%m-%d %H:%M:%S") if u.last_login_at else None,
            "created_at": u.created_at.strftime("%Y-%m-%d %H:%M:%S") if u.created_at else None,
            "name": name,
            "center": center,
            "entity": entity,
            "groupname": groupname,
            "division": division,
            "section": section,
            "vms": vms
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()