from flask import Flask, abort, send_file, render_template
from routes import register_blueprints
from flask_login import LoginManager
from data import db_session
from data.user import User
import os
import config

app = Flask(__name__)
register_blueprints(app)
app.secret_key = config.SECRET_KEY

# login
app.config['SESSION_COOKIE_NAME'] = 'anime_auth'
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth_bp.login'
app.config['REMEMBER_COOKIE_DURATION'] = 60 * 60 * 24 * 7

@login_manager.user_loader
def load_user(user_id):
    db_sess = db_session.create_session()
    ret = db_sess.query(User).filter(User.id == user_id).first()
    db_sess.close()
    return ret

@app.route('/.well-known/discord')
def discord_domain_link():
    return "dh=3c437aa6e5bcf3e7d3d63306fb9b4fcc113b3e14"

@app.route('/resources/<string:path>')
def resources(path: str):
    if os.path.exists(f'resources\\{path}'):  # Windows-like
        return send_file(f'resources\\{path}')
    elif os.path.exists(f'resources/{path}'):  # Unix
        return send_file(f'resources/{path}')
    else:
        return abort(404)

@app.route('/wpa/<string:path>')
def resources_wpa(path: str):
    if os.path.exists(f'resources\\wpa\\{path}'):  # Windows-like
        return send_file(f'resources\\wpa\\{path}')
    elif os.path.exists(f'resources/wpa/{path}'):  # Unix
        return send_file(f'resources/wpa/{path}')
    else:
        return abort(404)

@app.errorhandler(404)
def page_not_found(e):
    return render_template('error/404.html'), 404

@app.errorhandler(500)
def internal_server_error(e):
    return render_template('error/500.html'), 500


if __name__ == "__main__":
    db_session.global_init("database.db")
    app.run(host='0.0.0.0', port='8080')
