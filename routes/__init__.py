from .auth import auth_bp
from .pages import main_bp
from .api_v1 import api_v1_bp
from .api_v2 import api_v2_bp


def register_blueprints(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(api_v1_bp)
    app.register_blueprint(api_v2_bp)
