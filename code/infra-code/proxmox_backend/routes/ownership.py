from flask import Blueprint, request, jsonify
from db import SessionLocal
from models.vm_table import Vm
from models.relation_tables import VmUserRelation
from models.governance_models import Notification, Alert
from models.user_table import EmpDetails
from datetime import datetime
from sqlalchemy import text, and_

ownership_bp = Blueprint('ownership', __name__, url_prefix='/proxmox/ownership')

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

def create_or_keep_alert(session, severity, resource_type, resource_id, title, description):
    existing = session.query(Alert).filter_by(
        resource_type=resource_type,
        resource_id=resource_id,
        status='active'
    ).first()
    if not existing:
        new_alert = Alert(
            severity=severity,
            resource_type=resource_type,
            resource_id=resource_id,
            title=title,
            description=description,
            status='active'
        )
        session.add(new_alert)

def resolve_alert(session, resource_type, resource_id):
    existing = session.query(Alert).filter_by(
        resource_type=resource_type,
        resource_id=resource_id,
        status='active'
    ).first()
    if existing:
        existing.status = 'resolved'

@ownership_bp.route('/unassigned', methods=['GET'])
def get_unassigned():
    staff_code, role = get_user_context()
    if not staff_code:
        return jsonify({"error": "Unauthenticated"}), 401

    session = SessionLocal()
    try:
        # Fetch VMs that do not have any relations in VmUserRelation
        subq = session.query(VmUserRelation.uuid).subquery()
        unassigned_vms = session.query(Vm).filter(
            Vm.status != 'deleted',
            ~Vm.uuid.in_(subq)
        ).all()

        result = []
        for vm in unassigned_vms:
            result.append({
                "vm_uuid": vm.uuid,
                "vm_name": vm.vm_name,
                "vm_id": vm.vm_id,
                "cpus": vm.cpus,
                "max_memory": vm.max_memory,
                "max_disk": vm.max_disk,
                "os": vm.os,
                "ip": vm.ip,
                "status": vm.status
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@ownership_bp.route('/assigned', methods=['GET'])
def get_assigned():
    staff_code, role = get_user_context()
    if not staff_code:
        return jsonify({"error": "Unauthenticated"}), 401

    session = SessionLocal()
    try:
        # Query VMs that have owner assignments
        assigned_vms = session.query(Vm).join(
            VmUserRelation, Vm.uuid == VmUserRelation.uuid
        ).filter(Vm.status != 'deleted').distinct().all()

        result = []
        for vm in assigned_vms:
            owners = []
            owner_relations = session.query(VmUserRelation).filter_by(uuid=vm.uuid).all()
            for r in owner_relations:
                emp = session.query(EmpDetails).filter_by(staff_code=r.staff_code).first()
                owners.append({
                    "staff_code": r.staff_code,
                    "name": emp.name if emp else "Unknown",
                    "division": emp.division if emp else "—",
                    "entity": emp.entity if emp else "—",
                    "assigned_at": r.initial_at.strftime("%Y-%m-%d %H:%M:%S") if r.initial_at else None
                })

            result.append({
                "vm_uuid": vm.uuid,
                "vm_name": vm.vm_name,
                "vm_id": vm.vm_id,
                "cpus": vm.cpus,
                "max_memory": vm.max_memory,
                "max_disk": vm.max_disk,
                "os": vm.os,
                "ip": vm.ip,
                "status": vm.status,
                "owners": owners
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@ownership_bp.route('/assign', methods=['POST'])
def assign_owner():
    staff_code, role = get_user_context()
    if not staff_code:
        return jsonify({"error": "Unauthenticated"}), 401

    if role not in ['admin', 'manager']:
        return jsonify({"error": "Unauthorized. Admin or Manager access required"}), 403

    data = request.get_json() or {}
    vm_uuid = data.get('uuid') or data.get('vm_uuid')
    owner_staff_code = data.get('staff_code')

    if not vm_uuid or not owner_staff_code:
        return jsonify({"error": "VM UUID and owner staff code are required"}), 400

    session = SessionLocal()
    try:
        # Check VM exists
        vm = session.query(Vm).filter_by(uuid=vm_uuid).first()
        if not vm:
            return jsonify({"error": "VM not found"}), 404

        # Check target user exists in empdetails
        emp = session.query(EmpDetails).filter_by(staff_code=owner_staff_code).first()
        if not emp:
            return jsonify({"error": "Employee record not found"}), 404

        # Check if relation already exists
        existing = session.query(VmUserRelation).filter_by(uuid=vm_uuid, staff_code=owner_staff_code).first()
        if existing:
            return jsonify({"error": "Ownership relation already exists"}), 409

        # Transactionally write to proxmox_db.vm_user_relation AND ccds_db.vm_users
        rel = VmUserRelation(uuid=vm_uuid, staff_code=owner_staff_code, initial_at=datetime.now())
        session.add(rel)

        # Sync with ccds_db.vm_users
        session.execute(
            text("INSERT IGNORE INTO ccds_db.vm_users (vm_name, staff_code) VALUES (:vm_name, :staff_code)"),
            {"vm_name": vm.vm_name, "staff_code": owner_staff_code}
        )

        # Notification: VM Ownership Assigned
        create_notification(
            session,
            owner_staff_code,
            "ownership_assigned",
            "VM Ownership Assigned",
            f"You have been assigned as an owner of VM '{vm.vm_name}'.",
            "info",
            vm_uuid
        )

        # Resolve Unassigned VM Alert if it exists
        resolve_alert(session, 'vm', vm_uuid)

        session.commit()
        return jsonify({"message": "VM owner assigned successfully"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@ownership_bp.route('/assign', methods=['DELETE'])
def remove_owner():
    staff_code, role = get_user_context()
    if not staff_code:
        return jsonify({"error": "Unauthenticated"}), 401

    if role not in ['admin', 'manager']:
        return jsonify({"error": "Unauthorized. Admin or Manager access required"}), 403

    # Support reading from JSON or query params
    if request.is_json:
        data = request.get_json() or {}
        vm_uuid = data.get('uuid') or data.get('vm_uuid')
        owner_staff_code = data.get('staff_code')
    else:
        vm_uuid = request.args.get('uuid') or request.args.get('vm_uuid')
        owner_staff_code = request.args.get('staff_code')

    if not vm_uuid or not owner_staff_code:
        return jsonify({"error": "VM UUID and owner staff code are required"}), 400

    session = SessionLocal()
    try:
        # Check VM exists
        vm = session.query(Vm).filter_by(uuid=vm_uuid).first()
        if not vm:
            return jsonify({"error": "VM not found"}), 404

        # Remove from proxmox_db.vm_user_relation
        session.query(VmUserRelation).filter_by(uuid=vm_uuid, staff_code=owner_staff_code).delete()

        # Remove from ccds_db.vm_users
        session.execute(
            text("DELETE FROM ccds_db.vm_users WHERE vm_name = :vm_name AND staff_code = :staff_code"),
            {"vm_name": vm.vm_name, "staff_code": owner_staff_code}
        )

        # Notification: VM Ownership Removed
        create_notification(
            session,
            owner_staff_code,
            "ownership_removed",
            "VM Ownership Removed",
            f"You have been removed as an owner of VM '{vm.vm_name}'.",
            "warning",
            vm_uuid
        )

        # Check if the VM is now unassigned
        remaining_owners = session.query(VmUserRelation).filter_by(uuid=vm_uuid).count()
        if remaining_owners == 0:
            create_or_keep_alert(
                session,
                "warning",
                "vm",
                vm_uuid,
                f"Unassigned VM: {vm.vm_name}",
                f"VM '{vm.vm_name}' (ID {vm.vm_id}, IP {vm.ip}) has no registered owners or focal points."
            )

        session.commit()
        return jsonify({"message": "VM owner removed successfully"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()
