from sqlalchemy import Column, Integer, String
from .base_table import Base

class EmpDetails(Base):
    __tablename__ = 'empdetails'
    
    staff_code = Column(String(10), primary_key = True)
    name = Column(String(100), nullable = False)
    division = Column(String(10), nullable = False)
    groupname = Column(String(10), nullable = False)
    entity = Column(String(10), nullable = False)