from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from datetime import date
from .base_table import Base
from .user_table import vm_users

# vm table
class Vm(Base):
    __tablename__ = "vms"

    vm_name = Column(String(30), primary_key = True)
    host_name = Column(String(25), nullable = False)
    environment = Column(String(10), nullable = False)      # Promox/OCP/RHV/GPU Node
    cluster = Column(String(15))                            # cluster name
    ram = Column(Integer, nullable = False)
    cores = Column(Integer, nullable = False)
    ip = Column(String(15), nullable = False)
    mac = Column(String(48), nullable = False)
    os = Column(String(10), nullable = False)
    disk_size = Column(Integer, nullable = False)
    source = Column(String(5))                              # NARC/GD
    narc = Column(String(10))                               # NARC number (if exists)
    time_created = Column(String(10), nullable = False)
    gpu = Column(String(5))

    users = relationship("User", secondary = vm_users, back_populates = "vms")