from .base_table import Base
from sqlalchemy import Column, Integer, String, Text, Enum, DateTime, func, SmallInteger

class VmRequest(Base):
    __tablename__ = "vm_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_uuid = Column(String(36), nullable=False, unique=True)
    requested_by = Column(String(50), nullable=False)
    vm_name = Column(String(100), nullable=False)
    hostname = Column(String(100), nullable=False)
    environment = Column(String(50), nullable=False)
    os = Column(String(50), nullable=False)
    cpu_cores = Column(Integer, nullable=False)
    ram_gb = Column(Integer, nullable=False)
    disk_gb = Column(Integer, nullable=False)
    justification = Column(Text)
    request_status = Column(Enum('draft', 'pending', 'approved', 'rejected', 'provisioned', 'closed'), default='pending', nullable=False)
    reviewer_staff_code = Column(String(50))
    reviewer_comments = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    approved_at = Column(DateTime)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    recipient_staff_code = Column(String(50), nullable=False)
    notification_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(Enum('info', 'warning', 'critical'), default='info', nullable=False)
    is_read = Column(SmallInteger, default=0, nullable=False)
    related_resource = Column(String(100))
    created_at = Column(DateTime, default=func.now())

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    severity = Column(Enum('info', 'warning', 'critical'), default='info', nullable=False)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(Enum('active', 'resolved'), default='active', nullable=False)
    created_at = Column(DateTime, default=func.now())
