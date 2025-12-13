from flask import Blueprint, request, jsonify
from flask_login import current_user, login_user
from collections import defaultdict
from anime_parsers_ru.errors import NoResults
from data import db_session
from data.user import User
import time
import apis as api
from functools import wraps
import jwt
import config

api_bp = Blueprint('api', __name__, url_prefix='/api/v1')
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

@api_bp.route("/search/<query>", methods=["GET"])
@auth_required
def search(query):
    res = api.shikimori.search(query, current_user.shiki_access_token)
    if res == {'error': 'reauth'}:
        return {"error": "Token expired"}, 401
    if res == {'error': '404'}:
        return {"error": "Not Found"}, 404
    return res, 200

@api_bp.route("/search/", methods=["GET"])
@auth_required
def search_trending():
    res = api.shikimori.search_trending(current_user.shiki_access_token)
    if res == {'error': 'reauth'}:
        return {"error": "Token expired"}, 401
    if res == {'error': '404'}:
        return {"error": "Not Found"}, 404
    return res, 200

@api_bp.route("/user/mark_watched", methods=["POST"])
@auth_required
def user_mark_watched():
    data = request.get_json()
    release_id = data.get("release_id")
    episode = data.get("episode")
    if release_id is None or episode is None:
        return jsonify({"error": "release_id и episode обязательны"}), 400

    user_id = current_user.id
    now = time.time()
    user_requests[user_id] = [t for t in user_requests[user_id] if now - t < 2]
    if len(user_requests[user_id]) >= 3:
        wait_time = 1 - (now - user_requests[user_id][0])
        if wait_time > 0:
            time.sleep(wait_time)
        now = time.time()
        user_requests[user_id] = [t for t in user_requests[user_id] if now - t < 2]
    user_requests[user_id].append(time.time())

    rate = api.shikimori.get_rate(current_user.shiki_user_id, release_id, current_user.shiki_access_token)
    if rate == {'error': 'reauth'}:
        return {"error": "Token expired"}, 401
    if rate == {'error': '404'}:
        return {"error": "Not Found"}, 404
    def status_check(r):
        if r == "planned" or r == "watching" or r == "rewatching":
            return True
        return False

    if not rate:
        rate = api.shikimori.create_rate(current_user.shiki_user_id, release_id, current_user.shiki_access_token)
        if rate == {'error': 'reauth'}:
            return {"error": "Token expired"}, 401
        if rate == {'error': '404'}:
            return {"error": "Not Found"}, 404
        res = api.shikimori.update_rate(rate['id'], current_user.shiki_access_token, user_rate={"episodes": episode})
    elif int(rate[0]['episodes']) < int(episode):
        if status_check(rate[0]['status']):
            res = api.shikimori.update_rate(rate[0]['id'], current_user.shiki_access_token, user_rate={"episodes": episode})
        else:
            res = api.shikimori.update_rate(rate[0]['id'], current_user.shiki_access_token,
                                            user_rate={"episodes": episode, "status": "watching"})
    else:
        return jsonify({
            "status": "ok",
            "message": f"Отметка не требуется"
        }), 200
    if res == {'error': 'reauth'}:
        return {"error": "Token expired"}, 401
    if res == {'error': '404'}:
        return {"error": "Not Found"}, 404

    return jsonify({
        "status": "ok",
        "message": f"Отмечено просмотренным"
    }), 200

@api_bp.route("/user/watch_list", methods=["GET"])
@auth_required
def user_watchlist():
    user_id = current_user.id
    now = time.time()
    user_requests[user_id] = [t for t in user_requests[user_id] if now - t < 1]
    if len(user_requests[user_id]) >= 4:
        wait_time = 1 - (now - user_requests[user_id][0])
        if wait_time > 0:
            time.sleep(wait_time)
        now = time.time()
        user_requests[user_id] = [t for t in user_requests[user_id] if now - t < 1]
    user_requests[user_id].append(time.time())

    res = api.shikimori.get_watchlist(current_user.shiki_user_id, current_user.shiki_access_token)
    if res == {'error': 'reauth'}:
        return {"error": "Token expired"}, 401
    if res == {'error': '404'}:
        return {"error": "Not Found"}, 404

    return res, 200


@api_bp.route("/user/watch_list/last", methods=["GET"])
@auth_required
def user_watchlist_last():
    user_id = current_user.id
    now = time.time()
    user_requests[user_id] = [t for t in user_requests[user_id] if now - t < 1]
    if len(user_requests[user_id]) >= 4:
        wait_time = 1 - (now - user_requests[user_id][0])
        if wait_time > 0:
            time.sleep(wait_time)
        now = time.time()
        user_requests[user_id] = [t for t in user_requests[user_id] if now - t < 1]
    user_requests[user_id].append(time.time())

    res = api.shikimori.last_watched(current_user.shiki_user_id, current_user.shiki_access_token)
    if res == {'error': 'reauth'}:
        return {"error": "Token expired"}, 401
    if res == {'error': '404'}:
        return {"error": "Not Found"}, 404
    elif res is None:
        return "None", 204
    return res, 200

@api_bp.route("/user/get_rate/<int:release_id>", methods=["GET"])
@auth_required
def user_get_rate(release_id):
    user_id = current_user.id
    now = time.time()
    user_requests[user_id] = [t for t in user_requests[user_id] if now - t < 1]
    if len(user_requests[user_id]) >= 4:
        wait_time = 1 - (now - user_requests[user_id][0])
        if wait_time > 0:
            time.sleep(wait_time)
        now = time.time()
        user_requests[user_id] = [t for t in user_requests[user_id] if now - t < 1]
    user_requests[user_id].append(time.time())

    rate = api.shikimori.get_rate(current_user.shiki_user_id, release_id, current_user.shiki_access_token)
    if rate == {'error': 'reauth'}:
        return {"error": "Token expired"}, 401
    if rate == {'error': '404'}:
        return {"error": "Not Found"}, 404
    if rate:
        return rate[0], 200
    else:
        return "None", 204

@api_bp.route("/title/<int:title_id>/translations", methods=["GET"])
def title_translations(title_id):
    res = api.kodik.get_info(title_id)
    if res is None:
        return "None", 204
    return res, 200

@api_bp.route("/title/<int:title_id>/info", methods=["GET"])
@auth_required
def title_info(title_id):
    user_id = current_user.id
    now = time.time()
    user_requests[user_id] = [t for t in user_requests[user_id] if now - t < 1]
    if len(user_requests[user_id]) >= 4:
        wait_time = 1 - (now - user_requests[user_id][0])
        if wait_time > 0:
            time.sleep(wait_time)
        now = time.time()
        user_requests[user_id] = [t for t in user_requests[user_id] if now - t < 1]
    user_requests[user_id].append(time.time())

    res = api.shikimori.get_title_info(title_id, current_user.shiki_access_token)
    if res == {'error': 'reauth'}:
        return {"error": "Token expired"}, 401
    if res == {'error': '404'}:
        return {"error": "Not Found"}, 404
    return res, 200

@api_bp.route("/title/<int:title_id>/info/poster", methods=["GET"])
@auth_required
def title_info_poster(title_id):
    user_id = current_user.id
    now = time.time()
    user_requests[user_id] = [t for t in user_requests[user_id] if now - t < 1]
    if len(user_requests[user_id]) >= 4:
        wait_time = 1 - (now - user_requests[user_id][0])
        if wait_time > 0:
            time.sleep(wait_time)
        now = time.time()
        user_requests[user_id] = [t for t in user_requests[user_id] if now - t < 1]
    user_requests[user_id].append(time.time())

    res = api.shikimori.get_title_poster_highres(title_id, current_user.shiki_access_token)
    if res == {'error': 'reauth'}:
        return {"error": "Token expired"}, 401
    if res == {'error': '404'}:
        return {"error": "Not Found"}, 404
    return res, 200


@api_bp.route("/title/<int:title_id>/related", methods=["GET"])
@auth_required
def title_related(title_id):
    res = api.shikimori.get_title_related(title_id, current_user.shiki_access_token)
    if res == {'error': 'reauth'}:
        return {"error": "Token expired"}, 401
    if res == {'error': '404'}:
        return {"error": "Not Found"}, 404
    return res, 200


@api_bp.route("/title/<int:title_id>/watch", methods=["GET"])
@auth_required
def title_watch(title_id):
    translation = request.args.get('transl')
    episode = request.args.get('ep')
    if translation is None or episode is None:
        return "translation and/or episode is none", 400
    out = {}

    # kodik
    try:
        res = api.kodik.watch_link(title_id, episode, translation)
        out['kodik'] = {
            "720p": res + "720.mp4:hls:manifest.m3u8",
            "480p": res + "480.mp4:hls:manifest.m3u8",
            "360p": res + "360.mp4:hls:manifest.m3u8",
        }
    except NoResults:
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
    # dreamcast
    if translation == "1978":
        original_name = api.shikimori.get_title_info(title_id, current_user.shiki_access_token)['original_name']
        if original_name == {'error': 'reauth'}:
            return {"error": "Token expired"}, 401
        if original_name == {'error': '404'}:
            return {"error": "Not Found"}, 404
        dreamcast_url = api.dreamcast.get_title_url(original_name)
        if dreamcast_url:
            all_episodes = api.dreamcast.get_episodes(dreamcast_url)
            if all_episodes is not None and len(all_episodes) >= int(episode):
                out['dreamcast'] = {
                    '1080p': f"!onlyapp {all_episodes[int(episode)-1]}"
                }
    return out, 200
