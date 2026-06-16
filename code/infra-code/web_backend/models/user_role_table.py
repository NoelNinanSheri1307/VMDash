import re
from models.base_table import Base
from sqlalchemy import Enum, Column, String, DateTime, func
    
class UserRoles(Base):
    __tablename__ = "user_role"

    staff_code1 = Column(String(50), primary_key = True)

    role = Column(Enum("admin", "manager", "user", name="roles"), nullable=False)
    
    password_hash = Column(String(255), nullable=False)

    status = Column(Enum("active", "inactive", name="user_status"), nullable=False, default="active")
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
