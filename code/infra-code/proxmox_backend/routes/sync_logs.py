from flask import Blueprint, jsonify, request
from db import SessionLocal
from models.sync_log_table import SyncLog
from sqlalchemy import func
from datetime import datetime

sync_logs_bp = Blueprint('sync_logs', __name__, url_prefix='/proxmox/sync-logs')

@sync_logs_bp.route('', methods=['GET'])
def get_sync_logs():
    session = SessionLocal()
    try:
        # Fetch all logs, ordered by newest first
        logs_query = session.query(SyncLog).order_by(SyncLog.timestamp.desc()).all()
        
        # Calculate stats dynamically
        total_syncs = len(logs_query)
        
        if total_syncs > 0:
            avg_duration = session.query(func.avg(SyncLog.duration)).scalar() or 0.0
            success_count = session.query(func.count(SyncLog.id)).filter(SyncLog.status == 'success').scalar() or 0
            success_rate = (success_count / total_syncs) * 100
        else:
            avg_duration = 0.0
            success_rate = 100.0

        logs_data = []
        for log in logs_query:
            logs_data.append({
                "id": log.id,
                "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else None,
                "duration": f"{log.duration:.1f}s",
                "triggeredBy": log.triggered_by,
                "status": log.status,
                "summary": log.summary
            })

        return jsonify({
            "logs": logs_data,
            "stats": {
                "total": total_syncs,
                "avg_duration": f"{avg_duration:.1f}s",
                "success_rate": f"{success_rate:.1f}%",
                "scheduled_interval": "Every 4 hrs"  # Consistent with design
            }
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@sync_logs_bp.route('', methods=['POST'])
def create_sync_log():
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        duration = float(data.get("duration", 0.0))
        status = data.get("status", "success")
        summary = data.get("summary", "")
        
        # Determine triggered_by from request headers or fallback
        staff_code = request.headers.get("X-User-Staff-Code", "").strip()
        role = request.headers.get("X-User-Role", "").strip()
        
        if staff_code:
            triggered_by = f"{staff_code} ({role.capitalize() if role else 'User'})"
        else:
            triggered_by = data.get("triggered_by", "System (Scheduled Cron)")

        new_log = SyncLog(
            duration=duration,
            status=status,
            summary=summary,
            triggered_by=triggered_by
        )
        session.add(new_log)
        session.commit()
        
        return jsonify({
            "message": "Sync log entry created successfully",
            "log_id": new_log.id
        }), 201
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()
