import os

LOCAL_USER = os.getenv("USER") or os.getenv("USERNAME")
SSH_KEY_PATH = os.path.expanduser(f"~/{LOCAL_USER}/.ssh/id_ed25519_fsgpu") if LOCAL_USER else os.path.expanduser("~/.ssh/id_ed25519_fsgpu")