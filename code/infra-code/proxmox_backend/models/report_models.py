from sqlalchemy import Column, String, Integer, Text, DateTime, Boolean, ForeignKey
from .base_table import Base
from datetime import datetime

class SavedReport(Base):
    __tablename__ = "saved_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    staff_code = Column(String(50), nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(String(255))
    columns_json = Column(Text, nullable=False)
    filters_json = Column(Text)
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ReportFavorite(Base):
    __tablename__ = "report_favorites"

    id = Column(Integer, primary_key=True, autoincrement=True)
    staff_code = Column(String(50), nullable=False)
    report_id = Column(Integer, ForeignKey('saved_reports.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class ReportTemplate(Base):
    __tablename__ = "report_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(100), nullable=False)
    description = Column(String(255))
    default_columns_json = Column(Text, nullable=False)
    default_filters_json = Column(Text)
    enabled = Column(Integer, default=1) # using Integer to map TINYINT(1)
    created_at = Column(DateTime, default=datetime.utcnow)

class ReportAuditLog(Base):
    __tablename__ = "report_audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    staff_code = Column(String(50), nullable=False)
    report_name = Column(String(100), nullable=False)
    report_type = Column(String(50), nullable=False)
    file_format = Column(String(10), nullable=False)
    columns_json = Column(Text, nullable=False)
    filters_json = Column(Text)
    vm_count = Column(Integer, nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow)
