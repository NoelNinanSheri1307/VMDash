from .base_table import Base
from sqlalchemy import Column, String, ForeignKeyConstraint
from sqlalchemy.orm import relationship


class NodeIp(Base):
    __tablename__ = "node_ip"

    cluster_name = Column(String(15), primary_key = True)
    node_name = Column(String(10), primary_key = True)
    ip = Column(String(15), primary_key = True)
    comments = Column(String(100))

    __table_args__ = (
        ForeignKeyConstraint(
            ["cluster_name", "node_name"],
            ["node.cluster_name", "node.node_name"],
            ondelete = "CASCADE"
        ),
    )

    node = relationship("Node", back_populates = "ips")