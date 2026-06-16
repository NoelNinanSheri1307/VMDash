from flask import Blueprint, request, jsonify
from db import SessionLocal
from models.governance_models import Alert, Notification, VmRequest
from models.node_table import Node
from models.vm_table import Vm
from models.relation_tables import VmUserRelation
from proxmox.proxmox_client import get_proxmox_connection
from datetime import datetime, timedelta
from sqlalchemy import text

alerts_bp = Blueprint('alerts', __name__, url_prefix='/proxmox/alerts')

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
        session.flush()

        # Notification trigger: Alert Created
        admins_managers = get_admins_and_managers(session)
        for recipient in admins_managers:
            create_notification(
                session,
                recipient,
                "alert_created",
                f"New Alert: {title}",
                description,
                severity,
                resource_id
            )

def resolve_alert(session, resource_type, resource_id):
    existing = session.query(Alert).filter_by(
        resource_type=resource_type,
        resource_id=resource_id,
        status='active'
    ).first()
    if existing:
        existing.status = 'resolved'
        session.flush()

        # Notification trigger: Alert Resolved
        admins_managers = get_admins_and_managers(session)
        for recipient in admins_managers:
            create_notification(
                session,
                recipient,
                "alert_resolved",
                f"Alert Resolved: {existing.title}",
                f"The alert for {resource_type} '{resource_id}' has been resolved.",
                "info",
                resource_id
            )

@alerts_bp.route('', methods=['GET'])
def list_alerts():
    staff_code, role = get_user_context()
    if not staff_code:
        return jsonify({"error": "Unauthenticated"}), 401

    session = SessionLocal()
    try:
        alerts = session.query(Alert).order_by(Alert.created_at.desc()).all()
        result = []
        for a in alerts:
            result.append({
                "id": a.id,
                "severity": a.severity,
                "resource_type": a.resource_type,
                "resource_id": a.resource_id,
                "title": a.title,
                "description": a.description,
                "status": a.status,
                "created_at": a.created_at.strftime("%Y-%m-%d %H:%M:%S") if a.created_at else None,
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@alerts_bp.route('/<int:alert_id>/resolve', methods=['PUT'])
def resolve_alert_by_id(alert_id):
    staff_code, role = get_user_context()
    if not staff_code:
        return jsonify({"error": "Unauthenticated"}), 401

    if role not in ['admin', 'manager']:
        return jsonify({"error": "Unauthorized"}), 403

    session = SessionLocal()
    try:
        alert = session.query(Alert).filter_by(id=alert_id, status='active').first()
        if not alert:
            return jsonify({"error": "Active alert not found"}), 404

        alert.status = 'resolved'
        session.commit()
        return jsonify({"message": "Alert marked as resolved"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@alerts_bp.route('/refresh', methods=['POST'])
def refresh_alerts():
    staff_code, role = get_user_context()
    if not staff_code:
        return jsonify({"error": "Unauthenticated"}), 401

    session = SessionLocal()
    try:
        # --- 1. Node Offline Check ---
        nodes = session.query(Node).all()
        active_node_ids = set()
        for node in nodes:
            # We determine offline if live_status is false
            if not node.live_status:
                active_node_ids.add(node.node_name)
                create_or_keep_alert(
                    session,
                    "critical",
                    "node",
                    node.node_name,
                    f"Node Offline: {node.node_name}",
                    f"Node '{node.node_name}' in cluster '{node.cluster_name}' is currently reporting offline."
                )
        
        # Resolve any active node alerts for nodes that are online now
        active_node_alerts = session.query(Alert).filter_by(resource_type='node', status='active').all()
        for ala in active_node_alerts:
            if ala.resource_id not in active_node_ids:
                resolve_alert(session, 'node', ala.resource_id)

        # --- 2. Storage > 85% Check ---
        active_storage_ids = set()
        try:
            proxmox = get_proxmox_connection()
            for p_node in proxmox.nodes.get():
                node_name = p_node['node']
                for p_storage in proxmox.nodes(node_name).storage.get():
                    storage_name = p_storage['storage']
                    status = proxmox.nodes(node_name).storage(storage_name).status.get()
                    total = status.get('total', 0)
                    used = status.get('used', 0)
                    if total > 0:
                        pct = (used / total) * 100
                        res_id = f"{node_name}:{storage_name}"
                        if pct > 85.0:
                            active_storage_ids.add(res_id)
                            create_or_keep_alert(
                                session,
                                "critical" if pct > 95.0 else "warning",
                                "storage",
                                res_id,
                                f"Storage Warning: {storage_name} on {node_name} at {pct:.1f}%",
                                f"Storage pool '{storage_name}' on node '{node_name}' usage is currently at {pct:.1f}% ({used / (1024**3):.1f} GiB of {total / (1024**3):.1f} GiB)."
                            )
        except Exception as p_err:
            print(f"Error querying live storage from Proxmox: {p_err}")

        # Resolve storage alerts no longer over limit
        active_storage_alerts = session.query(Alert).filter_by(resource_type='storage', status='active').all()
        for ala in active_storage_alerts:
            if ala.resource_id not in active_storage_ids:
                resolve_alert(session, 'storage', ala.resource_id)

        # --- 3. Unassigned VM Check ---
        vms = session.query(Vm).filter(Vm.status != 'deleted').all()
        active_unassigned_vms = set()
        for vm in vms:
            # check relationship
            has_user = session.query(VmUserRelation).filter_by(uuid=vm.uuid).first()
            if not has_user:
                active_unassigned_vms.add(vm.uuid)
                create_or_keep_alert(
                    session,
                    "warning",
                    "vm",
                    vm.uuid,
                    f"Unassigned VM: {vm.vm_name}",
                    f"VM '{vm.vm_name}' (ID {vm.vm_id}, IP {vm.ip}) has no registered owners or focal points."
                )

        active_unassigned_alerts = session.query(Alert).filter_by(resource_type='vm', status='active').all()
        for ala in active_unassigned_alerts:
            if ala.resource_id not in active_unassigned_vms:
                resolve_alert(session, 'vm', ala.resource_id)

        # --- 4. Pending Requests > 7 days ---
        seven_days_ago = datetime.now() - timedelta(days=7)
        stale_requests = session.query(VmRequest).filter(
            VmRequest.request_status == 'pending',
            VmRequest.created_at < seven_days_ago
        ).all()
        active_stale_requests = set()
        for req in stale_requests:
            active_stale_requests.add(req.request_uuid)
            create_or_keep_alert(
                session,
                "warning",
                "request",
                req.request_uuid,
                f"Stale VM Request: {req.vm_name}",
                f"VM request for '{req.vm_name}' submitted by '{req.requested_by}' has been pending approval for more than 7 days (since {req.created_at.strftime('%Y-%m-%d')})."
            )

        active_stale_alerts = session.query(Alert).filter_by(resource_type='request', status='active').all()
        for ala in active_stale_alerts:
            if ala.resource_id not in active_stale_requests:
                resolve_alert(session, 'request', ala.resource_id)

        session.commit()
        return jsonify({"message": "Alert detection scan completed successfully."}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()
