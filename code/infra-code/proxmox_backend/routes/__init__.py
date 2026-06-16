from .cluster import cluster_bp
from .nodes import nodes_bp
from .vms import vms_bp
from .storage import storage_bp
from .users import users_bp
from .visualization import visualization_bp
from .report import report_bp
from .stall import stall_bp
from .vm_requests import vm_requests_bp
from .notifications import notifications_bp
from .alerts import alerts_bp
from .ownership import ownership_bp
from .governance import governance_bp
from .sync_logs import sync_logs_bp


def register_routes(app):
    app.register_blueprint(cluster_bp)
    app.register_blueprint(nodes_bp)
    app.register_blueprint(vms_bp)
    app.register_blueprint(storage_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(visualization_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(stall_bp)
    app.register_blueprint(vm_requests_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(alerts_bp)
    app.register_blueprint(ownership_bp)
    app.register_blueprint(governance_bp)
    app.register_blueprint(sync_logs_bp)