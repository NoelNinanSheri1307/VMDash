from flask import Blueprint, jsonify
from sqlalchemy import func, and_
from db import SessionLocal
from models.vm_table import Vm
from models.relation_tables import VmNodeRelation, VmClusterRelation

visualization_bp = Blueprint('visualization', __name__, url_prefix='/proxmox')

@visualization_bp.route('/visualization', methods=['GET'])
def vm_visualization_data():
    session = SessionLocal()

    # Get latest node per VM
    latest_node_subq = (
        session.query(
            VmNodeRelation.uuid,
            func.max(VmNodeRelation.updated_at).label("latest_time")
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
                VmNodeRelation.updated_at == latest_node_subq.c.latest_time
            )
        )
        .subquery()
    )

    # Fetch only fields needed for visualization
    results = (
        session.query(
            Vm.os,
            Vm.status,
            Vm.gpu,
            Vm.request_source,
            VmClusterRelation.cluster_name,
            latest_node.c.node_name,
            latest_node.c.updated_at
        )
        .join(VmClusterRelation, VmClusterRelation.uuid == Vm.uuid)
        .join(latest_node, latest_node.c.uuid == Vm.uuid)
        .all()
    )

    # Helper function to count occurrences
    def count_by_key(data, key_fn):
        counts = {}
        for item in data:
            key = key_fn(item)
            key = str(key).lower() if key is not None else "unknown"
            counts[key] = counts.get(key, 0) + 1
        return counts

    # OS-specific logic
    def map_os(os_name):
        os_name = (os_name or "").lower()
        if any(keyword in os_name for keyword in ["linux", "ubuntu", "debian", "centos", "redhat", "fedora", "rhel", "rocky", "alma", "l26"]):
            return "Linux"
        elif any(keyword in os_name for keyword in ["windows", "win"]):
            return "Windows"
        else:
            return "Other"

    # NARC-specific logic
    def map_narc(request_source):
        if request_source is None or request_source == "":
            return "Narc"
        return request_source

    def count_by_cluster_node_key(data, key_fn, cluster_fn, node_fn):
        counts = {}
        for item in data:
            key = key_fn(item)
            key = str(key).lower() if key is not None else "unknown"
            cluster = cluster_fn(item)
            cluster = str(cluster).lower() if cluster is not None else "unknown"
            node = node_fn(item)
            node = str(node).lower() if node is not None else "unknown"

            if cluster not in counts:
                counts[cluster] = {}
            if node not in counts[cluster]:
                counts[cluster][node] = {}
            counts[cluster][node][key] = counts[cluster][node].get(key, 0) + 1
        return counts
    
    max_updated_at = max((r.updated_at for r in results), default=None)
    print('date',max_updated_at)
    
    visualization_data = {
        "os": count_by_cluster_node_key(results, lambda x: map_os(x.os), lambda x: x.cluster_name, lambda x: x.node_name),
        "gpu": count_by_cluster_node_key(results, lambda x: x.gpu, lambda x: x.cluster_name, lambda x: x.node_name),
        "request_source": count_by_cluster_node_key(results, lambda x: map_narc(x.request_source), lambda x: x.cluster_name, lambda x: x.node_name),
        "status": count_by_cluster_node_key(results, lambda x: x.status, lambda x: x.cluster_name, lambda x: x.node_name),
        "cluster": count_by_key(results, lambda x: x.cluster_name),
        "node": count_by_cluster_node_key(results, lambda x: x.node_name, lambda x: x.cluster_name, lambda x: x.node_name),
        "updated_at":  max_updated_at.isoformat() if max_updated_at else None,
        }
    session.close()
    return jsonify(visualization_data)
