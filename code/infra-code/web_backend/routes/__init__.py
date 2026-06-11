from .auth import auth_bp
from .staff_details_routes import employee_bp
from .vm_routes import vm_bp

def register_routes(app):
    app.register_blueprint(vm_bp)
    app.register_blueprint(employee_bp)
    app.register_blueprint(auth_bp)