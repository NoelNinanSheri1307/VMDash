import pymysql
import os
from db import SessionLocal
from models.user_table import EmpDetails


def sync_emp_db(host = os.getenv("DB_HOST"), user = os.getenv("DB_USER"), password = os.getenv("DB_PASS"), database = os.getenv("PROXMOX_DB_NAME")):
    session = SessionLocal()

    existing_count = session.query(EmpDetails).count()

    imported_db = pymysql.connect(host = host, user = user, password = password, database = database)

    with imported_db.cursor() as cur:
        cur.execute("SELECT * from empdetails_imported")
        rows = cur.fetchall()
    
    imported_row_count = len(rows)

    if existing_count == imported_row_count and imported_row_count != 0:
        return
    
    for row in rows:
        obj = EmpDetails(staff_code = row[0], name = row[1], division = row[2], groupname = row[3], entity = row[4])
        session.merge(obj)
    
    session.commit()

    session.close()