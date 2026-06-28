from proxmoxer import ProxmoxAPI
from .config import *
from db import SessionLocal
from models.cluster_table import Cluster


def get_proxmox_connection(cluster_name):

    session = SessionLocal()

    cluster = session.query(Cluster).filter_by(cluster_name = cluster_name).first()

    proxmox_connection = ProxmoxAPI(
        cluster.cluster_ip,
        user = PROXMOX_USER,
        token_name = PROXMOX_TOKEN_NAME,
        token_value = cluster.proxmox_token,
        verify_ssl = PROXMOX_VERIFY_SSL,
        timeout = 30
    )

    session.close()

    return proxmox_connection