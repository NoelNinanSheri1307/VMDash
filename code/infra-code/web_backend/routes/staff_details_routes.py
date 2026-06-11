from flask import Blueprint, request, jsonify
from db import SessionLocal
from models.emp_table import EmpDetails

employee_bp = Blueprint("employee_bp", __name__)

@employee_bp.route("/staff/search", methods = ["GET"])
def search_staff():
    prefix = request.args.get("q", "").strip()
    if not prefix:
        return jsonify([])
    
    try:
        session = SessionLocal()
        results = (
            session.query(EmpDetails)
            .filter(EmpDetails.staff_code.like(f"{prefix}%"))
            .limit(10)
            .all()
        )

        return jsonify([
            {
                "staff_code": emp.staff_code,
                "name": emp.name,
                "center": "VSSC",
                "entity": emp.entity,
                "groupname": emp.groupname,
                "division": emp.division,
                "section": "",
            }
            for emp in results
        ])
    except Exception as e:
        return jsonify({"error": str(e)}), 500