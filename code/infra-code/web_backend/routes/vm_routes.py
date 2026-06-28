from flask import Blueprint, request, jsonify
from db import SessionLocal
from models.vm_table import Vm
from models.user_table import User

vm_bp = Blueprint('vm_bp', __name__)


@vm_bp.route('/vms', methods=['GET'])
def get_vms():
    session = SessionLocal()
    vms = session.query(Vm).all()
    result = []
    # for vm in vms:
    #     result.append({
    #         "vm_name": vm.vm_name,
    #         "host_name": vm.host_name,
    #         "environment": vm.environment,
    #         "cluster": vm.cluster,
    #         "ram": vm.ram,
    #         "cores": vm.cores,
    #         "ip_address": vm.ip,
    #         "mac_address": vm.mac,
    #         "os_type": vm.os,
    #         "disk_size": vm.disk_size,
    #         "source": vm.source,
    #         "request_source": getattr(vm, "request_source", None),
    #         "time_created": vm.time_created,
    #         "gpu": vm.gpu,
    #         "users": [{"staff_code": u.staff_code, "name": u.name, "center": u.center, "entity": u.entity, "groupname": u.groupname, "division": u.division, "section": u.section} 
    #                     for u in vm.users]
    #     })
    session.close()
    return jsonify(result)


@vm_bp.route('/vms', methods=['POST'])
def add_vm():
    session = SessionLocal()
    data = request.get_json()
    users_data = data.pop('users', [])

    vm = Vm(**data)
    session.add(vm)
    session.commit()

    for u in users_data:
        user_obj = session.query(User).filter_by(staff_code = u['staff_code']).first()
        if not user_obj:
            user_obj = User(staff_code = u['staff_code'], name = u['name'], center = u['center'], entity = u['entity'], groupname = u['groupname'], division = u['division'], 
                            section = u['section'])
            session.add(user_obj)
            session.commit()
        vm.users.append(user_obj)
    session.commit()

    vm_name_print = vm.vm_name
    session.close()

    return jsonify({"message": "VM added successfully", "vm_name": vm_name_print})

