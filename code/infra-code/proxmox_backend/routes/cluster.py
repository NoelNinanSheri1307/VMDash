from flask import Blueprint, jsonify, request
from proxmox.proxmox_client import get_proxmox_connection
from db import SessionLocal
from models.cluster_table import Cluster

cluster_bp = Blueprint('cluster', __name__, url_prefix = '/proxmox/cluster')


def get_cluster_info():
    proxmox = get_proxmox_connection()
    cluster = proxmox.cluster.status.get()
    cluster_info = list()
    
    current_cluster_info = dict()
    for item in cluster:
        if item.get('type') == 'cluster':
            current_cluster_info['cluster_name'] = item.get('name')
            # current_cluster_info['live_status'] = True
            
    cluster_info.append(current_cluster_info)
    
    return cluster_info



@cluster_bp.route('/sync', methods = ['POST'])
def post_cluster_data():
    session = SessionLocal()

    try:
        cluster_info = get_cluster_info()
        for cluster in cluster_info:
            current_cluster = session.query(Cluster).filter_by(cluster_name = cluster['cluster_name']).first()
            if current_cluster:
                for key, value in cluster.items():
                    db_value = getattr(current_cluster, key, None)
                    if db_value != value:
                        setattr(current_cluster, key, value)
            else:
                new_cluster = Cluster(**cluster)
                session.add(new_cluster)
        
        session.commit()
        return jsonify({"message ": f"{len(cluster_info)} Clusters successfully synced"})
    
    except Exception as e:
        session.rollback()
        return jsonify({"error ": str(e)}), 500
    
    finally:
        session.close()


@cluster_bp.route('/add', methods = ['POST'])
def add_cluster():
    data = request.json

    input_cluster_name = data.get("name")
    input_cluster_ip = data.get("ip")
    input_cluster_token = data.get("token")
    
    session = SessionLocal()

    existing_data = session.query(Cluster).filter_by(cluster_name = input_cluster_name).all()
    if existing_data:
        session.close()
        return jsonify(f"Cluster with name {input_cluster_name} already exists"), 500
    
    new_cluster = Cluster(cluster_name = input_cluster_name, cluster_ip = input_cluster_ip, proxmox_token = input_cluster_token)
    session.add(new_cluster)

    session.commit()
    session.close()
    return jsonify(f"Successfully added cluster {input_cluster_name}")



@cluster_bp.route('/', methods = ['GET'])
def proxmox_cluster_info():
    session = SessionLocal()

    try:
        clusters_info = list()
        cluster_details = session.query(Cluster).all()

        for cluster in cluster_details:
            temp = dict()
            temp['cluster_name'] = cluster.cluster_name
            # temp['live_status'] = cluster.live_status
            clusters_info.append(temp)
        
        session.close()

        return jsonify(clusters_info)
    
    except Exception as e:
        return jsonify({"error ": str(e)}), 500


@cluster_bp.route('/<cluster_name>/delete', methods = ['DELETE'])
def delete_cluster(cluster_name):
    session = SessionLocal()
    try:
        cluster = session.query(Cluster).filter_by(cluster_name = cluster_name).first()
        if not cluster:
            session.close()
            return jsonify({"error": f"Cluster with name {cluster_name} not found"}), 404
        
        session.delete(cluster)
        session.commit()
        return jsonify({"message": f"Successfully deleted cluster {cluster_name}"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


    # proxmox = get_proxmox_connection()
    # try:
    #     return jsonify({
    #         "status": proxmox.cluster.status.get(),
    #         # "resources": proxmox.cluster.resources.get(),
    #         # "nodes": proxmox.cluster.config.nodes.get(),
    #         # "tasks": proxmox.cluster.tasks.get(),
    #         # "backup": proxmox.cluster.backup.get(),
    #         # "log": proxmox.cluster.log.get(),
    #         # "replication": proxmox.cluster.replication.get(),
    #         # "ha_status": proxmox.cluster.ha.status.get(),
    #         # "ha_resources": proxmox.cluster.ha.resources.get(),
    #         # "ha_groups": proxmox.cluster.ha.groups.get()
    #     })
    # except Exception as e:
    #     return jsonify({"error ": str(e)}), 500
