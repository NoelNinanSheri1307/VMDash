from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from .base_table import Base

metadata = Base.metadata

class EmpDetails(Base):
    __tablename__ = "empdetails"

    staff_code = Column(String(50), primary_key = True)
    name = Column(String(100), nullable = False)
    division = Column(String(10), nullable = False)
    groupname = Column(String(10), nullable = False)
    entity = Column(String(10), nullable = False)

    user_vm = relationship ("VmUserRelation", back_populates = "user")
    vm = relationship("Vm", secondary = "vm_user_relation", viewonly = True, back_populates = "user")

    vm_com_focal_points = relationship("Vm", foreign_keys = "Vm.com_focal_point", back_populates = "com_focal_point_relation")
    vm_end_user_focal_points = relationship("Vm", foreign_keys = "Vm.end_user_focal_point", back_populates = "end_user_focal_point_relation")