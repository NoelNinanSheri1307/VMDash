from sqlalchemy import Column, String, Table, ForeignKey
from sqlalchemy.orm import relationship
from .base_table import Base

# user-vm relationship table
vm_users = Table(
    'vm_users',
    Base.metadata,
    Column('vm_name', String(30), ForeignKey('vms.vm_name', ondelete = 'CASCADE'), primary_key = True),
    Column('staff_code', String(7), ForeignKey('users.staff_code', ondelete = 'CASCADE'), primary_key = True)
)


# user table
class User(Base):
    __tablename__ = "users"

    staff_code = Column(String(7), primary_key = True)
    name = Column(String(25), nullable = False)
    center = Column(String(6), nullable = False)
    entity = Column(String(5), nullable = False)
    groupname = Column(String(5), nullable = False)
    division = Column(String(5), nullable = False)
    section = Column(String(5))

    vms = relationship("Vm", secondary = vm_users, back_populates = "users")