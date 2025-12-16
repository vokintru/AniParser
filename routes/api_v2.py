from flask import Blueprint, request, jsonify
from flask_login import current_user, login_user
from collections import defaultdict
from data import db_session
from data.user import User
import time
import apis as api
from functools import wraps
import jwt
import config

api_v2_bp = Blueprint('api_v2', __name__, url_prefix='/api/v2')
user_requests = defaultdict(list)

def auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if current_user.is_authenticated:
            return f(*args, **kwargs)

        token = request.headers.get("Authorization")
        if token is None or not token.startswith("Bearer "):
            return {"error": "Authentication required"}, 401

        token = token.split()[1]
        try:
            payload = jwt.decode(token, config.SECRET_KEY, algorithms=["HS256"])
            user_id = payload["user_id"]

            db_sess = db_session.create_session()
            user = db_sess.query(User).filter(User.id == user_id).first()
            if not user:
                return {"error": "User not found"}, 404

            login_user(user)
            db_sess.close()
        except jwt.ExpiredSignatureError:
            return {"error": "Token expired"}, 401
        except jwt.InvalidTokenError:
            return {"error": "Invalid token"}, 401

        return f(*args, **kwargs)
    return decorated

@api_v2_bp.route("/title/<int:title_id>/translations", methods=["GET"])
@auth_required
def title_translations_v2(title_id):
    res = api.kodik_v2.get_translations(title_id)
    if res is None:
        return "None", 204
    return res, 200

@api_v2_bp.route("/title/<int:title_id>/eps", methods=["GET"])
@auth_required
def title_eps_v2(title_id):
    res = api.kodik_v2.get_eps(title_id)
    return {"eps": res}, 200

@api_v2_bp.route("/title/<int:title_id>/watch", methods=["GET"])
@auth_required
def title_watch_v2(title_id):
    translation = request.args.get('transl')
    episode = request.args.get('ep')
    if translation is None or episode is None:
        return "translation and/or episode is none", 400
    out = {}

    # kodik
    try:
        out['kodik'] = api.kodik_v2.watch_links(int(title_id), int(episode), int(translation))
    except Exception as e:
        pass

    # anilibria
    if translation == "610" or translation == "3861":
        original_name = api.shikimori.get_title_info(title_id, current_user.shiki_access_token)['original_name']
        if original_name == {'error': 'reauth'}:
            return {"error": "Token expired"}, 401
        if original_name == {'error': '404'}:
            return {"error": "Not Found"}, 404
        anilibria_id = api.anilibria.get_anime_id(original_name)
        if anilibria_id:
            all_episodes = api.anilibria.get_episodes(anilibria_id)
            out['anilibria'] = all_episodes[int(episode)]

    return out, 200