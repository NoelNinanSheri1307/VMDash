from flask import Flask
from flask_cors import CORS
from routes import register_routes
from sessions.config import set_session_config

app = Flask(__name__)

set_session_config(app)
CORS(app, supports_credentials=True)
# CORS(app, supports_credentials = True, origins = ["http://localhost:3000"], methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
    #  allow_headers = ["Content-Type", "authorization"])
register_routes(app)

if __name__ == '__main__':
    app.run(host="0.0.0.0", port = 5000, debug = True)