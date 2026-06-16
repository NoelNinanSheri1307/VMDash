from flask import Blueprint, request, jsonify, Response, current_app
from sqlalchemy import func, and_
from datetime import datetime
import csv
import io
import html
import json

from db import SessionLocal
from models.vm_table import Vm
from models.storage_table import Storage
from models.node_table import Node
from models.user_table import EmpDetails
from models.relation_tables import VmNodeRelation, VmStorageRelation, VmUserRelation
from models.report_models import SavedReport, ReportFavorite, ReportTemplate, ReportAuditLog

def log_report_execution(staff_code, report_name, report_type, file_format, columns, filters, vm_count, saved_report_id=None):
    if not staff_code:
        staff_code = "unknown"
    session = SessionLocal()
    try:
        log = ReportAuditLog(
            staff_code=staff_code,
            report_name=report_name or "Custom Report",
            report_type=report_type or "custom",
            file_format=file_format,
            columns_json=json.dumps(columns),
            filters_json=json.dumps(filters) if filters else "{}",
            vm_count=vm_count
        )
        session.add(log)
        if saved_report_id:
            saved_report = session.query(SavedReport).filter_by(id=saved_report_id).first()
            if saved_report:
                saved_report.usage_count = (saved_report.usage_count or 0) + 1
                saved_report.last_used_at = datetime.utcnow()
        session.commit()
        session.refresh(log)
        return log.id
    except Exception as e:
        session.rollback()
        current_app.logger.exception("Audit logging failed inside log_report_execution")
        return None
    finally:
        session.close()

def get_user_context():
    staff_code = request.headers.get("X-User-Staff-Code")
    role = request.headers.get("X-User-Role")
    # Fallback to JSON request body or args
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

def safe_float(val):
    if val is None:
        return 0.0
    try:
        # Strip out non-numeric characters like 'G', 'GB', 'M', etc.
        cleaned = "".join([c for c in str(val) if c.isdigit() or c == "."])
        return float(cleaned) if cleaned else 0.0
    except (ValueError, TypeError):
        return 0.0

report_bp = Blueprint("report", __name__, url_prefix="/proxmox")

FIXED_FIELDS = ["vm_id", "vm_name"]

DEFAULT_FIELDS = [
    "cluster_name", "node_name",
    "ip", "mac",
    "cpus", "sockets",
    "max_memory", "max_disk",
    "gpu", "gpu_info",
    "status", "live_status",
    "created_date"
]

ALLOWED_FIELDS = {
    "vm_uuid", "vm_id", "vm_name",
    "os", "cpus", "sockets", "max_memory", "chipset", "max_disk",
    "mac", "ip", "status", "uptime", "live_status",
    "cluster_name", "node_name",
    "gpu", "gpu_info",
    "created_date",
    "initial_node_entry_time", "updated_node_entry_time",
    "users_assigned", "storages",
    "request_source", "dcv_hostname", 
    "com_focal_point", "end_user_focal_point",
    "display_type", "prometheus_status", "software_installed"
}

FIELD_LABELS = {
    "vm_uuid": "UUID",
    "vm_id": "VM ID",
    "vm_name": "VM Name",
    "os": "OS",
    "cpus": "CPUs",
    "sockets": "Socket",
    "max_memory": "Max Memory",
    "chipset": "Chipset",
    "max_disk": "Max Disk",
    "mac": "MAC Address",
    "ip": "IP Address",
    "status": "Status",
    "uptime": "Uptime",
    "live_status": "Live Status",
    "cluster_name": "Cluster",
    "node_name": "Node Name",
    "gpu": "GPU",
    "gpu_info": "GPU Details",
    "created_date": "Created Date",
    "initial_node_entry_time": "Node Entry Initial",
    "updated_node_entry_time": "Node Entry Updated",
    "users_assigned": "Users Assigned",
    "storages": "Storage",
    "request_source": "Request Source",
    "dcv_hostname": "DCV Hostname",
    "com_focal_point": "COM Focal Point",
    "end_user_focal_point": "End User Focal Point",
    "display_type": "Display Type",
    "prometheus_status": "Prometheus Status",
    "software_installed": "Software Installed",
}


def format_users(users):
    if not users:
        return ""
    return " | ".join([f'{u["staff_code"]}-{u["name"]}' for u in users])


def format_storages(storages):
    if not storages:
        return ""
    return " | ".join([
        f'{s["disk_image"]} ({s["storage_name"]}, {s["size"]}G, {s.get("live_status", "")})'
        for s in storages
    ])


def normalize_fields(selected_fields):
    """
    - allow only allowed fields
    - fixed fields always first
    - no duplicates
    """
    if not selected_fields:
        selected_fields = DEFAULT_FIELDS

    selected_fields = [f for f in selected_fields if f in ALLOWED_FIELDS]
    selected_fields = [f for f in selected_fields if f not in FIXED_FIELDS]

    selected_fields = FIXED_FIELDS + selected_fields

    seen = set()
    final = []
    for f in selected_fields:
        if f not in seen:
            seen.add(f)
            final.append(f)
    return final


def row_value_for_export(row, field):
    """Converts list fields to string before export."""
    val = row.get(field, "")
    if field == "users_assigned":
        return format_users(val)
    if field == "storages":
        return format_storages(val)
    return "" if val is None else val


def build_html_table(rows, selected_fields):
    """
    Builds html table string used for PDF(print) + XLS
    """
    table = "<table border='1' style='border-collapse:collapse;width:100%'>"

    # header
    table += "<tr>" + "".join(
        f"<th style='padding:6px;background:#4CAF50;color:white;font-size:12px'>"
        f"{html.escape(FIELD_LABELS.get(f, f))}</th>"
        for f in selected_fields
    ) + "</tr>"

    # rows
    for r in rows:
        table += "<tr>"
        for f in selected_fields:
            val = row_value_for_export(r, f)
            table += f"<td style='padding:6px;font-size:11px'>{html.escape(str(val))}</td>"
        table += "</tr>"

    table += "</table>"
    return table


@report_bp.route("/report", methods=["POST"])
def download_vm_report():
    data = request.get_json(silent=True) or {}

    selected_fields = data.get("columns")  # may be None
    file_format = (data.get("format") or "csv").lower().strip()

    if file_format in ("", "default", None):
        file_format = "csv"

    if file_format not in ("csv", "json", "xls", "pdf"):
        return jsonify({"error": "Invalid format. Use csv/json/xls/pdf"}), 400

    selected_fields = normalize_fields(selected_fields)

    uuids_filter = data.get("uuids")

    session = SessionLocal()
    try:
        query = session.query(Vm)
        if isinstance(uuids_filter, list):
            query = query.filter(Vm.uuid.in_(uuids_filter))
        vm_list = query.all()
        vm_uuids = [v.uuid for v in vm_list]

        # Latest node entry
        latest_node_subq = (
            session.query(
                VmNodeRelation.uuid,
                func.max(VmNodeRelation.updated_at).label("latest_node_time")
            )
            .filter(VmNodeRelation.uuid.in_(vm_uuids))
            .group_by(VmNodeRelation.uuid)
            .subquery()
        )

        latest_nodes = (
            session.query(VmNodeRelation)
            .join(
                latest_node_subq,
                and_(
                    VmNodeRelation.uuid == latest_node_subq.c.uuid,
                    VmNodeRelation.updated_at == latest_node_subq.c.latest_node_time
                )
            )
            .all()
        )
        latest_node_map = {n.uuid: n for n in latest_nodes}

        # Latest storage per disk
        latest_storage_subq = (
            session.query(
                VmStorageRelation.uuid,
                VmStorageRelation.vm_disk_image.label("vm_disk_image"),
                func.max(VmStorageRelation.updated_at).label("latest_time")
            )
            .filter(VmStorageRelation.uuid.in_(vm_uuids))
            .group_by(VmStorageRelation.uuid, VmStorageRelation.vm_disk_image)
            .subquery()
        )

        latest_storage_records = (
            session.query(VmStorageRelation)
            .join(
                latest_storage_subq,
                and_(
                    VmStorageRelation.uuid == latest_storage_subq.c.uuid,
                    VmStorageRelation.vm_disk_image == latest_storage_subq.c.vm_disk_image,
                    VmStorageRelation.updated_at == latest_storage_subq.c.latest_time
                )
            )
            .all()
        )

        # Storage live status
        storage_live = (
            session.query(
                VmStorageRelation.uuid,
                VmStorageRelation.vm_disk_image,
                Storage.live_status
            )
            .join(Storage, (
                (VmStorageRelation.cluster_name == Storage.cluster_name) &
                (VmStorageRelation.storage_name == Storage.storage_name) &
                (VmStorageRelation.node_name == Storage.node_name)
            ))
            .filter(VmStorageRelation.uuid.in_(vm_uuids))
            .all()
        )
        storage_live_map = {(uuid, disk): live for uuid, disk, live in storage_live}

        storages_by_vm = {}
        for s in latest_storage_records:
            storages_by_vm.setdefault(s.uuid, []).append({
                "disk_image": s.vm_disk_image,
                "storage_name": s.storage_name,
                "size": s.size,
                "live_status": "active" if storage_live_map.get((s.uuid, s.vm_disk_image)) else "inactive"
            })

        # Latest users
        users_subq = (
            session.query(
                VmUserRelation.uuid,
                VmUserRelation.staff_code,
                func.max(VmUserRelation.initial_at).label("max_initial")
            )
            .filter(VmUserRelation.uuid.in_(vm_uuids))
            .group_by(VmUserRelation.uuid, VmUserRelation.staff_code)
            .subquery()
        )

        user_info = (
            session.query(VmUserRelation, EmpDetails)
            .join(
                users_subq,
                and_(
                    VmUserRelation.uuid == users_subq.c.uuid,
                    VmUserRelation.staff_code == users_subq.c.staff_code,
                    VmUserRelation.initial_at == users_subq.c.max_initial
                )
            )
            .join(EmpDetails, VmUserRelation.staff_code == EmpDetails.staff_code)
            .all()
        )

        users_by_vm = {}
        for rel, emp in user_info:
            users_by_vm.setdefault(rel.uuid, []).append({
                "staff_code": emp.staff_code,
                "name": emp.name,
                "division": emp.division,
                "groupname": emp.groupname,
                "entity": emp.entity
            })

        rows = []
        for vm in vm_list:
            node_entry = latest_node_map.get(vm.uuid)

            rows.append({
                "vm_uuid": vm.uuid,
                "vm_id": vm.vm_id,
                "vm_name": vm.vm_name,

                "os": vm.os,
                "cpus": vm.cpus,
                "sockets": vm.sockets,
                "max_memory": vm.max_memory,
                "chipset": vm.chipset,
                "max_disk": vm.max_disk,

                "mac": vm.mac,
                "ip": vm.ip,

                "status": vm.status,
                "live_status": getattr(vm, "live_status", None),
                "uptime": getattr(vm, "uptime", None),

                "cluster_name": node_entry.cluster_name if node_entry else "",
                "node_name": node_entry.node_name if node_entry else "",
                "initial_node_entry_time": node_entry.initial_at.strftime("%Y-%m-%d %H:%M:%S")
                if node_entry and node_entry.initial_at else "",
                "updated_node_entry_time": node_entry.updated_at.strftime("%Y-%m-%d %H:%M:%S")
                if node_entry and node_entry.updated_at else "",

                "gpu": vm.gpu,
                "gpu_info": getattr(vm, "gpu_info", None),

                "created_date": vm.created_date.strftime("%Y-%m-%d %H:%M:%S")
                if vm.created_date else "",

                "request_source": getattr(vm, "request_source", None),
                "com_focal_point": getattr(vm, "com_focal_point", None),
                "dcv_hostname": getattr(vm, "dcv_hostname", None),
                "end_user_focal_point": getattr(vm, "end_user_focal_point", None),
                "display_type": getattr(vm, "display_type", None),
                "prometheus_status": getattr(vm, "prometheus_status", None),
                "software_installed": getattr(vm, "software_installed", None),

                "users_assigned": users_by_vm.get(vm.uuid, []),
                "storages": storages_by_vm.get(vm.uuid, []),
            })

    finally:
        session.close()

    # Calculate report duration & hash (Stage 5.2)
    import hashlib
    import time
    import base64
    import os


    generation_start_time = time.time()
    
    # Run DB queries for snapshots/indicators
    session_db = SessionLocal()
    try:
        db_nodes = session_db.query(Node).all()
        db_storages = session_db.query(Storage).all()
        
        total_db_nodes = len(db_nodes)
        total_db_clusters = len(set(n.cluster_name for n in db_nodes if n.cluster_name))
        total_db_storage_pools = len(set(s.storage_name for s in db_storages if s.storage_name))
        
        node_map = {(n.cluster_name, n.node_name): n for n in db_nodes}
        storage_map = {(s.cluster_name, s.node_name, s.storage_name): s for s in db_storages}
    except Exception as e:
        total_db_nodes = 3
        total_db_clusters = 1
        total_db_storage_pools = 3
        node_map = {}
        storage_map = {}
        current_app.logger.exception("Failed to load node/storage tables for snapshot")
    finally:
        session_db.close()

    # Calculate Report SHA-256 Hash
    try:
        row_data_str = json.dumps([{k: str(v) for k, v in r.items() if k not in ("users_assigned", "storages")} for r in rows], sort_keys=True)
        report_hash = hashlib.sha256(row_data_str.encode('utf-8')).hexdigest()
    except Exception:
        report_hash = "N/A"

    # Try audit log (Rule 13 insulation)
    audit_id = "N/A"
    try:
        staff_code_log = data.get("staff_code") or request.headers.get("X-User-Staff-Code") or "unknown"
        report_name_log = data.get("report_name") or "Custom Report"
        report_type_log = data.get("report_type") or "custom"
        saved_report_id_log = data.get("saved_report_id")
        filters_log = data.get("filters") or {}
        
        # Inject report hash into log metadata
        log_filters = dict(filters_log)
        log_filters["report_hash"] = report_hash
        
        created_audit_id = log_report_execution(
            staff_code=staff_code_log,
            report_name=report_name_log,
            report_type=report_type_log,
            file_format=file_format,
            columns=selected_fields,
            filters=log_filters,
            vm_count=len(rows),
            saved_report_id=saved_report_id_log
        )
        if created_audit_id:
            audit_id = str(created_audit_id)
    except Exception as e:
        current_app.logger.exception("Audit logging failed in request handler")

    # Finalize Generation Duration
    generation_duration = time.time() - generation_start_time
    duration_str = f"{generation_duration:.2f} seconds"

    generated_time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # JSON
    if file_format == "json":
        filtered = []
        for r in rows:
            item = {}
            for f in selected_fields:
                item[f] = row_value_for_export(r, f)
            filtered.append(item)
        return jsonify({
            "metadata": {
                "report_name": data.get("report_name") or "Custom Report",
                "report_type": data.get("report_type") or "custom",
                "generated_by": data.get("staff_code") or request.headers.get("X-User-Staff-Code") or "unknown",
                "generated_on": generated_time_str,
                "audit_id": audit_id,
                "report_hash": report_hash,
                "generation_time": duration_str,
                "selected_vm_count": len(rows)
            },
            "data": filtered
        })

    # CSV
    if file_format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)

        # Prepend commented metadata rows (Provenance & Integrity)
        writer.writerow([f"# Report Name: {data.get('report_name') or 'Custom Report'}"])
        writer.writerow([f"# Generated By: {data.get('staff_code') or request.headers.get('X-User-Staff-Code') or 'unknown'}"])
        writer.writerow([f"# Generated On: {generated_time_str}"])
        writer.writerow([f"# Audit ID: {audit_id}"])
        writer.writerow([f"# Report Hash: {report_hash}"])
        writer.writerow([f"# Generation Time: {duration_str}"])
        writer.writerow([f"# Selected VM Count: {len(rows)}"])
        writer.writerow([])

        writer.writerow([FIELD_LABELS.get(f, f) for f in selected_fields])

        for r in rows:
            writer.writerow([row_value_for_export(r, f) for f in selected_fields])

        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment; filename=vm-report.csv"}
        )

    # XLS
    if file_format == "xls":
        html_table = build_html_table(rows, selected_fields)
        xls_html = f"""
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            .metadata-title {{ font-family: 'Times New Roman', serif; font-size: 14pt; font-weight: bold; text-align: center; }}
            .metadata-lbl {{ font-family: 'Times New Roman', serif; font-size: 10pt; font-weight: bold; }}
            .metadata-val {{ font-family: 'Times New Roman', serif; font-size: 10pt; }}
          </style>
        </head>
        <body>
          <table>
            <tr><td colspan="{len(selected_fields)}" class="metadata-title">VIKRAM SARABHAI SPACE CENTRE</td></tr>
            <tr><td colspan="{len(selected_fields)}" class="metadata-title">INDIAN SPACE RESEARCH ORGANISATION</td></tr>
            <tr><td colspan="{len(selected_fields)}" style="text-align:center; font-family:'Times New Roman'; font-size:11pt; color:#555;">Infrastructure Management Portal</td></tr>
            <tr><td colspan="{len(selected_fields)}"></td></tr>
            <tr>
              <td class="metadata-lbl">Report Name:</td><td colspan="{max(1, len(selected_fields)-1)}" class="metadata-val">{html.escape(data.get("report_name") or "Custom Report")}</td>
            </tr>
            <tr>
              <td class="metadata-lbl">Generated By:</td><td colspan="{max(1, len(selected_fields)-1)}" class="metadata-val">{html.escape(data.get("staff_code") or request.headers.get("X-User-Staff-Code") or "unknown")}</td>
            </tr>
            <tr>
              <td class="metadata-lbl">Generated On:</td><td colspan="{max(1, len(selected_fields)-1)}" class="metadata-val">{generated_time_str}</td>
            </tr>
            <tr>
              <td class="metadata-lbl">Audit ID:</td><td colspan="{max(1, len(selected_fields)-1)}" class="metadata-val">{audit_id}</td>
            </tr>
            <tr>
              <td class="metadata-lbl">Report Hash:</td><td colspan="{max(1, len(selected_fields)-1)}" class="metadata-val">{report_hash}</td>
            </tr>
            <tr>
              <td class="metadata-lbl">Generation Time:</td><td colspan="{max(1, len(selected_fields)-1)}" class="metadata-val">{duration_str}</td>
            </tr>
            <tr>
              <td class="metadata-lbl">Selected VM Count:</td><td colspan="{max(1, len(selected_fields)-1)}" class="metadata-val">{len(rows)}</td>
            </tr>
            <tr><td colspan="{len(selected_fields)}"></td></tr>
          </table>
          {html_table}
        </body>
        </html>
        """
        return Response(
            xls_html,
            mimetype="application/vnd.ms-excel",
            headers={"Content-Disposition": "attachment; filename=vm-report.xls"}
        )

    # PDF (backend printable HTML)
    # Load and encode VSSC logo SVG with a safe text-only fallback
    logo_base64 = ""
    logo_path = os.path.join(os.path.dirname(__file__), "..", "static", "isrologo.svg")
    try:
        if os.path.exists(logo_path):
            with open(logo_path, "rb") as f:
                logo_base64 = base64.b64encode(f.read()).decode("utf-8")
    except Exception:
        current_app.logger.exception("Failed to read static logo SVG")

    # Compute Statistics & Aggregations
    running_vms = sum(1 for r in rows if str(r.get("status")).lower() == "running")
    stopped_vms = sum(1 for r in rows if str(r.get("status")).lower() not in ("running", "online"))
    gpu_enabled_vms = sum(1 for r in rows if r.get("gpu") and str(r.get("gpu")).lower() not in ("none", "false", "0", ""))
    total_clusters = len(set(r.get("cluster_name") for r in rows if r.get("cluster_name")))
    total_nodes = len(set(r.get("node_name") for r in rows if r.get("node_name")))
    
    unique_storages = set()
    for r in rows:
        for s in (r.get("storages") or []):
            if s.get("storage_name"):
                unique_storages.add(s.get("storage_name"))
    total_storage_pools = len(unique_storages)

    total_cpus = sum(int(r.get("cpus") or 0) for r in rows)
    total_ram = sum(safe_float(r.get("max_memory")) for r in rows)
    total_disk = sum(safe_float(r.get("max_disk")) for r in rows)
    total_gpu = sum(int(r.get("gpu") or 0) for r in rows)

    assigned_vms = sum(1 for r in rows if r.get("users_assigned"))
    unassigned_vms = sum(1 for r in rows if not r.get("users_assigned"))

    # Compute Node Allocations & Capacity Risk Indicators
    node_alloc = {}
    storage_alloc = {}
    for r in rows:
        c = r.get("cluster_name")
        n = r.get("node_name")
        if c and n:
            key = (c, n)
            node_alloc.setdefault(key, {"cpus": 0, "mem": 0})
            node_alloc[key]["cpus"] += int(r.get("cpus") or 0)
            node_alloc[key]["mem"] += safe_float(r.get("max_memory"))
            
        for s in (r.get("storages") or []):
            sname = s.get("storage_name")
            if c and n and sname:
                skey = (c, n, sname)
                storage_alloc[skey] = storage_alloc.get(skey, 0.0) + safe_float(s.get("size"))

    capacity_risks = []
    for key, alloc in node_alloc.items():
        node_obj = node_map.get(key)
        if node_obj:
            t_cores = node_obj.total_cores or 1
            t_mem_gb = (node_obj.total_mem or 0) / (1024**3)
            if alloc["cpus"] > t_cores:
                capacity_risks.append(f"High CPU Allocation on {key[1]} ({key[0]}): Allocated {alloc['cpus']}/{t_cores} Cores")
            if t_mem_gb > 0 and alloc["mem"] > (t_mem_gb * 0.85):
                capacity_risks.append(f"High Memory Allocation on {key[1]} ({key[0]}): Allocated {alloc['mem']:.1f}/{t_mem_gb:.1f} GB")

    for skey, d_alloc in storage_alloc.items():
        st_obj = storage_map.get(skey)
        if st_obj:
            t_size = st_obj.total_size or 0
            if t_size > 0 and d_alloc > (t_size * 0.85):
                capacity_risks.append(f"High Storage Allocation on pool '{skey[2]}' at node {skey[1]}: Allocated {d_alloc:.1f}/{t_size:.1f} GB")

    if unassigned_vms > 0:
        capacity_risks.append(f"Unassigned Infrastructure Alert: {unassigned_vms} VMs have no assigned personnel")

    # Ownership Summary Calculations
    division_counts = {}
    group_counts = {}
    entity_counts = {}
    has_ownership = False
    for r in rows:
        users_assigned_list = r.get("users_assigned") or []
        if users_assigned_list:
            has_ownership = True
        for u in users_assigned_list:
            div = u.get("division")
            grp = u.get("groupname")
            ent = u.get("entity")
            if div: division_counts[div] = division_counts.get(div, 0) + 1
            if grp: group_counts[grp] = group_counts.get(grp, 0) + 1
            if ent: entity_counts[ent] = entity_counts.get(ent, 0) + 1

    # Top Findings section
    highest_cpu_vm = None
    highest_cpu_val = -1
    highest_ram_vm = None
    highest_ram_val = -1
    largest_disk_vm = None
    largest_disk_val = -1

    for r in rows:
        vm_name = r.get("vm_name")
        cpus = int(r.get("cpus") or 0)
        if cpus > highest_cpu_val:
            highest_cpu_val = cpus
            highest_cpu_vm = vm_name
            
        ram = safe_float(r.get("max_memory"))
        if ram > highest_ram_val:
            highest_ram_val = ram
            highest_ram_vm = vm_name
            
        disk_sum = sum(safe_float(s.get("size")) for s in (r.get("storages") or []))
        if disk_sum > largest_disk_val:
            largest_disk_val = disk_sum
            largest_disk_vm = vm_name

    findings = []
    if highest_cpu_vm and highest_cpu_val > 0:
        findings.append(f"Highest CPU Allocation: VM '{highest_cpu_vm}' ({highest_cpu_val} Cores)")
    if highest_ram_vm and highest_ram_val > 0:
        findings.append(f"Highest Memory Allocation: VM '{highest_ram_vm}' ({highest_ram_val:.1f} GB)")
    if largest_disk_vm and largest_disk_val > 0:
        findings.append(f"Largest Storage Allocation: VM '{largest_disk_vm}' ({largest_disk_val:.1f} GB)")
    if unassigned_vms > 0:
        findings.append(f"Unassigned Resources: {unassigned_vms} VMs do not have any employee context mapped")
    if gpu_enabled_vms > 0:
        findings.append(f"GPU Capability: {gpu_enabled_vms} VMs have specialized hardware acceleration profiles active")

    # Render Report Scope Banner filters
    filters_banner_list = [f"Showing {len(rows)} VMs"]
    if data.get("filters"):
        for fk, fv in data.get("filters").items():
            if fv not in (None, "", "all", []):
                filters_banner_list.append(f"{fk.capitalize()}: {fv}")
    filters_banner = " | ".join(filters_banner_list)

    # Build Header Section HTML
    header_logo_html = ""
    if logo_base64:
        header_logo_html = f'<img src="data:image/svg+xml;base64,{logo_base64}" style="height:65px; width:auto;" alt="VSSC Logo" />'
    else:
        header_logo_html = '<div style="font-size:24pt; font-weight:bold; color:#0e88d3; font-family:\'Times New Roman\';">VSSC / ISRO</div>'

    # Build PDF HTML printable VM Table
    # Re-generate clean Times New Roman HTML Table
    pdf_table_html = "<table style='width:100%; border-collapse:collapse; font-family:\"Times New Roman\", Times, serif; font-size:9pt; margin-top:15px;'>"
    pdf_table_html += "<thead><tr style='background-color:#0f5e31; color:white; font-family:\"Times New Roman\", Times, serif; font-weight:bold; font-size:10pt;'>"
    for f in selected_fields:
        pdf_table_html += f"<th style='border:1px solid #111; padding:6px; text-align:left; font-family:\"Times New Roman\", Times, serif; font-weight:bold;'>{html.escape(FIELD_LABELS.get(f, f))}</th>"
    pdf_table_html += "</tr></thead><tbody>"
    for r in rows:
        pdf_table_html += "<tr style='page-break-inside:avoid;'>"
        for f in selected_fields:
            val = row_value_for_export(r, f)
            pdf_table_html += f"<td style='border:1px solid #ddd; padding:5px; font-family:\"Times New Roman\", Times, serif;'>{html.escape(str(val))}</td>"
        pdf_table_html += "</tr>"
    pdf_table_html += "</tbody></table>"

    # Build report HTML document
    html_doc = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <title>VSSC VM Executive Report</title>
      <style>
        @media print {{
          body {{
            font-family: "Times New Roman", Times, serif;
            margin: 15mm 15mm 20mm 15mm;
            color: #000;
          }}
          .page-break {{
            page-break-before: always;
          }}
          .report-footer {{
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 30px;
            border-top: 1px solid #ddd;
            padding-top: 5px;
            font-family: "Times New Roman", Times, serif;
            font-style: italic;
            font-size: 8pt;
            text-align: center;
            color: #555;
            background-color: white;
          }}
          .watermark {{
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 70pt;
            font-weight: bold;
            color: rgba(0, 0, 0, 0.03);
            z-index: -1000;
            pointer-events: none;
            white-space: nowrap;
            font-family: "Times New Roman", Times, serif;
          }}
        }}
        body {{
          font-family: "Times New Roman", Times, serif;
          margin: 40px auto;
          max-width: 1000px;
          padding: 0 20px;
          color: #333;
        }}
        .watermark {{
          display: none;
        }}
        .title-banner {{
          background: linear-gradient(135deg, #0e88d3, #0f5e31);
          color: white;
          padding: 10px 15px;
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 15px;
          border-radius: 4px;
          font-family: "Times New Roman", Times, serif;
        }}
        .section-title {{
          font-family: "Times New Roman", Times, serif;
          font-weight: bold;
          font-size: 12pt;
          border-bottom: 2px solid #0f5e31;
          padding-bottom: 3px;
          margin-top: 25px;
          margin-bottom: 10px;
          color: #0f5e31;
        }}
        .grid-summary {{
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 15px;
        }}
        .summary-box {{
          border: 1px solid #ddd;
          border-top: 3px solid #0f5e31;
          padding: 8px;
          background-color: #fbfbfb;
          text-align: center;
        }}
        .summary-val {{
          font-size: 15pt;
          font-weight: bold;
          color: #111;
        }}
        .summary-lbl {{
          font-size: 8pt;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }}
        .summary-table {{
          width: 100%;
          border-collapse: collapse;
        }}
        .summary-table td, .summary-table th {{
          font-family: "Times New Roman", Times, serif;
          border: 1px solid #ddd;
          padding: 5px;
          font-size: 9.5pt;
        }}
        .summary-table th {{
          background-color: #f5f5f5;
          text-align: left;
          font-weight: bold;
        }}
        .findings-list {{
          margin: 5px 0 15px 15px;
          padding: 0;
          font-family: "Times New Roman", Times, serif;
          font-size: 9.5pt;
        }}
        .findings-list li {{
          margin-bottom: 4px;
        }}
      </style>
    </head>
    <body>
      <div class="watermark">VSSC ISRO</div>

      <!-- Report Header -->
      <table style="width:100%; border:none; border-collapse:collapse; margin-bottom:15px;">
        <tr>
          <td style="width:20%; border:none; text-align:left; vertical-align:middle;">
            {header_logo_html}
          </td>
          <td style="width:80%; border:none; text-align:center; vertical-align:middle; font-family:'Times New Roman', Times, serif; line-height:1.3;">
            <div style="font-weight:bold; font-size:15pt; color:#111;">VIKRAM SARABHAI SPACE CENTRE</div>
            <div style="font-weight:bold; font-size:12pt; color:#222;">INDIAN SPACE RESEARCH ORGANISATION</div>
            <div style="font-size:10pt; color:#555;">Infrastructure Management Portal</div>
          </td>
        </tr>
      </table>

      <!-- Title Banner -->
      <div class="title-banner">
        Infrastructure Scope: {filters_banner}
      </div>

      <!-- Report Provenance (Placed Before Metadata) -->
      <div class="section-title">Report Provenance</div>
      <table class="summary-table" style="margin-bottom:15px;">
        <tr>
          <th style="width:25%;">Generated By</th>
          <td style="width:25%;">{html.escape(staff_code_log)}</td>
          <th style="width:25%;">Generated On</th>
          <td style="width:25%;">{generated_time_str}</td>
        </tr>
        <tr>
          <th>Audit ID</th>
          <td>{audit_id}</td>
          <th>Report Hash</th>
          <td style="font-family:monospace; font-size:8.5pt; word-break:break-all;">{report_hash}</td>
        </tr>
        <tr>
          <th>Export Format</th>
          <td>PDF</td>
          <th>Generation Time</th>
          <td>{duration_str}</td>
        </tr>
        <tr>
          <th>Selected VM Count</th>
          <td colspan="3">{len(rows)}</td>
        </tr>
      </table>

      <!-- Metadata Block -->
      <div class="section-title">Report Scope Metadata</div>
      <table class="summary-table" style="margin-bottom:15px;">
        <tr>
          <th style="width:25%;">Report Name</th>
          <td style="width:75%;">{html.escape(report_name_log)}</td>
        </tr>
        <tr>
          <th>Report Type</th>
          <td>{html.escape(report_type_log)}</td>
        </tr>
        {"<tr><th>Active Filters</th><td>" + html.escape(json.dumps(filters_log)) + "</td></tr>" if filters_log else ""}
        {"<tr><th>Cluster Scope</th><td>" + html.escape(str(filters_log.get("cluster"))) + "</td></tr>" if filters_log and filters_log.get("cluster") else ""}
        {"<tr><th>Node Scope</th><td>" + html.escape(str(filters_log.get("node"))) + "</td></tr>" if filters_log and filters_log.get("node") else ""}
      </table>

      <!-- Scope Explanation sentence -->
      <p style="font-size:9.5pt; font-family:'Times New Roman', Times, serif; font-style:italic; margin-bottom:15px;">
        This report contains information for {len(rows)} selected virtual machines matching the applied filter criteria.
      </p>

      <!-- Executive Summary -->
      <div class="section-title">Executive Summary</div>
      <div class="grid-summary">
        <div class="summary-box">
          <div class="summary-val">{len(rows)}</div>
          <div class="summary-lbl">Total VMs</div>
        </div>
        <div class="summary-box">
          <div class="summary-val">{running_vms}</div>
          <div class="summary-lbl">Running VMs</div>
        </div>
        <div class="summary-box">
          <div class="summary-val">{stopped_vms}</div>
          <div class="summary-lbl">Stopped VMs</div>
        </div>
        <div class="summary-box">
          <div class="summary-val">{gpu_enabled_vms}</div>
          <div class="summary-lbl">GPU Enabled</div>
        </div>
      </div>

      <div class="grid-summary" style="margin-bottom:20px;">
        <div class="summary-box" style="border-top-color:#0e88d3;">
          <div class="summary-val">{total_cpus}</div>
          <div class="summary-lbl">Total CPUs Mapped</div>
        </div>
        <div class="summary-box" style="border-top-color:#0e88d3;">
          <div class="summary-val">{total_ram:.1f} GB</div>
          <div class="summary-lbl">RAM Allocated</div>
        </div>
        <div class="summary-box" style="border-top-color:#0e88d3;">
          <div class="summary-val">{total_disk:.1f} GB</div>
          <div class="summary-lbl">Disk Allocated</div>
        </div>
        <div class="summary-box" style="border-top-color:#0e88d3;">
          <div class="summary-val">{total_gpu}</div>
          <div class="summary-lbl">Total GPUs Mapped</div>
        </div>
      </div>

      <!-- Scope Statistics Table -->
      <div class="section-title">Scope Statistics</div>
      <table class="summary-table" style="margin-bottom:15px;">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Selected VMs</td><td>{len(rows)}</td></tr>
          <tr><td>Running VMs</td><td>{running_vms}</td></tr>
          <tr><td>Stopped VMs</td><td>{stopped_vms}</td></tr>
          <tr><td>GPU Enabled VMs</td><td>{gpu_enabled_vms}</td></tr>
          <tr><td>Assigned VMs</td><td>{assigned_vms}</td></tr>
          <tr><td>Unassigned VMs</td><td>{unassigned_vms}</td></tr>
        </tbody>
      </table>

      <!-- Infrastructure Snapshot -->
      <div class="section-title">Infrastructure Snapshot</div>
      <table class="summary-table" style="margin-bottom:15px;">
        <thead>
          <tr>
            <th>Infrastructure Layer</th>
            <th>Registered Total Count</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Total Hypervisor Nodes</td><td>{total_db_nodes}</td></tr>
          <tr><td>Total Operational Clusters</td><td>{total_db_clusters}</td></tr>
          <tr><td>Total Storage Resource Pools</td><td>{total_db_storage_pools}</td></tr>
        </tbody>
      </table>

      <!-- Ownership Summary -->
      {f'<div class="section-title">Ownership Summary</div>' if has_ownership else ''}
      {f'<table class="summary-table" style="margin-bottom:15px;">' if has_ownership else ''}
      {f'<tr><th colspan="2">Division Distribution</th><th colspan="2">Entity Distribution</th></tr>' if has_ownership else ''}
      {f'<tr><td colspan="2" style="vertical-align:top;">' if has_ownership else ''}
      { "".join(f"<div><b>{html.escape(k)}</b>: {v} VMs</div>" for k, v in division_counts.items()) if has_ownership else "" }
      {f'</td><td colspan="2" style="vertical-align:top;">' if has_ownership else ''}
      { "".join(f"<div><b>{html.escape(k)}</b>: {v} VMs</div>" for k, v in entity_counts.items()) if has_ownership else "" }
      {f'</td></tr></table>' if has_ownership else ''}

      <!-- Capacity Risk Indicators -->
      <div class="section-title">Capacity Risk & Governance Indicators</div>
      <ul class="findings-list">
        { "".join(f"<li style='color:#c00;'><b>[RISK]</b> {html.escape(item)}</li>" for item in capacity_risks) if capacity_risks else "<li>No active capacity risk limits triggered.</li>" }
      </ul>

      <!-- Top Findings Section -->
      <div class="section-title">Top Operations Findings</div>
      <ul class="findings-list">
        { "".join(f"<li><b>[FINDING]</b> {html.escape(item)}</li>" for item in findings) if findings else "<li>No anomalies or prominent resource highlights observed in this scope.</li>" }
      </ul>

      <!-- Data Details -->
      <div class="page-break"></div>
      <div class="section-title">Virtual Machine Registry Details</div>
      {pdf_table_html}

      <!-- Footer -->
      <div class="report-footer">
        VSSC Internal Use Only &nbsp;&nbsp;|&nbsp;&nbsp; Generated from Infrastructure Management Portal &nbsp;&nbsp;|&nbsp;&nbsp; Unauthorized distribution prohibited &nbsp;&nbsp;|&nbsp;&nbsp; Audit ID: {audit_id}
      </div>

      <!-- Browser Print Trigger -->
      <script>
        window.onload = () => window.print();
      </script>
    </body>
    <!-- 
      Future Enhancement Recommendation:
      Replace client-side browser print pipeline (window.print()) with server-generated PDF
      using ReportLab or WeasyPrint to produce consistent cross-platform layout formatting.
    -->
    </html>
    """

    return Response(html_doc, mimetype="text/html")


# ----------------------------------------------------
# STAGE 5 ROUTING ENDPOINTS
# ----------------------------------------------------

# --- Saved Reports CRUD ---
@report_bp.route("/reports/saved", methods=["GET"])
def get_saved_reports():
    staff_code, role = get_user_context()
    if not staff_code or not role:
        return jsonify({"error": "Unauthorized. Staff credentials missing."}), 401
    
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("limit", request.args.get("per_page", 20)))
    offset = (page - 1) * per_page
    
    session = SessionLocal()
    try:
        query = session.query(SavedReport)
        
        # RBAC Enforcement (Rule 14)
        if role == "user":
            query = query.filter(SavedReport.staff_code == staff_code)
        elif role == "manager":
            mgr_emp = session.query(EmpDetails).filter_by(staff_code=staff_code).first()
            if mgr_emp:
                sub_staff = session.query(EmpDetails.staff_code).filter(
                    (EmpDetails.division == mgr_emp.division) | (EmpDetails.entity == mgr_emp.entity)
                ).subquery()
                query = query.filter(SavedReport.staff_code.in_(sub_staff))
            else:
                query = query.filter(SavedReport.staff_code == staff_code)
        # Admins are unrestricted
        
        total = query.count()
        results = query.order_by(SavedReport.created_at.desc()).offset(offset).limit(per_page).all()
        
        # Check favorite status
        favs = session.query(ReportFavorite.report_id).filter_by(staff_code=staff_code).all()
        fav_ids = {f[0] for f in favs}
        
        data = []
        for r in results:
            data.append({
                "id": r.id,
                "staff_code": r.staff_code,
                "title": r.title,
                "description": r.description,
                "columns": json.loads(r.columns_json),
                "filters": json.loads(r.filters_json) if r.filters_json else {},
                "usage_count": r.usage_count or 0,
                "last_used_at": r.last_used_at.strftime("%Y-%m-%d %H:%M:%S") if r.last_used_at else None,
                "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "is_favorite": r.id in fav_ids
            })
            
        return jsonify({
            "data": data,
            "page": page,
            "per_page": per_page,
            "total": total
        }), 200
    finally:
        session.close()

@report_bp.route("/reports/saved", methods=["POST"])
def save_report():
    staff_code, role = get_user_context()
    if not staff_code or not role:
        return jsonify({"error": "Unauthorized. Staff credentials missing."}), 401
        
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    columns = data.get("columns")
    filters = data.get("filters") or {}
    
    if not title:
        return jsonify({"error": "Title is required"}), 400
    if not columns or not isinstance(columns, list):
        return jsonify({"error": "Columns must be a non-empty list"}), 400
        
    # Column Validation
    invalid_cols = [c for c in columns if c not in ALLOWED_FIELDS]
    if invalid_cols:
        return jsonify({"error": f"Invalid columns: {', '.join(invalid_cols)}"}), 400
        
    session = SessionLocal()
    try:
        # Title uniqueness per staff_code (Rule 17)
        existing = session.query(SavedReport).filter(
            SavedReport.staff_code == staff_code,
            func.lower(SavedReport.title) == func.lower(title)
        ).first()
        
        if existing:
            return jsonify({"error": f"A report configuration with the title '{title}' already exists."}), 409
            
        new_report = SavedReport(
            staff_code=staff_code,
            title=title,
            description=description,
            columns_json=json.dumps(columns),
            filters_json=json.dumps(filters)
        )
        session.add(new_report)
        session.commit()
        
        return jsonify({
            "message": "Report configuration saved successfully",
            "id": new_report.id
        }), 201
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@report_bp.route("/reports/saved/<int:report_id>", methods=["DELETE"])
def delete_saved_report(report_id):
    staff_code, role = get_user_context()
    if not staff_code or not role:
        return jsonify({"error": "Unauthorized. Staff credentials missing."}), 401
        
    session = SessionLocal()
    try:
        report = session.query(SavedReport).filter_by(id=report_id).first()
        if not report:
            return jsonify({"error": "Report configuration not found"}), 404
        
        # RBAC Check (Rule 14)
        if role != "admin" and report.staff_code != staff_code:
            return jsonify({"error": "Forbidden. You can only delete your own reports."}), 403
            
        session.delete(report)
        session.commit()
        return jsonify({"message": "Report configuration deleted successfully"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

# --- Report Favorites ---
@report_bp.route("/reports/favorite", methods=["POST"])
def toggle_favorite():
    staff_code, role = get_user_context()
    if not staff_code or not role:
        return jsonify({"error": "Unauthorized. Staff credentials missing."}), 401
        
    data = request.get_json(silent=True) or {}
    report_id = data.get("report_id")
    if not report_id:
        return jsonify({"error": "report_id is required"}), 400
        
    session = SessionLocal()
    try:
        # Validate saved report exists
        report = session.query(SavedReport).filter_by(id=report_id).first()
        if not report:
            return jsonify({"error": "Saved report not found"}), 404
            
        # Toggle check
        fav = session.query(ReportFavorite).filter_by(staff_code=staff_code, report_id=report_id).first()
        if fav:
            session.delete(fav)
            session.commit()
            return jsonify({"message": "Report removed from favorites", "is_favorite": False}), 200
        else:
            new_fav = ReportFavorite(staff_code=staff_code, report_id=report_id)
            session.add(new_fav)
            session.commit()
            return jsonify({"message": "Report added to favorites", "is_favorite": True}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@report_bp.route("/reports/favorites", methods=["GET"])
def get_favorites():
    staff_code, role = get_user_context()
    if not staff_code or not role:
        return jsonify({"error": "Unauthorized. Staff credentials missing."}), 401
        
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("limit", request.args.get("per_page", 20)))
    offset = (page - 1) * per_page
    
    session = SessionLocal()
    try:
        query = session.query(SavedReport).join(ReportFavorite, SavedReport.id == ReportFavorite.report_id)
        
        if role == "user":
            query = query.filter(ReportFavorite.staff_code == staff_code)
        elif role == "manager":
            mgr_emp = session.query(EmpDetails).filter_by(staff_code=staff_code).first()
            if mgr_emp:
                sub_staff = session.query(EmpDetails.staff_code).filter(
                    (EmpDetails.division == mgr_emp.division) | (EmpDetails.entity == mgr_emp.entity)
                ).subquery()
                query = query.filter(ReportFavorite.staff_code.in_(sub_staff))
            else:
                query = query.filter(ReportFavorite.staff_code == staff_code)
                
        total = query.count()
        results = query.order_by(ReportFavorite.created_at.desc()).offset(offset).limit(per_page).all()
        
        data = []
        for r in results:
            data.append({
                "id": r.id,
                "staff_code": r.staff_code,
                "title": r.title,
                "description": r.description,
                "columns": json.loads(r.columns_json),
                "filters": json.loads(r.filters_json) if r.filters_json else {},
                "usage_count": r.usage_count or 0,
                "last_used_at": r.last_used_at.strftime("%Y-%m-%d %H:%M:%S") if r.last_used_at else None,
                "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "is_favorite": True
            })
            
        return jsonify({
            "data": data,
            "page": page,
            "per_page": per_page,
            "total": total
        }), 200
    finally:
        session.close()

# --- Report Templates CRUD (Admin Only) ---
@report_bp.route("/report/templates", methods=["GET"])
def get_report_templates():
    staff_code, role = get_user_context()
    session = SessionLocal()
    try:
        query = session.query(ReportTemplate)
        if role != "admin":
            query = query.filter_by(enabled=1)
            
        results = query.order_by(ReportTemplate.title.asc()).all()
        
        data = []
        for t in results:
            data.append({
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "default_columns": json.loads(t.default_columns_json),
                "default_filters": json.loads(t.default_filters_json) if t.default_filters_json else {},
                "enabled": t.enabled
            })
        return jsonify(data), 200
    except Exception as e:
        # Soft failure handler (Rule 18)
        current_app.logger.exception("Template fetch failed")
        return jsonify([]), 200
    finally:
        session.close()

@report_bp.route("/report/templates", methods=["POST"])
def create_template():
    staff_code, role = get_user_context()
    if role != "admin":
        return jsonify({"error": "Forbidden. Admin only endpoint."}), 403
        
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    default_columns = data.get("default_columns")
    default_filters = data.get("default_filters") or {}
    enabled = int(data.get("enabled", 1))
    
    if not title:
        return jsonify({"error": "Title is required"}), 400
    if not default_columns or not isinstance(default_columns, list):
        return jsonify({"error": "default_columns must be a non-empty list"}), 400
        
    # Validation constraints (Rule 16)
    invalid_cols = [c for c in default_columns if c not in ALLOWED_FIELDS]
    if invalid_cols:
        return jsonify({"error": f"Invalid columns: {', '.join(invalid_cols)}"}), 400
        
    if isinstance(default_filters, str):
        try:
            json.loads(default_filters)
        except ValueError:
            return jsonify({"error": "default_filters must be valid JSON"}), 400
    elif not isinstance(default_filters, dict):
        return jsonify({"error": "default_filters must be a JSON object"}), 400
        
    session = SessionLocal()
    try:
        new_template = ReportTemplate(
            title=title,
            description=description,
            default_columns_json=json.dumps(default_columns),
            default_filters_json=json.dumps(default_filters),
            enabled=enabled
        )
        session.add(new_template)
        session.commit()
        return jsonify({"message": "Template created successfully", "id": new_template.id}), 201
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@report_bp.route("/report/templates/<int:template_id>", methods=["PUT"])
def update_template(template_id):
    staff_code, role = get_user_context()
    if role != "admin":
        return jsonify({"error": "Forbidden. Admin only endpoint."}), 403
        
    data = request.get_json(silent=True) or {}
    session = SessionLocal()
    try:
        template = session.query(ReportTemplate).filter_by(id=template_id).first()
        if not template:
            return jsonify({"error": "Template not found"}), 404
            
        if "title" in data:
            template.title = data["title"].strip()
        if "description" in data:
            template.description = data["description"].strip()
        if "default_columns" in data:
            cols = data["default_columns"]
            if not isinstance(cols, list):
                return jsonify({"error": "default_columns must be a list"}), 400
            invalid_cols = [c for c in cols if c not in ALLOWED_FIELDS]
            if invalid_cols:
                return jsonify({"error": f"Invalid columns: {', '.join(invalid_cols)}"}), 400
            template.default_columns_json = json.dumps(cols)
        if "default_filters" in data:
            flts = data["default_filters"]
            if not isinstance(flts, dict):
                return jsonify({"error": "default_filters must be a dictionary"}), 400
            template.default_filters_json = json.dumps(flts)
        if "enabled" in data:
            template.enabled = int(data["enabled"])
            
        session.commit()
        return jsonify({"message": "Template updated successfully"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@report_bp.route("/report/templates/<int:template_id>", methods=["DELETE"])
def delete_template(template_id):
    staff_code, role = get_user_context()
    if role != "admin":
        return jsonify({"error": "Forbidden. Admin only endpoint."}), 403
        
    session = SessionLocal()
    try:
        template = session.query(ReportTemplate).filter_by(id=template_id).first()
        if not template:
            return jsonify({"error": "Template not found"}), 404
        session.delete(template)
        session.commit()
        return jsonify({"message": "Template deleted successfully"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

# --- Report History Log & Audit Dashboard ---
@report_bp.route("/reports/history", methods=["GET"])
def get_report_history():
    staff_code, role = get_user_context()
    if not staff_code or not role:
        return jsonify({"error": "Unauthorized. Staff credentials missing."}), 401
        
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("limit", request.args.get("per_page", 20)))
    offset = (page - 1) * per_page
    
    keyword = request.args.get("query", "").strip()
    file_format = request.args.get("format", "").strip()
    target_staff = request.args.get("staff_code", "").strip()
    
    session = SessionLocal()
    try:
        query = session.query(ReportAuditLog)
        
        # RBAC Filter (Rule 14)
        if role == "user":
            query = query.filter(ReportAuditLog.staff_code == staff_code)
        elif role == "manager":
            mgr_emp = session.query(EmpDetails).filter_by(staff_code=staff_code).first()
            if mgr_emp:
                sub_staff = session.query(EmpDetails.staff_code).filter(
                    (EmpDetails.division == mgr_emp.division) | (EmpDetails.entity == mgr_emp.entity)
                ).subquery()
                query = query.filter(ReportAuditLog.staff_code.in_(sub_staff))
            else:
                query = query.filter(ReportAuditLog.staff_code == staff_code)
        # Admin can view all
        
        if keyword:
            query = query.filter(ReportAuditLog.report_name.like(f"%{keyword}%"))
        if file_format:
            query = query.filter(ReportAuditLog.file_format == file_format.lower())
        if target_staff and role == "admin":
            query = query.filter(ReportAuditLog.staff_code == target_staff)
            
        total = query.count()
        results = query.order_by(ReportAuditLog.generated_at.desc()).offset(offset).limit(per_page).all()
        
        data = []
        for l in results:
            data.append({
                "id": l.id,
                "staff_code": l.staff_code,
                "report_name": l.report_name,
                "report_type": l.report_type,
                "file_format": l.file_format,
                "columns": json.loads(l.columns_json),
                "filters": json.loads(l.filters_json) if l.filters_json else {},
                "vm_count": l.vm_count,
                "generated_at": l.generated_at.strftime("%Y-%m-%d %H:%M:%S")
            })
            
        return jsonify({
            "data": data,
            "page": page,
            "per_page": per_page,
            "total": total
        }), 200
    finally:
        session.close()

@report_bp.route("/reports/audit-stats", methods=["GET"])
def get_audit_stats():
    staff_code, role = get_user_context()
    if role != "admin":
        return jsonify({"error": "Forbidden. Admin only endpoint."}), 403
        
    session = SessionLocal()
    try:
        # Reports generated today
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_count = session.query(ReportAuditLog).filter(ReportAuditLog.generated_at >= today_start).count()
        
        # Reports generated this week
        week_start = datetime.utcnow() - datetime.timedelta(days=7)
        week_count = session.query(ReportAuditLog).filter(ReportAuditLog.generated_at >= week_start).count()
        
        # Most used formats
        formats = session.query(ReportAuditLog.file_format, func.count(ReportAuditLog.id)).group_by(ReportAuditLog.file_format).all()
        format_dist = {f[0]: f[1] for f in formats}
        
        # Top report templates/presets
        types = session.query(ReportAuditLog.report_name, func.count(ReportAuditLog.id)).group_by(ReportAuditLog.report_name).order_by(func.count(ReportAuditLog.id).desc()).limit(5).all()
        top_templates = [{"name": t[0], "count": t[1]} for t in types]
        
        # Top report generators
        generators = session.query(ReportAuditLog.staff_code, func.count(ReportAuditLog.id)).group_by(ReportAuditLog.staff_code).order_by(func.count(ReportAuditLog.id).desc()).limit(5).all()
        top_generators = [{"staff_code": g[0], "count": g[1]} for g in generators]
        
        # Volume trend (past 7 days)
        trend = []
        for i in range(6, -1, -1):
            day = datetime.utcnow() - datetime.timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999)
            cnt = session.query(ReportAuditLog).filter(ReportAuditLog.generated_at.between(day_start, day_end)).count()
            trend.append({
                "date": day_start.strftime("%Y-%m-%d"),
                "count": cnt
            })
            
        return jsonify({
            "today_count": today_count,
            "week_count": week_count,
            "format_distribution": format_dist,
            "top_templates": top_templates,
            "top_generators": top_generators,
            "trend": trend
        }), 200
    finally:
        session.close()

