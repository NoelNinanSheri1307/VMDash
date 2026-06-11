from sqlalchemy import Column, String, ForeignKey, ForeignKeyConstraint, DateTime, func
from sqlalchemy.orm import relationship
from models.base_table import Base


class VmNodeRelation(Base):
    __tablename__ = "vm_node_relation"

    uuid = Column(String(36), primary_key = True)
    cluster_name = Column(String(15), primary_key = True)
    node_name = Column(String(10), primary_key = True)
    initial_at = Column(DateTime, default = func.now())
    updated_at = Column(DateTime, default = func.now())

    __table_args__ = (
        ForeignKeyConstraint(
            ["cluster_name", "node_name"],
            ["node.cluster_name", "node.node_name"],
            ondelete = "CASCADE"
        ),
        ForeignKeyConstraint(
            ['uuid'], ['vm.uuid']
        ),
    )

    vm = relationship("Vm", back_populates = "node_vm")
    node = relationship("Node", back_populates = "node_vm")



class VmClusterRelation(Base):
    __tablename__ = "vm_cluster_relation"

    uuid = Column(String(36), ForeignKey("vm.uuid", ondelete = "CASCADE"), primary_key = True)
    cluster_name = Column(String(15), ForeignKey("cluster.cluster_name", ondelete = "CASCADE"), primary_key = True)
    initial_at = Column(DateTime, default = func.now())
    updated_at = Column(DateTime, default = func.now())

    vm = relationship("Vm", back_populates = "cluster_vm")
    cluster = relationship("Cluster", back_populates = "cluster_vm")



class VmStorageRelation(Base):
    __tablename__ = "vm_storage_relation"

    uuid = Column(String(36), primary_key = True)
    cluster_name = Column(String(15), primary_key = True)
    storage_name = Column(String(50), primary_key = True)
    node_name = Column(String(15), primary_key = True)
    vm_disk_image = Column(String(50), primary_key = True)
    size = Column(String(10))
    initial_at = Column(DateTime, default = func.now())
    updated_at = Column(DateTime, default = func.now())

    __table_args__ = (
        ForeignKeyConstraint(
            ["cluster_name", "storage_name", "node_name"],
            ["storage.cluster_name", "storage.storage_name", "storage.node_name"],
            ondelete = "CASCADE"
        ),
        ForeignKeyConstraint(
            ['uuid'], ['vm.uuid']
        ),
    )

    vm = relationship("Vm", back_populates = "storage_vm")
    storage = relationship("Storage", back_populates = "storage_vm")



class VmUserRelation(Base):
    __tablename__ = "vm_user_relation"
    
    uuid = Column(String(36), ForeignKey("vm.uuid", ondelete = "CASCADE"), primary_key = True)
    staff_code = Column(String(7), ForeignKey("empdetails.staff_code", ondelete = "CASCADE"), primary_key = True)

    initial_at = Column(DateTime, default = func.now())
    deleted_at = Column(DateTime, default = func.now())

    vm = relationship("Vm", back_populates = "user_vm")
    user = relationship("EmpDetails", back_populates = "user_vm")