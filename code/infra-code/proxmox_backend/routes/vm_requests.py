from flask import Blueprint, request, jsonify
from db import SessionLocal
from models.governance_models import VmRequest, Notification
from datetime import datetime
import uuid
from sqlalchemy import text

vm_requests_bp = Blueprint('vm_requests', __name__, url_prefix='/proxmox/requests')

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

def create_notification(session, recipient, ntype, title, message, severity="info", related_resource=None):
    notif = Notification(
        recipient_staff_code=recipient,
        notification_type=ntype,
        title=title,
        message=message,
        severity=severity,
        related_resource=related_resource,
        is_read=0
    )
    session.add(notif)

def get_admins_and_managers(session):
    try:
        res = session.execute(text("SELECT staff_code1 FROM ccds_db.user_role WHERE role IN ('admin', 'manager')"))
        return [row[0] for row in res]
    except Exception as e:
        print(f"Error querying ccds_db.user_role: {e}")
        return []

@vm_requests_bp.route('', methods=['POST'])
def create_request():
    staff_code, role = get_user_context()
    if not staff_code:
        return jsonify({"error": "Unauthenticated"}), 401
    
    data = request.get_json() or {}
    vm_name = data.get('vmName') or data.get('vm_name')
    hostname = data.get('hostname')
    environment = data.get('environment', 'Proxmox')
    os_platform = data.get('os')
    cpu_cores = int(data.get('cores') or data.get('cpu_cores', 4))
    ram_gb = int(data.get('ram') or data.get('ram_gb', 16))
    disk_gb = int(data.get('disk') or data.get('disk_gb', 100))
    justification = data.get('justification')
    status = data.get('status', 'pending') # can be draft, pending

    if not vm_name or not hostname or not os_platform:
        return jsonify({"error": "VM Name, Hostname, and OS are required"}), 400

    session = SessionLocal()
    try:
        req_uuid = str(uuid.uuid4())
        req = VmRequest(
            request_uuid=req_uuid,
            requested_by=staff_code,
            vm_name=vm_name,
            hostname=hostname,
            environment=environment,
            os=os_platform,
            cpu_cores=cpu_cores,
            ram_gb=ram_gb,
            disk_gb=disk_gb,
            justification=justification,
            request_status=status
        )
        session.add(req)
        session.flush()

        # If submitted (pending), trigger notification
        if status == 'pending':
            # Notification trigger: VM Request Submitted
            # For Requester
            create_notification(
                session, 
                staff_code, 
                "request_submitted", 
                "VM Request Submitted", 
                f"Your request for VM '{vm_name}' ({cpu_cores} Cores, {ram_gb} GB RAM) has been submitted.",
                "info",
                req_uuid
            )

            # For Admins and Managers
            admins_managers = get_admins_and_managers(session)
            for recipient in admins_managers:
                if recipient != staff_code:
                    create_notification(
                        session, 
                        recipient, 
                        "request_submitted", 
                        "New VM Request Pending Approval", 
                        f"User {staff_code} requested VM '{vm_name}' ({cpu_cores} Cores, {ram_gb} GB RAM).",
                        "info",
                        req_uuid
                    )

        session.commit()
        return jsonify({
            "message": "VM request created successfully",
            "request_uuid": req_uuid,
            "status": status
        }), 201
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@vm_requests_bp.route('', methods=['GET'])
def list_requests():
    staff_code, role = get_user_context()
    if not staff_code:
        return jsonify({"error": "Unauthenticated"}), 401

    session = SessionLocal()
    try:
        if role in ['admin', 'manager']:
            requests = session.query(VmRequest).all()
        else:
            requests = session.query(VmRequest).filter_by(requested_by=staff_code).all()

        result = []
        for r in requests:
            result.append({
                "id": r.id,
                "request_uuid": r.request_uuid,
                "requested_by": r.requested_by,
                "vm_name": r.vm_name,
                "hostname": r.hostname,
                "environment": r.environment,
                "os": r.os,
                "cpu_cores": r.cpu_cores,
                "ram_gb": r.ram_gb,
                "disk_gb": r.disk_gb,
                "justification": r.justification,
                "request_status": r.request_status,
                "reviewer_staff_code": r.reviewer_staff_code,
                "reviewer_comments": r.reviewer_comments,
                "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else None,
                "updated_at": r.updated_at.strftime("%Y-%m-%d %H:%M:%S") if r.updated_at else None,
                "approved_at": r.approved_at.strftime("%Y-%m-%d %H:%M:%S") if r.approved_at else None,
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@vm_requests_bp.route('/<request_uuid>', methods=['GET'])
def get_request_detail(request_uuid):
    staff_code, role = get_user_context()
    if not staff_code:
        return jsonify({"error": "Unauthenticated"}), 401

    session = SessionLocal()
    try:
        r = session.query(VmRequest).filter_by(request_uuid=request_uuid).first()
        if not r:
            return jsonify({"error": "Request not found"}), 404

        if role not in ['admin', 'manager'] and r.requested_by != staff_code:
            return jsonify({"error": "Unauthorized"}), 403

        return jsonify({
            "id": r.id,
            "request_uuid": r.request_uuid,
            "requested_by": r.requested_by,
            "vm_name": r.vm_name,
            "hostname": r.hostname,
            "environment": r.environment,
            "os": r.os,
            "cpu_cores": r.cpu_cores,
            "ram_gb": r.ram_gb,
            "disk_gb": r.disk_gb,
            "justification": r.justification,
            "request_status": r.request_status,
            "reviewer_staff_code": r.reviewer_staff_code,
            "reviewer_comments": r.reviewer_comments,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else None,
            "updated_at": r.updated_at.strftime("%Y-%m-%d %H:%M:%S") if r.updated_at else None,
            "approved_at": r.approved_at.strftime("%Y-%m-%d %H:%M:%S") if r.approved_at else None,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@vm_requests_bp.route('/<request_uuid>/approve', methods=['POST'])
def approve_request(request_uuid):
    staff_code, role = get_user_context()
    if not staff_code:
        return jsonify({"error": "Unauthenticated"}), 401
    
    if role not in ['admin', 'manager']:
        return jsonify({"error": "Unauthorized. Admin or Manager access required"}), 403

    data = request.get_json() or {}
    comments = data.get('comments', '')

    session = SessionLocal()
    try:
        r = session.query(VmRequest).filter_by(request_uuid=request_uuid).first()
        if not r:
            return jsonify({"error": "Request not found"}), 404

        if r.request_status != 'pending':
            return jsonify({"error": f"Cannot approve request in '{r.request_status}' status"}), 400

        r.request_status = 'approved'
        r.reviewer_staff_code = staff_code
        r.reviewer_comments = comments
        r.approved_at = datetime.now()

        # Notification trigger: VM Request Approved
        create_notification(
            session,
            r.requested_by,
            "request_approved",
            "VM Request Approved",
            f"Your request for VM '{r.vm_name}' has been APPROVED by {staff_code}.",
            "info",
            request_uuid
        )

        # Also send a notification to reviewer
        create_notification(
            session,
            staff_code,
            "request_approved",
            "VM Request Approved Successfully",
            f"You approved VM request for '{r.vm_name}' (requested by {r.requested_by}).",
            "info",
            request_uuid
        )

        session.commit()
        return jsonify({"message": "Request approved successfully"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@vm_requests_bp.route('/<request_uuid>/reject', methods=['POST'])
def reject_request(request_uuid):
    staff_code, role = get_user_context()
    if not staff_code:
        return jsonify({"error": "Unauthenticated"}), 401
    
    if role not in ['admin', 'manager']:
        return jsonify({"error": "Unauthorized. Admin or Manager access required"}), 403

    data = request.get_json() or {}
    comments = data.get('comments', '')

    session = SessionLocal()
    try:
        r = session.query(VmRequest).filter_by(request_uuid=request_uuid).first()
        if not r:
            return jsonify({"error": "Request not found"}), 404

        if r.request_status != 'pending':
            return jsonify({"error": f"Cannot reject request in '{r.request_status}' status"}), 400

        r.request_status = 'rejected'
        r.reviewer_staff_code = staff_code
        r.reviewer_comments = comments

        # Notification trigger: VM Request Rejected
        create_notification(
            session,
            r.requested_by,
            "request_rejected",
            "VM Request Rejected",
            f"Your request for VM '{r.vm_name}' has been REJECTED by {staff_code}. Comments: {comments}",
            "warning",
            request_uuid
        )

        # Also send a notification to reviewer
        create_notification(
            session,
            staff_code,
            "request_rejected",
            "VM Request Rejected Successfully",
            f"You rejected VM request for '{r.vm_name}' (requested by {r.requested_by}).",
            "info",
            request_uuid
        )

        session.commit()
        return jsonify({"message": "Request rejected successfully"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()
