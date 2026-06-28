from flask import Flask
from routes import register_routes
from flask_cors import CORS
from db.emp_db_sync import sync_emp_db

app = Flask(__name__)
sync_emp_db()
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])

class PrefixMiddleware(object):
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        path = environ.get('PATH_INFO', '')
        if not path.startswith('/proxmox') and not path.startswith('/api') and path != '/' and not path.startswith('/static'):
            path = '/proxmox' + path
        
        # Avoid HTTP 308 Redirect (which fails CORS in browsers) by appending slash directly
        if path in ['/proxmox/vms', '/proxmox/nodes', '/proxmox/cluster', '/proxmox/storage']:
            path = path + '/'
            
        environ['PATH_INFO'] = path
        return self.wsgi_app(environ, start_response)

app.wsgi_app = PrefixMiddleware(app.wsgi_app)

register_routes(app)
# print(app.url_map)

if __name__ == '__main__':
    app.run(host = '0.0.0.0', port = 5001, debug = True)
    #changed port to 5001 to avoid conflict with web_backend