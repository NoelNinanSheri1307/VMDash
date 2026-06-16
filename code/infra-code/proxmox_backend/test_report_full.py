import requests

url = "http://localhost:5001/proxmox/report"
headers = {
    "Origin": "http://localhost:3000",
    "Content-Type": "application/json",
    "X-User-Staff-Code": "admin",
    "X-User-Role": "admin"
}
payload = {
    "columns": ["vm_id", "vm_name", "os", "cpus", "max_memory", "max_disk", "status", "cluster_name", "node_name", "users_assigned", "storages"],
    "format": "csv",
    "uuids": [],  # Let's test with empty first, then we can query some real ones
    "staff_code": "admin",
    "report_name": "Dashboard Scope Export",
    "report_type": "custom",
    "filters": {
        "os": "all",
        "status": "all",
        "cluster": "",
        "node": "",
        "entity": "",
        "division": "",
        "groupname": ""
    }
}

try:
    # First, let's fetch some real VM UUIDs from the database or API
    vm_url = "http://localhost:5001/proxmox/vms/vmData"
    vms_response = requests.get(vm_url, headers=headers)
    if vms_response.status_code == 200:
        vms = vms_response.json()
        payload["uuids"] = [vm["vm_uuid"] for vm in vms if "vm_uuid" in vm][:5]
        print(f"Fetched {len(payload['uuids'])} VM UUIDs to test.")
    else:
        print(f"Failed to fetch VMs: {vms_response.status_code}")
except Exception as e:
    print(f"Could not fetch VMs: {e}")

try:
    response = requests.post(url, headers=headers, json=payload)
    print(f"Status Code: {response.status_code}")
    print("Response Headers:")
    for k, v in response.headers.items():
        print(f"  {k}: {v}")
    if response.status_code != 200:
        print("Response Content:")
        print(response.text)
except Exception as e:
    print(f"Error: {e}")
