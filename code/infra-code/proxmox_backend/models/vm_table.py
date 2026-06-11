from .base_table import Base
from sqlalchemy import Column, Integer, BIGINT, String, Boolean, DateTime, func, ForeignKey
from sqlalchemy.orm import relationship


class Vm(Base):
    __tablename__ = "vm"

    uuid = Column(String(36), primary_key = True)
    vm_name = Column(String(100), nullable = False)
    vm_host_name = Column(String(50), nullable = False)
    vm_id = Column(Integer, nullable = False)
    cpus = Column(Integer, nullable = False)
    sockets = Column(Integer, nullable = False)
    max_memory = Column(Integer, nullable = False)
    chipset = Column(String(20), nullable = False)
    max_disk = Column(Integer, nullable = False)
    os = Column(String(50), nullable = False)
    mac = Column(String(17), nullable = False)
    ip = Column(String(15), nullable = False)
    status = Column(String(10), nullable = False)
    uptime = Column(BIGINT)
    gpu = Column(Integer, nullable = False)
    gpu_info = Column(String(20))
    created_date = Column(DateTime, default = func.now())
    live_status = Column(Boolean, nullable = False)
    request_source = Column(String(100), default=False)
    com_focal_point = Column(String(50), ForeignKey('empdetails.staff_code', ondelete = 'SET NULL'))
    dcv_hostname = Column(String(50))
    end_user_focal_point = Column(String(50), ForeignKey('empdetails.staff_code', ondelete = 'SET NULL'))
    display_type = Column(String(50))
    prometheus_status = Column(String(20))
    software_installed = Column(String(100))

    node_vm = relationship("VmNodeRelation", back_populates = "vm", cascade = "all, delete-orphan")
    node = relationship("Node", secondary = "vm_node_relation", viewonly = True, back_populates = "vm")

    cluster_vm = relationship("VmClusterRelation", back_populates = "vm", cascade = "all, delete-orphan")
    cluster = relationship("Cluster", secondary = "vm_cluster_relation", viewonly = True, back_populates = "vm")

    storage_vm = relationship("VmStorageRelation", back_populates = "vm", cascade = "all, delete-orphan")
    storage = relationship("Storage", secondary = "vm_storage_relation", viewonly = True, back_populates = "vm")

    user_vm = relationship("VmUserRelation", back_populates = "vm", cascade = "all, delete-orphan")
    user = relationship("EmpDetails", secondary = "vm_user_relation", viewonly = True, back_populates = "vm")

    com_focal_point_relation = relationship("EmpDetails", foreign_keys = [com_focal_point], back_populates = "vm_com_focal_points")

    end_user_focal_point_relation = relationship("EmpDetails", foreign_keys = [end_user_focal_point], back_populates = "vm_end_user_focal_points")