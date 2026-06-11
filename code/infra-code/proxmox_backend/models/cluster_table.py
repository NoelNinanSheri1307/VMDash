from .base_table import Base
from sqlalchemy import Column, String, Boolean
from sqlalchemy.orm import relationship


class Cluster(Base):
    __tablename__ = "cluster"

    cluster_name = Column(String(15), primary_key = True)
    proxmox_token = Column(String(50))
    # live_status = Column(Boolean, nullable = False)

    node = relationship("Node", back_populates = "cluster", cascade = "all, delete-orphan")
    # storage = relationship("Storage", back_populates = "cluster", cascade = "all, delete-orphan")
    
    cluster_vm = relationship("VmClusterRelation", back_populates = "cluster", cascade = "all, delete-orphan")
    vm = relationship("Vm", secondary = "vm_cluster_relation", viewonly = True, back_populates = "cluster")