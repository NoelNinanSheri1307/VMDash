import os
from urllib.parse import quote_plus
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.base_table import Base
from models.vm_table import Vm
from models.node_table import Node
from models.cluster_table import Cluster
from models.storage_table import Storage
from models.user_table import EmpDetails
from models.relation_tables import VmClusterRelation, VmNodeRelation, VmStorageRelation
from dotenv import load_dotenv

load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASS = quote_plus(os.getenv("DB_PASS"))
DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("PROXMOX_DB_NAME")

DB_URL = f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}/{DB_NAME}"  #os.getenv('DB_URL', )

engine = create_engine(DB_URL, echo = True)

SessionLocal = sessionmaker(autocommit = False, autoflush = False, bind = engine)

# Base.metadata.drop_all(engine)
Base.metadata.create_all(engine)