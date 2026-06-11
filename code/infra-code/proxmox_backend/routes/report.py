from flask import Blueprint, request, jsonify, Response
from sqlalchemy import func, and_
from datetime import datetime
import csv
import io
import html

from db import SessionLocal
from models.vm_table import Vm
from models.storage_table import Storage
from models.user_table import EmpDetails
from models.relation_tables import VmNodeRelation, VmStorageRelation, VmUserRelation

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
                "name": emp.name
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

    # JSON
    if file_format == "json":
        filtered = []
        for r in rows:
            item = {}
            for f in selected_fields:
                item[f] = row_value_for_export(r, f)
            filtered.append(item)
        return jsonify(filtered)

    # CSV
    if file_format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)

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
        return Response(
            html_table,
            mimetype="application/vnd.ms-excel",
            headers={"Content-Disposition": "attachment; filename=vm-report.xls"}
        )

    # PDF (backend printable HTML)
    generated = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    html_table = build_html_table(rows, selected_fields)

    html_doc = f"""
    <html>
    <head>
      <title>VM Report</title>
      <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        h1 {{ color: #333; }}
        p {{ margin: 0 0 10px 0; }}
      </style>
    </head>
    <body>
      <h1>Virtual Machine Report</h1>
      <p><b>Generated:</b> {generated}</p>
      <p><b>Total VMs:</b> {len(rows)}</p>
      {html_table}
      <script>
        window.onload = () => window.print();
      </script>
    </body>
    </html>
    """

    return Response(html_doc, mimetype="text/html")
