import pymysql
import os
from db import SessionLocal
from models.user_table import EmpDetails


def sync_emp_db(host = os.getenv("DB_HOST"), user = os.getenv("DB_USER"), password = os.getenv("DB_PASS"), database = os.getenv("PROXMOX_DB_NAME")):
    imported_db = pymysql.connect(host = host, user = user, password = password, database = database)
    try:
        with imported_db.cursor() as cur:
            # Sync main employee dump records
            cur.execute(
                "INSERT INTO empdetails (staff_code, name, division, groupname, entity) "
                "SELECT staff_code, name, division, groupname, entity FROM empdetails_imported "
                "ON DUPLICATE KEY UPDATE "
                "name=VALUES(name), division=VALUES(division), groupname=VALUES(groupname), entity=VALUES(entity)"
            )
            # Sync local/credentials directory profiles
            cur.execute(
                "INSERT INTO empdetails (staff_code, name, division, groupname, entity) "
                "SELECT staff_code, name, division, groupname, entity FROM ccds_db.users "
                "ON DUPLICATE KEY UPDATE "
                "name=VALUES(name), division=VALUES(division), groupname=VALUES(groupname), entity=VALUES(entity)"
            )
            # Sync VM-user relationships matching by VM name
            cur.execute(
                "INSERT INTO vm_user_relation (uuid, staff_code) "
                "SELECT v.uuid, vu.staff_code FROM ccds_db.vm_users vu "
                "JOIN vm v ON LOWER(TRIM(v.vm_name)) = LOWER(TRIM(vu.vm_name)) "
                "ON DUPLICATE KEY UPDATE uuid = VALUES(uuid), staff_code = VALUES(staff_code)"
            )
        imported_db.commit()
    except Exception as e:
        imported_db.rollback()
        print(f"Error syncing employee database: {e}")
    finally:
        imported_db.close()