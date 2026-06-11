from proxmoxer import ProxmoxAPI
from .config import *;


def get_proxmox_connection():
    proxmox_connection = ProxmoxAPI(
        PROXMOX_HOST,
        user = PROXMOX_USER,
        token_name = PROXMOX_TOKEN_NAME,
        token_value = PROXMOX_USER_TOKEN,
        verify_ssl = PROXMOX_VERIFY_SSL,
        timeout = 30
    )

    return proxmox_connection