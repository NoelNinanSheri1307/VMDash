from flask import Blueprint, jsonify, request
import paramiko
from .config import *
from datetime import datetime
from proxmox.proxmox_client import get_proxmox_connection
from sqlalchemy import func, and_, desc
from db import SessionLocal
from models.vm_table import Vm
from models.node_table import Node
from models.cluster_table import Cluster
from models.storage_table import Storage
from models.user_table import EmpDetails
from models.relation_tables import VmClusterRelation, VmNodeRelation, VmStorageRelation, VmUserRelation

vms_bp = Blueprint('vms', __name__, url_prefix = '/proxmox/vms')



def get_vm_creation_date(host_ip, vmid):
    try:
        private_key = paramiko.Ed25519Key.from_private_key_file(SSH_KEY_PATH)
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        ssh.connect(hostname = host_ip, username = "root", pkey = private_key, look_for_keys = False, allow_agent = False)

        conf_path = f"/etc/pve/qemu-server/{vmid}.conf"

        cmd = f'stat -c "%w %y" {conf_path}'
        stdin, stdout, stderr = ssh.exec_command(cmd)
        output = stdout.read().decode().strip()

        ssh.close()

        if not output:
            return datetime.now()
        
        birth, modified = output.split(" ", 1)
        if birth == "-":
            birth = modified.strip()
        
        birth = birth.strip()

        main_part = birth.rsplit(" ", 1)[0]
        date = str(main_part.split(".")[0])

        return datetime.strptime(date, "%Y-%m-%d %H:%M:%S")
    

    except Exception as e:
        return datetime.now()



def fetch_vm_details_from_cluster():
    proxmox = get_proxmox_connection()
    cluster = proxmox.cluster.status.get()
    cluster_name = None
    for item in cluster:
        if item.get('type') == 'cluster':
            cluster_name = item.get('name')
            break
    
    vm_node_info, vm_cluster_info, vm_storage_info, vm_info = list(), list(), list(), list()
    for node in proxmox.nodes.get():
        node_name = node['node']
        for vm in proxmox.nodes(node_name).qemu.get():
            vmid = vm.get('vmid', '')

            vm_details = dict()
            vm_details['vm_name'] = vm.get('name', '')
            vm_details['vm_id'] = vmid
            vm_cluster_info.append(cluster_name)
            vm_node_info.append(node_name)

            status = proxmox.nodes(node_name).qemu(vmid).status.current.get()
            config = proxmox.nodes(node_name).qemu(vmid).config.get()

            vm_details['uuid'] = config.get("smbios1", '').split("=")[1]
            
            try:
                guest_agent_config = proxmox.nodes(node_name).qemu(vmid).agent.get("get-host-name")
                vm_details['vm_host_name'] = guest_agent_config.get("result","").get("host-name","")
            except:
                vm_details['vm_host_name'] = ""

            vm_details['live_status'] = status['status'] == 'running'
            vm_details['cpus'] = status.get("cpus", 0)
            vm_details['sockets'] = config.get("sockets", 0)
            vm_details['max_memory'] = status.get('maxmem', 0) / (1024**3)
            vm_details['chipset'] = config.get('machine', '')
            vm_details['gpu'] = False
            vm_details['gpu_info'] = None
            
            current_vm_storages = list()
            for key, value in config.items():
                if key.startswith(("ide", "sata", "scsi", "virtio")):
                    if value.count(",") == 0:
                        strg_name_vlm_name_string, size_string = str(value), None
                    elif value.count(",") == 1:
                        strg_name_vlm_name_string, size_string = value.split(",")
                    else:
                        strg_name_vlm_name_string, _, size_string = value.split(",")

                    if size_string is not None:
                        size = size_string.split("=")[1]
                        storage_name, volume_name = strg_name_vlm_name_string.split(":")
                        current_vm_storages.append([storage_name, volume_name, size])
                    else:
                        current_vm_storages.append([strg_name_vlm_name_string, strg_name_vlm_name_string, size_string])
                
                if key.startswith("hostpci") and ("nvidia" in value.lower()):
                    vm_details['gpu'] = True
                    gpu_info = value.split(",")
                    gpu_string = gpu_info[0].split("=")[1] + "," + gpu_info[1].split("=")[1]
                    vm_details['gpu_info'] = gpu_string
            
            vm_storage_info.append(current_vm_storages)
            
            vm_details['max_disk'] = status.get('maxdisk', 0) / (1024**3)

            vm_os = None
            try:
                info = proxmox.nodes(node_name).qemu(vmid).agent('get-osinfo').get().get("result")
                vm_os = (info.get("pretty-name") or info.get("name"))
            except:
                vm_os = config.get('ostype', '')
            vm_details['os'] = vm_os

            vm_details['mac'] = ""
            vm_details['ip'] = ""
            vm_details['status'] = status.get('status', '')
            vm_details['uptime'] = status.get('uptime', 0)

            try:
                network = proxmox.nodes(node_name).qemu(vmid).agent("network-get-interfaces").get()
                for interface in network.get('result', []):
                    for ips in interface.get('ip-addresses', []):
                        if ips.get('ip-address-type') == 'ipv4' and (ips.get('ip-address').startswith("10.")):
                            vm_details['mac'] = interface.get('hardware-address', '').upper()
                            vm_details['ip'] = ips.get('ip-address')
                            break
            
            except:
                if vm_details['mac'] == "":
                    try:
                        vm_details['mac'] = config.get('net0', '').split(',')[0].split('=')[1]
                    except:
                        vm_details['mac'] = ""
            
            #parsing the notes description to populate data
            notes = config.get("description", "")
            parsed_notes = dict()

            for line in notes.splitlines():
                line = line.strip()
                if not line:
                    continue

                if "-" in line:
                    key, value = line.split("-", 1)
                    parsed_notes[key.strip()] = value.strip() if value else None
            
            
            for key, value in parsed_notes.items():
                if "IP" in key and vm_details["ip"] == "":
                    vm_details["ip"] = value if value else ""
                if "DCV" in key:
                    vm_details["dcv_hostname"] = value
                if "End User Focal Point" in key:
                    vm_details["end_user_focal_point"] = value.upper() if value else None
                if "COM Focal Point" in key:
                    if value and (("sathwik" in value.lower()) or ("reddy" in value.lower()) or ("majji" in value.lower())):
                        vm_details["com_focal_point"] = "vs13691"
                    elif value and ("pritam" in value.lower()):
                        vm_details["com_focal_point"] = "vs14551"
                    elif value and ("aaditya" in value.lower()):
                        vm_details["com_focal_point"] = "vs30217"
                    elif value and ("viji" in value.lower()):
                        vm_details["com_focal_point"] = "vs38015"
                    else:    
                        vm_details["com_focal_point"] = value.upper() if value else None
                if "Request Source" in key:
                    vm_details["request_source"] = value
                if "Display type" in key:
                    vm_details["display_type"] = value
                if "Prometheus" in key:
                    vm_details["prometheus_status"] = value
                if "Softwares" in key:
                    vm_details["software_installed"] = value
            
            vm_info.append(vm_details)

    return vm_node_info, vm_cluster_info, vm_storage_info, vm_info
                


@vms_bp.route('/sync', methods = ['POST'])
def post_vms_data():
    session = SessionLocal()
    try:
        vm_node_info, vm_cluster_info, vm_storage_info, vm_data = fetch_vm_details_from_cluster()

        existing_vm_uuid = list()
        for index in range(len(vm_data)):
            one_vm = vm_data[index]
            existing_data = session.query(Vm).filter_by(uuid = one_vm['uuid']).first()
            vm_node_name = vm_node_info[index]


            vm_cluster_name = vm_cluster_info[index]
            vm_storage_detils = vm_storage_info[index]

            if existing_data:
                existing_vm_uuid.append(one_vm['uuid'])

                existing_data.vm_name = one_vm['vm_name']
                existing_data.vm_id = one_vm['vm_id']
                existing_data.vm_host_name = one_vm['vm_host_name'] if one_vm['vm_host_name'] != "" else existing_data.vm_host_name
                existing_data.live_status = one_vm['live_status']
                existing_data.cpus = one_vm['cpus']
                existing_data.sockets = one_vm['sockets']
                existing_data.max_memory = one_vm['max_memory']
                existing_data.chipset = one_vm['chipset']
                existing_data.max_disk = one_vm['max_disk']
                existing_data.os = one_vm['os'] if one_vm['os'] != "" else existing_data.os
                existing_data.mac = one_vm['mac'] if one_vm['mac'] != "" else existing_data.mac
                existing_data.ip = one_vm['ip'] if one_vm['ip'] != "" else existing_data.ip
                existing_data.status = one_vm['status']
                existing_data.uptime = one_vm['uptime']
                existing_data.gpu = one_vm['gpu']
                existing_data.gpu_info = one_vm['gpu_info']
                existing_data.dcv_hostname = one_vm.get('dcv_hostname', None)
                existing_data.end_user_focal_point = one_vm.get('end_user_focal_point', None)
                existing_data.com_focal_point = one_vm.get('com_focal_point', None)
                existing_data.request_source = one_vm.get('request_source', None)
                existing_data.display_type = one_vm.get('display_type', None)
                existing_data.prometheus_status = one_vm.get('prometheus_status', None)
                existing_data.software_installed = one_vm.get('software_installed', None)

                # node_query = (session
                #               .query(VmNodeRelation.node_name, VmNodeRelation.cluster_name, Node.ip)
                #               .join(Node, (VmNodeRelation.node_name == Node.node_name) & (VmNodeRelation.cluster_name == Node.cluster_name))
                #               .filter(VmNodeRelation.uuid == one_vm["uuid"])
                #               .order_by(desc(VmNodeRelation.updated_at))
                #               .first()
                #             )
                # host_ip = node_query.ip
                # existing_data.created_date = get_vm_creation_date(host_ip, one_vm["vm_id"])


                cluster_entry = session.query(VmClusterRelation).filter_by(uuid = one_vm['uuid'], cluster_name = vm_cluster_name).order_by(VmClusterRelation.initial_at.desc()).first()
                if cluster_entry:
                    cluster_entry.updated_at = datetime.now()
                else:
                    existing_data.cluster_vm.append(VmClusterRelation(uuid = one_vm['uuid'], cluster_name = vm_cluster_name, initial_at = datetime.now(), updated_at = datetime.now()))


                node_entry = session.query(VmNodeRelation).filter_by(uuid = one_vm['uuid'], cluster_name = vm_cluster_name, node_name = vm_node_name).order_by(VmNodeRelation.initial_at.desc()).first()
                if node_entry:
                    node_entry.updated_at = datetime.now()
                else:
                    existing_data.node_vm.append(VmNodeRelation(uuid = one_vm['uuid'], cluster_name = vm_cluster_name, node_name = vm_node_name, initial_at = datetime.now(), updated_at = datetime.now()))
                

                for item in vm_storage_detils:
                    vm_storage_name, vm_volume_name, vm_size = item[0], item[1], item[2]
                    storage_exists = (session.query(Storage).filter_by(storage_name = vm_storage_name, node_name = vm_node_name, cluster_name = vm_cluster_name).first())
                    if storage_exists:
                        storage_entry = session.query(VmStorageRelation).filter_by(uuid = one_vm['uuid'], cluster_name = vm_cluster_name, storage_name = vm_storage_name, node_name = vm_node_name, vm_disk_image = vm_volume_name).order_by(VmStorageRelation.initial_at.desc()).first()
                        if storage_entry:
                            storage_entry.size = vm_size
                            storage_entry.updated_at = datetime.now()
                        else:
                            existing_data.storage_vm.append(VmStorageRelation(uuid = one_vm['uuid'], cluster_name = vm_cluster_name, storage_name = vm_storage_name, node_name = vm_node_name, vm_disk_image = vm_volume_name, size = vm_size, initial_at = datetime.now(), updated_at = datetime.now()))

            else:
                new_vm = Vm(**one_vm)

                node_query = (session.query(Node).filter_by(node_name = vm_node_name, cluster_name = vm_cluster_name).first())
                host_ip = node_query.ip
                new_vm.created_date = get_vm_creation_date(host_ip, one_vm["vm_id"])
                
                new_vm.cluster_vm.append(VmClusterRelation(uuid = one_vm['uuid'], cluster_name = vm_cluster_name, initial_at = datetime.now(), updated_at = datetime.now()))
                new_vm.node_vm.append(VmNodeRelation(uuid = one_vm['uuid'], cluster_name = vm_cluster_name, node_name = vm_node_name, initial_at = datetime.now(), updated_at = datetime.now()))
                
                for item in vm_storage_detils:
                    vm_storage_name, vm_volume_name, vm_size = item[0], item[1], item[2]
                    storage_exists = (session.query(Storage).filter_by(storage_name = vm_storage_name, node_name = vm_node_name, cluster_name = vm_cluster_name).first())
                    if storage_exists:
                        new_vm.storage_vm.append(VmStorageRelation(uuid = one_vm['uuid'], cluster_name = vm_cluster_name, storage_name = vm_storage_name, node_name = vm_node_name, vm_disk_image = vm_volume_name, size = vm_size, initial_at = datetime.now(), updated_at = datetime.now()))               
                session.add(new_vm)
        
        # non existing vms update
        db_vm_uuids = session.query(Vm.uuid).all()
        uuid_list = [uuid for (uuid,) in db_vm_uuids]
        non_existing_vms = 0
        for uuid in uuid_list:
            if uuid not in existing_vm_uuid:
                existing_data = session.query(Vm).filter_by(uuid = uuid).first()
                existing_data.status = "deleted"
                non_existing_vms += 1

        session.commit()
        return jsonify({"message ": f"{len(vm_data) + non_existing_vms} VMs successfully synced"})
    
    finally:
        session.close()


@vms_bp.route("/<uuid>/users", methods = ["GET"])
def get_vm_users(uuid):
    session = SessionLocal()
    try:
        results = (
            session.query(
                EmpDetails.staff_code,
                EmpDetails.name,
                EmpDetails.entity,
                EmpDetails.groupname,
                EmpDetails.division
            )
            .join(
                VmUserRelation,
                VmUserRelation.staff_code == EmpDetails.staff_code
            )
            .filter(VmUserRelation.uuid == uuid)
            .all()
        )

        users = [
            {
                "staff_code": u.staff_code,
                "name": u.name,
                "entity": u.entity,
                "group": u.groupname,
                "division": u.division,
            }
            for u in results
        ]

        return jsonify(users), 250
    
    except Exception as e:
        return jsonify(e)
    
    finally:
        session.close()



@vms_bp.route("/<uuid>/addUsers", methods = ["POST"])
def add_users(uuid):
    data = request.get_json()
    users = data.get("users", [])

    if not users:
        return jsonify({"error": "No users provided"}), 400
    
    session = SessionLocal()

    num_users = 0
    for user in users:
        existing_data = session.query(VmUserRelation).filter_by(uuid = uuid, staff_code = user["staff_code"]).order_by(desc(VmUserRelation.initial_at)).first()
        if existing_data and existing_data.deleted_at is None:
            continue

        new_user = VmUserRelation(uuid = uuid, staff_code = user["staff_code"], initial_at = datetime.now())
        num_users += 1
        session.add(new_user)
    
    session.commit()
    session.close()

    return jsonify({"message ": f"{num_users} users added successfully"})



@vms_bp.route("/<uuid>/removeUsers", methods = ["POST"])
def remove_users(uuid):
    data = request.get_json(silent = True)
    if not data:
        return jsonify({"error": "staff codes not entered"}), 400
    
    staff_codes = data["staff_codes"]
    if not isinstance(staff_codes, list) or len(staff_codes) == 0:
        return jsonify({"error": "staff_codes must be a non empty list"}), 400
    
    session = SessionLocal()

    try:
        deleted_count = (
            session.query(VmUserRelation)
            .filter(
                VmUserRelation.uuid == uuid,
                VmUserRelation.staff_code.in_(staff_codes)
            )
            .delete(synchronize_session = False)
        )
        session.commit()

        return jsonify({"message": f'Removed {deleted_count} users for the vm {uuid}'}), 200
    
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    
    finally:
        session.close()


@vms_bp.route('/vmData', methods = ['GET'])
def all_vms_json_data():

    session = SessionLocal()
    latest_node_subq = (
        session.query(
            VmNodeRelation.uuid,
            func.max(VmNodeRelation.updated_at).label("latest_node_time")
        )
        .group_by(VmNodeRelation.uuid)
        .subquery()
    )

    latest_node = (
        session.query(VmNodeRelation)
        .join(
            latest_node_subq,
            and_(
                VmNodeRelation.uuid == latest_node_subq.c.uuid,
                VmNodeRelation.updated_at == latest_node_subq.c.latest_node_time
            )
        )
        .subquery()
    )

    results = (
        session.query(
            Vm.vm_id,
            Vm.uuid,
            Vm.vm_name,
            Vm.vm_host_name,
            VmClusterRelation.cluster_name.label("cluster_name"),
            latest_node.c.node_name.label("node_name"),
            Vm.status.label("status"),
            Vm.ip,
            Vm.mac,
            Vm.cpus,
            Vm.max_memory,
            Vm.max_disk,
            Vm.gpu,
            Vm.created_date,
            Vm.request_source,
        )
        .join(VmClusterRelation, VmClusterRelation.uuid == Vm.uuid)
        .join(Cluster, VmClusterRelation.cluster_name == Cluster.cluster_name)
        .join(latest_node, latest_node.c.uuid == Vm.uuid)
        .join(
            Node, 
            and_(
                latest_node.c.cluster_name == Node.cluster_name,
                latest_node.c.node_name == Node.node_name,
            )
        )
        .all()
    )

    vms = list()

    for vm in results:
        vms.append({
            "vm_id": vm.vm_id,
            "vm_uuid": vm.uuid,
            "vm_name": vm.vm_name,
            "vm_host_name": vm.vm_host_name,
            "cluster_name": vm.cluster_name,
            "node_name": vm.node_name,
            "status": vm.status,
            "vm_ip": vm.ip,
            "vm_mac": vm.mac,
            "vm_cpu": vm.cpus,
            "vm_max_mem": vm.max_memory,
            "vm_max_disk": vm.max_disk,
            "vm_gpu": vm.gpu,
            "vm_created_date": vm.created_date.strftime("%Y-%m-%d %H:%M:%S"),
            "Vm_request_source":vm.request_source,
        })
    
    session.close()

    return jsonify(vms)



@vms_bp.route("/vmData/<uuid>", methods = ['GET'])
def one_vm_json_data(uuid):
    session = SessionLocal()

    vm = session.query(Vm).filter_by(uuid = uuid).first()
    if not vm:
        string = "error: VM with uuid " +  str(uuid) + " not found"
        return jsonify(string), 400

    latest_node_entry = (
        session.query(VmNodeRelation)
        .filter(VmNodeRelation.uuid == uuid)
        .order_by(VmNodeRelation.updated_at.desc())
        .first()
    )

    latest_storage_subq = (
        session.query(
            VmStorageRelation.vm_disk_image.label("vm_disk_image"),
            func.max(VmStorageRelation.updated_at).label("latest_time"),
        )
        .filter(VmStorageRelation.uuid == uuid)
        .group_by(VmStorageRelation.vm_disk_image)
        .subquery()
    )

    latest_storage_records = (
        session.query(VmStorageRelation)
        .join(
            latest_storage_subq,
            and_ (
                VmStorageRelation.vm_disk_image == latest_storage_subq.c.vm_disk_image,
                VmStorageRelation.updated_at == latest_storage_subq.c.latest_time,
                VmStorageRelation.uuid == uuid,
            ),
        )
        .all()
    )

    storage_status = (
        session.query(
            VmStorageRelation.vm_disk_image,
            Storage.live_status
        )
        .join(Storage, (
            (VmStorageRelation.cluster_name == Storage.cluster_name) &
            (VmStorageRelation.storage_name == Storage.storage_name) &
            (VmStorageRelation.node_name == Storage.node_name)
        ))
        .filter(VmStorageRelation.uuid == uuid)
        .all()
    )

    
    users_subq = (
        session.query(
            VmUserRelation.uuid,
            VmUserRelation.staff_code,
            func.max(VmUserRelation.initial_at).label("max_initial")
        )
        .filter(VmUserRelation.uuid == uuid)
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


    vm_data = {
        "vm_uuid": vm.uuid,
        "vm_name": vm.vm_name,
        "vm_host_name": vm.vm_host_name,
        "vm_id": vm.vm_id,
        "cpus": vm.cpus,
        "sockets": vm.sockets,
        "max_memory": vm.max_memory,
        "chipset": vm.chipset,
        "max_disk": vm.max_disk,
        "os": vm.os,
        "mac": vm.mac,
        "ip": vm.ip,
        "status": vm.status,
        "uptime": getattr(vm, "uptime", None),
        "live_status": vm.live_status,
        "cluster_name": latest_node_entry.cluster_name,
        "node_name": latest_node_entry.node_name,
        "gpu": vm.gpu,
        "gpu_info": vm.gpu_info,
        "created_date": vm.created_date.strftime("%Y-%m-%d %H:%M:%S"),
        "request_source": vm.request_source,
        "com_focal_point": vm.com_focal_point,
        "dcv_hostname": vm.dcv_hostname,
        "end_user_focal_point": vm.end_user_focal_point,
        "display_type": vm.display_type,
        "prometheus_status": vm.prometheus_status,
        "software_installed": vm.software_installed,
        "initial_node_entry_time": latest_node_entry.initial_at.strftime("%Y-%m-%d %H:%M:%S"),
        "updated_node_entry_time": latest_node_entry.updated_at.strftime("%Y-%m-%d %H:%M:%S"),
        "storages": [
            {
                "disk_image": s.vm_disk_image,
                "storage_name": s.storage_name,
                "size": s.size,
                "initial_storage_entry_time": s.initial_at.strftime("%Y-%m-%d %H:%M:%S"),
                "updated_storage_entry_time": s.updated_at.strftime("%Y-%m-%d %H:%M:%S"),
            }
            for s in latest_storage_records
        ],
        "user_info": [
            {
                "staff_code": u.staff_code,
                "name": u.name,
                "entity": u.entity,
                "group": u.groupname,
                "division": u.division,
            }
            for _, u in user_info
        ],
    }

    for item in storage_status:
        vm_storages = vm_data["storages"]
        for index in range(len(vm_storages)):
            if vm_storages[index]["disk_image"] == item.vm_disk_image:
                vm_storages[index]["live_status"] = "active" if item.live_status else "inactive"
                break
        vm_data["storages"] = vm_storages

    session.close()
    return jsonify(vm_data)



@vms_bp.route('/', methods = ['GET'])
def vms_data():

    session = SessionLocal()

    try:
        vms_info = list()
        vm_details = session.query(Vm).all()

        for vm in vm_details:
            temp = dict()
            temp['uuid'] = vm.uuid
            temp['vm_name'] = vm.vm_name
            temp['vm_id'] = vm.vm_id
            temp['vm_host_name'] = vm.vm_host_name
            temp['cpus'] = vm.cpus
            temp['sockets'] = vm.sockets
            temp['max_memory'] = vm.max_memory
            temp['chipset'] = vm.chipset
            temp['max_disk'] = vm.max_disk
            temp['os'] = vm.os
            temp['mac'] = vm.mac
            temp['ip'] = vm.ip
            temp['status'] = vm.status
            temp['uptime'] = vm.uptime
            temp['live_status'] = vm.live_status
            temp['gpu'] = vm.gpu
            temp['gpu_info'] = vm.gpu_info
            temp['created_date'] = vm.created_date

            vms_info.append(temp)
        
        session.close()

        return jsonify(vms_info)
    
    except Exception as e:
        return jsonify({"error ": str(e)}), 500
