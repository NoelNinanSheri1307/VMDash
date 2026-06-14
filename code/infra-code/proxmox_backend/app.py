from flask import Flask
from routes import register_routes
from flask_cors import CORS
from db.emp_db_sync import sync_emp_db

app = Flask(__name__)
sync_emp_db()
CORS(app, supports_credentials=True, resources={r"/*": {
    "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization", "X-User-Staff-Code", "X-User-Role"]
}})

register_routes(app)
# print(app.url_map)

if __name__ == '__main__':
    app.run(host = '0.0.0.0', port = 5001, debug = True)
    #changed port to 5001 to avoid conflict with web_backend