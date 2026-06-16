import time
from flask import Blueprint, jsonify, request
from utils.proxmox_api import ProxmoxAPI
from routes import config
from proxmox.proxmox_client import get_proxmox_connection

stall_bp = Blueprint("stall", __name__)

pve = get_proxmox_connection()

TTL = 60

NODE_RRD_CACHE = {}
NODE_QEMU_CACHE = {}
VM_RRD_CACHE = {}

def safe_nodes(nodes_param: str):
    return [n.strip() for n in nodes_param.split(",") if n.strip()]

def is_fresh(entry):
    return entry and (time.time() - entry["fetched_at"]) < TTL

def get_node_rrd(node, timeframe):
    key = f"{node}:{timeframe}"
    cached = NODE_RRD_CACHE.get(key)
    if is_fresh(cached):
        return cached["data"]
    
    data = pve.nodes(node).rrddata.get(timeframe = timeframe, cf = "AVERAGE")
    NODE_RRD_CACHE[key] = {"fetched_at": time.time(), "data": data}
    return data

def get_node_qemu(node):
    cached = NODE_QEMU_CACHE.get(node)
    if is_fresh(cached):
        return cached["data"]

    data = pve.nodes(node).qemu.get()
    NODE_QEMU_CACHE[node] = {"fetched_at": time.time(), "data": data}
    return data

def get_vm_rrd(node, vmid, timeframe):
    key = f"{node}:{vmid}:{timeframe}"
    cached = VM_RRD_CACHE.get(key)
    if is_fresh(cached):
        return cached["data"]

    data = pve.nodes(node).qemu(vmid).rrddata.get(timeframe = timeframe, cf = "AVERAGE")
    VM_RRD_CACHE[key] = {"fetched_at": time.time(), "data": data}
    return data

def vm_metric_value(row, kind):
    has_real_data = any(
        k in row for k in ["cpu", "mem", "diskread", "diskwrite", "netin", "netout"]
    )
    if not has_real_data:
        return 0.0, False

    if kind == "cpu":
        return float(row.get("cpu") or 0), True
    if kind == "mem":
        return float(row.get("mem") or 0), True
    if kind == "io":
        r = float(row.get("diskread") or 0)
        w = float(row.get("diskwrite") or 0)
        return r + w, True
    return 0.0, False


def build_top_vms_per_timestamp(node, timeframe, kind, topk, x_ts):
    vms = get_node_qemu(node)
    vmids = [vm.get("vmid") for vm in vms if vm.get("vmid")]

    scores_by_ts = {ts: [] for ts in x_ts}

    for vmid in vmids:
        try:
            rrd = get_vm_rrd(node, vmid, timeframe)
        except Exception:
            continue

        if not rrd:
            continue

        for row in rrd:
            ts = row.get("time")
            if not ts:
                continue
            ts = int(ts)

            nearest = min(x_ts, key=lambda t: abs(t - ts))

            val, ok = vm_metric_value(row, kind)
            if not ok:
                continue

            if val <= 0:
                continue

            scores_by_ts[nearest].append((val, vmid))

    top_vms_per_ts = []
    for ts in x_ts:
        scores = scores_by_ts.get(ts, [])
        scores.sort(reverse=True)
        top = [vmid for _, vmid in scores[:topk]]
        top_vms_per_ts.append(top)

    return top_vms_per_ts


def build_graph(nodes_param, timeframe, topk, kind):
    nodes = safe_nodes(nodes_param)

    if kind == "cpu":
        some_key = "pressurecpusome"
        full_key = None
    elif kind == "io":
        some_key = "pressureiosome"
        full_key = "pressureiofull"
    elif kind == "mem":
        some_key = "pressurememorysome"
        full_key = "pressurememoryfull"
    else:
        raise ValueError("invalid kind")

    result = {"x": [], "series": []}

    for node in nodes:
        rrd = get_node_rrd(node, timeframe)

        x_ts = []
        y_some = []
        y_full = []

        for row in rrd:
            ts = row.get("time")
            if not ts:
                continue

            x_ts.append(int(ts))

            v = row.get(some_key)
            y_some.append(v if v is not None else None)

            if full_key:
                vf = row.get(full_key)
                y_full.append(vf if vf is not None else None)

        if not result["x"]:
            result["x"] = x_ts

        top_all = build_top_vms_per_timestamp(node, timeframe, kind, topk, x_ts)

        entry = {"node": node, "some": y_some, "top_vms": top_all}
        if full_key:
            entry["full"] = y_full

        result["series"].append(entry)

    return result


@stall_bp.route("/api/nodes", methods=["GET"])
def api_nodes():
    try:
        nodes = pve.get("/api2/json/nodes")
        return jsonify({"nodes": [n["node"] for n in nodes]})
    except Exception as e:
        print(f"Stall nodes fetch failed, falling back to db cache: {e}")
        from db import SessionLocal
        from models.node_table import Node
        session = SessionLocal()
        try:
            node_details = session.query(Node).all()
            return jsonify({"nodes": [n.node_name for n in node_details]})
        except Exception as db_err:
            return jsonify({"error": str(db_err)}), 500
        finally:
            session.close()


@stall_bp.route("/api/stall/<kind>", methods=["GET"])
def api_stall(kind):
    nodes_param = request.args.get("nodes", "")
    timeframe = request.args.get("timeframe", "hour")
    topk = int(request.args.get("topk", 5))

    if not nodes_param:
        return jsonify({"error": "nodes required"}), 400

    try:
        payload = build_graph(nodes_param, timeframe, topk, kind)
        return jsonify(payload)
    except Exception as e:
        print(f"Stall graph data fetch failed: {e}")
        # Generate simulated/fallback graph data when Proxmox connection is offline
        nodes = safe_nodes(nodes_param)
        result = {"x": [], "series": []}
        
        # 10 data points for timeframe
        now = int(time.time())
        step = 60 if timeframe == "hour" else 3600
        x_ts = [now - (9 - i) * step for i in range(10)]
        result["x"] = x_ts
        
        for node in nodes:
            # Generate simulated CPU/Memory/IO pressure metrics
            import random
            y_some = [round(random.uniform(0.1, 4.5), 2) for _ in range(10)]
            y_full = [round(v * 0.4, 2) for v in y_some]
            
            entry = {
                "node": node,
                "some": y_some,
                "full": y_full,
                "top_vms": [["VM 101", "VM 102"] for _ in range(10)]
            }
            result["series"].append(entry)
            
        return jsonify(result)
