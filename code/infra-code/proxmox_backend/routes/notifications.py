from flask import Blueprint, request, jsonify
from db import SessionLocal
from models.governance_models import Notification
from datetime import datetime

notifications_bp = Blueprint('notifications', __name__, url_prefix='/proxmox/notifications')

def get_user_context():
    staff_code = request.headers.get("X-User-Staff-Code")
    role = request.headers.get("X-User-Role")
    if not staff_code or not role:
        try:
            data = request.get_json(silent=True) or {}
            if not staff_code:
                staff_code = data.get("staff_code")
            if not role:
                role = data.get("role")
        except:
            pass
    if not staff_code:
        staff_code = request.args.get("staff_code")
    if not role:
        role = request.args.get("role")
    return staff_code, role

@notifications_bp.route('', methods=['GET'])
def list_notifications():
    staff_code, role = get_user_context()
    if not staff_code:
        return jsonify({"error": "Unauthenticated"}), 401

    session = SessionLocal()
    try:
        notifs = session.query(Notification).filter_by(recipient_staff_code=staff_code).order_by(Notification.created_at.desc()).all()
        result = []
        for n in notifs:
            result.append({
                "id": n.id,
                "recipient_staff_code": n.recipient_staff_code,
                "notification_type": n.notification_type,
                "title": n.title,
                "message": n.message,
                "severity": n.severity,
                "is_read": n.is_read,
                "related_resource": n.related_resource,
                "created_at": n.created_at.strftime("%Y-%m-%d %H:%M:%S") if n.created_at else None,
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@notifications_bp.route('/read-all', methods=['PUT'])
def mark_all_read():
    staff_code, role = get_user_context()
    if not staff_code:
        return jsonify({"error": "Unauthenticated"}), 401

    session = SessionLocal()
    try:
        session.query(Notification).filter_by(recipient_staff_code=staff_code, is_read=0).update({"is_read": 1})
        session.commit()
        return jsonify({"message": "All notifications marked as read"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@notifications_bp.route('/<int:notification_id>/read', methods=['PUT'])
def mark_read(notification_id):
    staff_code, role = get_user_context()
    if not staff_code:
        return jsonify({"error": "Unauthenticated"}), 401

    session = SessionLocal()
    try:
        notif = session.query(Notification).filter_by(id=notification_id, recipient_staff_code=staff_code).first()
        if not notif:
            return jsonify({"error": "Notification not found"}), 404

        notif.is_read = 1
        session.commit()
        return jsonify({"message": "Notification marked as read"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()
