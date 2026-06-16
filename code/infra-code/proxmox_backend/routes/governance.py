from flask import Blueprint, jsonify, request
from db import SessionLocal
from models.governance_models import VmRequest, Notification, Alert
from models.vm_table import Vm
from models.relation_tables import VmUserRelation
from models.cluster_table import Cluster
from sqlalchemy import text
from datetime import datetime

governance_bp = Blueprint('governance', __name__, url_prefix='/proxmox/governance')

def get_user_context():
    staff_code = request.headers.get("X-User-Staff-Code")
    role = request.headers.get("X-User-Role")
    return staff_code, role

@governance_bp.route('/kpis', methods=['GET'])
def get_kpis():
    staff_code, role = get_user_context()
    if not staff_code:
        return jsonify({"error": "Unauthenticated"}), 401
    
    if role not in ['admin', 'manager']:
        return jsonify({"error": "Unauthorized"}), 403

    session = SessionLocal()
    try:
        # 1. Request Approval Rate %
        approved = session.query(VmRequest).filter_by(request_status='approved').count()
        rejected = session.query(VmRequest).filter_by(request_status='rejected').count()
        total_decided = approved + rejected
        approval_rate = round((approved / total_decided * 100), 1) if total_decided > 0 else 100.0

        # 2. Average Approval Time (Hours)
        approved_reqs = session.query(VmRequest).filter(
            VmRequest.request_status == 'approved',
            VmRequest.approved_at.isnot(None),
            VmRequest.created_at.isnot(None)
        ).all()
        if approved_reqs:
            diffs = [(r.approved_at - r.created_at).total_seconds() for r in approved_reqs]
            avg_hours = round((sum(diffs) / len(diffs)) / 3600, 1)
        else:
            avg_hours = 0.0

        # 3. Notification Backlog
        backlog = session.query(Notification).filter_by(is_read=0).count()

        # 4. Critical Alerts
        critical_alerts = session.query(Alert).filter_by(status='active', severity='critical').count()

        # 5. Ownership Coverage %
        total_vms = session.query(Vm).filter(Vm.status != 'deleted').count()
        subq = session.query(VmUserRelation.uuid).distinct().subquery()
        assigned_vms = session.query(Vm).filter(
            Vm.status != 'deleted',
            Vm.uuid.in_(subq)
        ).count()
        unassigned_vms = total_vms - assigned_vms
        coverage_pct = round((assigned_vms / total_vms * 100), 1) if total_vms > 0 else 100.0

        # 6. Total Clusters
        total_clusters = session.query(Cluster).count()

        # 7. Alerts List (Active)
        active_alerts_list = session.query(Alert).filter_by(status='active').order_by(Alert.created_at.desc()).all()
        alerts_data = []
        for a in active_alerts_list:
            alerts_data.append({
                "id": a.id,
                "severity": a.severity,
                "resource_type": a.resource_type,
                "resource_id": a.resource_id,
                "title": a.title,
                "description": a.description,
                "created_at": a.created_at.strftime("%Y-%m-%d %H:%M:%S") if a.created_at else None
            })

        return jsonify({
            "approval_rate": approval_rate,
            "avg_approval_time_hours": avg_hours,
            "notification_backlog": backlog,
            "critical_alerts_count": critical_alerts,
            "ownership_coverage_pct": coverage_pct,
            "total_clusters": total_clusters,
            "assigned_vms": assigned_vms,
            "unassigned_vms": unassigned_vms,
            "total_vms": total_vms,
            "active_alerts": alerts_data
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()
