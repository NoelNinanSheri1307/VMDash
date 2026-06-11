from .base_table import Base
from sqlalchemy import Column, String, ForeignKeyConstraint, Integer, Boolean
from sqlalchemy.orm import relationship


class Storage(Base):
    __tablename__ = "storage"

    cluster_name = Column(String(15), primary_key = True)
    storage_name = Column(String(50), primary_key = True)
    node_name = Column(String(15), primary_key = True)
    storage_type = Column(String(10), nullable = False)
    total_size = Column(Integer, nullable = False)
    content = Column(String(50))
    storage_server_ip = Column(String(15))                    # <------------ IP of proxmox backup server to which this storage is mounted
    storage_datastore = Column(String(20))                    # <------------ datastore of proxmox backup server to which this storage is mounted
    live_status = Column(Boolean, nullable = False)


    __table_args__ = (
        ForeignKeyConstraint(
            ["cluster_name", "node_name"],
            ["node.cluster_name", "node.node_name"],
            ondelete = "CASCADE"
        ),
    )

    # cluster = relationship("Cluster", back_populates = "storage")
    node = relationship("Node", back_populates = "storage")

    storage_vm = relationship("VmStorageRelation", back_populates = "storage", cascade = "all, delete-orphan")
    vm = relationship("Vm", secondary = "vm_storage_relation", viewonly = True, back_populates = "storage")