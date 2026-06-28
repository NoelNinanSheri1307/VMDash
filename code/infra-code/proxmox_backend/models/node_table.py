from .base_table import Base
from sqlalchemy import Column, BIGINT, String, ForeignKey, Boolean, Integer
from sqlalchemy.orm import relationship


class Node(Base):
    __tablename__ = "node"

    cluster_name = Column(String(15), ForeignKey('cluster.cluster_name', ondelete = 'CASCADE'), primary_key = True)
    node_name = Column(String(10), primary_key = True)
    model = Column(String(50), nullable = False)
    total_mem = Column(BIGINT, nullable = False)
    total_cores = Column(Integer, nullable = False)
    hypervisor = Column(String(40))
    uptime = Column(BIGINT)
    live_status = Column(Boolean, nullable = False)


    ips = relationship("NodeIp", back_populates = "node")   #Column(String(15), nullable = False)
    cluster = relationship("Cluster", back_populates = "node")
    storage = relationship("Storage", back_populates = "node", cascade = "all, delete-orphan")

    node_vm = relationship("VmNodeRelation", back_populates = "node", cascade = "all, delete-orphan")
    vm = relationship("Vm", secondary = "vm_node_relation", viewonly = True, back_populates = "node")