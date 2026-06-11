from flask import Blueprint, jsonify
from proxmox.proxmox_client import get_proxmox_connection
from db import SessionLocal
from models.node_table import Node

nodes_bp = Blueprint('nodes', __name__, url_prefix = '/proxmox/nodes')


def fetch_node_details_from_cluster():
    proxmox = get_proxmox_connection()
    cluster = proxmox.cluster.status.get()
    cluster_name = None

    for item in cluster:
        if item.get('type') == 'cluster':
            cluster_name = item.get('name')
            break
    
    node_info = list()
    for node in proxmox.nodes.get():
        node_name = node['node']

        node_details = dict()

        node_details['node_name'] = node_name
        node_details['cluster_name'] = cluster_name
        node_details['total_cores'] = node.get('maxcpu', 0)

        node_info_field = proxmox.nodes(node_name).status.get()

        node_details['live_status'] = node.get('status') == 'online'
        node_details['model'] = node_info_field.get('cpuinfo').get("model")
        node_details['total_mem'] = node_info_field.get('memory').get("total")
        node_details['hypervisor'] = node_info_field.get('pveversion')
        node_details['uptime'] = node_info_field.get('uptime')

        network = proxmox.nodes(node_name).network.get()

        node_details['ip'] = ""
        
        for interfaces in network:
            address = interfaces.get("address")
            if address and address.startswith("10."):
                node_details['ip'] = address
                break
        
        node_info.append(node_details)
    
    return node_info



@nodes_bp.route('/sync', methods = ['POST'])
def post_nodes_data():
    session = SessionLocal()
    try:
        node_data = fetch_node_details_from_cluster()

        for one_node in node_data:
            existing_data = session.query(Node).filter_by(cluster_name = one_node['cluster_name'], node_name = one_node['node_name']).first()
            if existing_data:
                existing_data.model = one_node['model']
                existing_data.total_mem = one_node['total_mem']
                existing_data.total_cores = one_node['total_cores']
                existing_data.hypervisor = one_node['hypervisor']
                existing_data.uptime = one_node['uptime']
                existing_data.ip = one_node['ip']
                existing_data.live_status = one_node['live_status']
            else:
                new_node = Node(**one_node)
                session.add(new_node)
        
        session.commit()
        return jsonify({"message ": f"{len(node_data)} nodes successfully synced"})
    
    except Exception as e:
        session.rollback()
        return jsonify({"error ": str(e)}), 500
    
    finally:
        session.close()



@nodes_bp.route('/', methods = ['GET'])
def nodes_info():
    session = SessionLocal()

    try:
        node_info = list()
        node_details = session.query(Node).all()

        for node in node_details:
            temp = dict()
            temp['cluster_name'] = node.cluster_name
            temp['node_name'] = node.node_name
            temp['model'] = node.model
            temp['total_mem'] = node.total_mem
            temp['total_cores'] = node.total_cores
            temp['hypervisor'] = node.hypervisor
            temp['uptime'] = node.uptime
            temp['ip'] = node.ip
            temp['live_status'] = node.live_status

            node_info.append(temp)
        
        session.close()

        return jsonify(node_info)

    except Exception as e:
        return jsonify({"error ": str(e)}), 500





    # proxmox = get_proxmox_connection()
    # try:
    #     nodes_info = []
    #     for node in proxmox.nodes.get():
    #         node_name = node['node']
    #         nodes_info.append({
    #             # "info": proxmox.nodes(node_name).status.get(),
    #             # # "report": proxmox.nodes(node_name).report.get(),
    #             # "services": proxmox.nodes(node_name).services.get(),              <---------- clarification needed on whether to keep or not
    #             # "subscription": proxmox.nodes(node_name).subscription.get(),
    #              "network": proxmox.nodes(node_name).network.get(),#                <---------- clarification needed on whether to keep all interfaces (by making child table)
    #             # "firewall": proxmox.nodes(node_name).firewall.rules.get(),
    #             # # "syslog": proxmox.nodes(node_name).syslog.get(),
    #             # "journal": proxmox.nodes(node_name).journal.get(),
    #             # "dns": proxmox.nodes(node_name).dns.get(),
    #             # "time": proxmox.nodes(node_name).time.get(),
    #             # "vms": proxmox.nodes(node_name).qemu.get(),
    #         })
    #     return jsonify(nodes_info)
    # except Exception as e:
    #     return jsonify({"error ": str(e)}), 500