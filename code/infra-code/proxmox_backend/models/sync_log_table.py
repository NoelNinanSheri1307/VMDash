from sqlalchemy import Column, Integer, String, DateTime, Float, func
from .base_table import Base

class SyncLog(Base):
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, nullable=False, server_default=func.now())
    duration = Column(Float, nullable=False)  # in seconds
    triggered_by = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False)  # "success" or "failed"
    summary = Column(String(500), nullable=False)
