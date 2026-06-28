from flask import Blueprint, jsonify
from proxmox.proxmox_client import get_proxmox_connection
from db import SessionLocal
from sqlalchemy import select
from models.cluster_table import Cluster
from models.storage_table import Storage

storage_bp = Blueprint('storage', __name__, url_prefix = '/proxmox/storage')


def fetch_storage_details_from_cluster(cluster_name):
    proxmox = get_proxmox_connection(cluster_name)
    cluster = proxmox.cluster.status.get()
    cluster_name = None

    for item in cluster:
        if item.get('type') == 'cluster':
            cluster_name = item.get('name')
            break
    
    datacentre_storages = proxmox.storage.get()

    storage_info = list()
    for node in proxmox.nodes.get():
        node_name = node['node']

        for storage in proxmox.nodes(node_name).storage.get():
            storage_details = dict()
            storage_details['cluster_name'] = cluster_name
            storage_details['node_name'] = node_name
            storage_details['storage_name'] = storage['storage']
            storage_details['live_status'] = proxmox.nodes(node_name).storage(storage['storage']).status.get().get('active', 0) == 1
            storage_details['total_size'] = storage.get('total', 0) / (1024**3)
            
            status = proxmox.nodes(node_name).storage(storage['storage']).status.get()
            storage_details['storage_type'] = status.get("type", "")
            storage_details['content'] = status.get("content", "")
            storage_details['storage_server_ip'] = ""
            storage_details['storage_datastore'] = ""

            for datacentre_storage in datacentre_storages:
                if (datacentre_storage["type"] == status.get("type", "")) and (datacentre_storage["storage"] == storage['storage']) and ("server" in datacentre_storage):
                    try:
                        storage_details['storage_server_ip'] = datacentre_storage["server"]
                        storage_details['storage_datastore'] = datacentre_storage["datastore"]
                    except:
                        storage_details['storage_server_ip'] = ""
                        storage_details['storage_datastore'] = ""
            
            storage_info.append(storage_details)
        
    return storage_info


@storage_bp.route('/sync', methods = ['POST'])
def post_storage_data():
    session = SessionLocal()
    try:
        clusters = session.scalars(select(Cluster)).all()
        cluster_count = 0
        storage_count = 0

        for cluster in clusters:
            storage_data = fetch_storage_details_from_cluster(cluster.cluster_name)

            for storage in storage_data:
                existing_data = session.query(Storage).filter_by(cluster_name = storage['cluster_name'], storage_name = storage['storage_name'], node_name = storage['node_name']).first()
                if existing_data:
                    existing_data.total_size = storage['total_size']
                    existing_data.storage_type = storage['storage_type']
                    existing_data.content = storage['content']
                    existing_data.storage_server_ip = storage['storage_server_ip']
                    existing_data.storage_datastore = storage['storage_datastore']
                    existing_data.live_status = storage['live_status']
                else:
                    new_node = Storage(**storage)
                    session.add(new_node)
        
            cluster_count += 1
            storage_count += len(storage_data)
        
        session.commit()
        return jsonify({"message ": f"{storage_count} storages successfully synced across {cluster_count} clusters"})
    
    except Exception as e:
        session.rollback()
        return jsonify({"error ": str(e)}), 500
    
    finally:
        session.close()



@storage_bp.route('/', methods = ['GET'])
def storage_info():
    session = SessionLocal()

    try:
        storage_info = list()
        storage_details = session.query(Storage).all()

        for storage in storage_details:
            temp = dict()
            temp['cluster_name'] = storage.cluster_name
            temp['storage_name'] = storage.storage_name
            temp['node_name'] = storage.node_name
            temp['total_size'] = storage.total_size
            temp['storage_type'] = storage.storage_type
            temp['content'] = storage.content
            temp['storage_server_ip'] = storage.storage_server_ip
            temp['storage_datastore'] = storage.storage_datastore
            temp['live_status'] = storage.live_status
            

            storage_info.append(temp)
        
        session.close()

        return jsonify(storage_info)

    except Exception as e:
        return jsonify({"error ": str(e)}), 500



    # try:
    #     storage_info = fetch_storage_details_from_cluster()
    #     return jsonify(storage_info)
    # proxmox = get_proxmox_connection()
    # try:
    #     storage_info = []
    #     for node in proxmox.nodes.get():
    #         node_name = node['node']
    #         for storage in proxmox.nodes(node_name).storage.get():
    #             storage_name = storage['storage']
    #             storage_info.append({
    #                 "node": node_name,
    #                 "storage": storage_name,
    #                 # "status": proxmox.nodes(node_name).storage(storage_name).status.get(),
    #                 "content": proxmox.storage.get(),
    #             })
    #     return jsonify(storage_info)
    #     storage = proxmox.storage.get()
    #     return jsonify(storage)
    
    # except Exception as e:
    #     return jsonify({"error ": str(e)}), 500