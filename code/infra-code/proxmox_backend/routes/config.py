import os

LOCAL_USER = os.getenv("USER") or os.getenv("USERNAME")
SSH_KEY_PATH = rf"C:\Users\{LOCAL_USER}\.ssh\id_ed25519_fsgpu"