from .cluster import cluster_bp
from .nodes import nodes_bp
from .vms import vms_bp
from .storage import storage_bp
from .users import users_bp
from .visualization import visualization_bp
from .report import report_bp
from .stall import stall_bp
#from .auth import auth_bp 
#from .hello import hello_bp
# from .metrics import metrics_bp
# from .ha import ha_bp
# from .ceph import ceph_bp
# from .firewall import firewall_bp
# from .misc import misc_bp


def register_routes(app):
    app.register_blueprint(cluster_bp)
    app.register_blueprint(nodes_bp)
    app.register_blueprint(vms_bp)
    app.register_blueprint(storage_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(visualization_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(stall_bp)
    #app.register_blueprint(auth_bp)
    #app.register_blueprint(hello_bp)
    # app.register_blueprint(metrics_bp)
    # app.register_blueprint(ha_bp)
    # app.register_blueprint(ceph_bp)
    # app.register_blueprint(firewall_bp)
    # app.register_blueprint(misc_bp)