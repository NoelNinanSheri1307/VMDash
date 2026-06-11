from datetime import timedelta

def set_session_config(app):
    app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=2)
    app.config['SESSION_COOKIE_SECURE'] = False
    app.config['SESSION_COOKIE_HTTPONLY'] = False
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_PATH'] = '/'
    app.config['SESSION_REFRESH_EACH_REQUEST'] = False