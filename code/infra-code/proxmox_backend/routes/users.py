from flask import Blueprint, jsonify, request
from db import SessionLocal
from models.user_table import EmpDetails
# from proxmox.proxmox_client import get_proxmox_connection

users_bp = Blueprint('users', __name__, url_prefix = '/proxmox/users')


@users_bp.route("/search", methods = ["GET"])
def search_users():
    query = request.args.get("query", "").strip()

    if len(query) <= 2:
        return jsonify([])
    
    session = SessionLocal()

    results = session.query(EmpDetails).filter(EmpDetails.staff_code.like(f"{query}%")).limit(10).all()

    users = [
        {
            "staff_code": u.staff_code,
            "name": u.name,
            "entity": u.entity,
            "group": u.groupname,
            "division": u.division
        }
        for u in results
    ]

    return jsonify(users)


# @users_bp.route('/', methods = ['GET'])
# def users_info():
#     proxmox = get_proxmox_connection()
#     try:
#         users =  proxmox.access.users.get()
#         user_info = []

#         for user in users:
#             if '!' in user['userid']:
#                 continue
            
#             user_info.append({
#                 'userid': user.get('userid'),
#                 'enable': user.get('enable'),
#                 'expire': user.get('expire'),
#                 'name': user.get('name'),
#                 'email': user.get('email'),
#                 'comment': user.get('comment'),
#                 'groups': user.get('groups', []),
#                 'tokens': user.get('tokens', []),
#                 'realm-type': user.get('realm-type'),
#                 'last-logged-in': user.get('last-logged-in')
#             })

#         return jsonify(user_info)
    
#     except Exception as e:
#         return jsonify({"error ": str(e)}), 500