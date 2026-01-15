from flask import Blueprint, request, redirect, render_template, jsonify, make_response
from flask_login import login_required, current_user
from functools import wraps
import requests
import config
from data import db_session
from data.user import User
from datetime import datetime, timedelta
from flask_login import login_user
import jwt

auth_bp = Blueprint('auth_bp', __name__)
app_sessions = {}

@auth_bp.route("/callback")
def callback():
    code = request.args.get('code')
    r = requests.post('https://shikimori.one/oauth/token',
                      headers={'User-Agent': config.SHIKI_USERAGENT},
                      params={'grant_type': 'authorization_code',
                              'client_id': config.SHIKI_APP_ID,
                              'client_secret': config.SHIKI_APP_SECRET,
                              'code': code,
                              'redirect_uri': f'{config.GLOBAL_URL}/callback'})
    if r.ok and r.json():

        if r.json()['scope'] != 'user_rates':
            return redirect('/?error=Вы не приняли Scopes!')
        else:
            resp = r.json()
            db_sess = db_session.create_session()
            r = requests.get('https://shikimori.one/api/users/whoami',
                             headers={'User-Agent': config.SHIKI_USERAGENT,
                                      'Authorization': f'Bearer {resp["access_token"]}'})
            user = db_sess.query(User).filter(User.shiki_user_id == r.json()['id']).first()
            if not user:
                user = User(
                    modified_date=datetime.now()
                )
                db_sess.add(user)
                db_sess.commit()
                db_sess.refresh(user)
            user.shiki_access_token = resp['access_token']
            user.shiki_refresh_token = resp['refresh_token']
            user.shiki_user_id = r.json()['id']
            user.modified_date = datetime.now()
            db_sess.commit()
            login_user(user, remember=True)
            db_sess.close()
            return redirect('/')
    return redirect('/?error=Ошибка авторизации')

@auth_bp.route("/login")
def login():
    resp = make_response(render_template("index.html", shiki_requiered=True, shiki_url=config.SHIKI_AUTH_LINK))
    return resp

@auth_bp.route("/reauth")
def reauth():
    return redirect(config.SHIKI_AUTH_LINK)

@auth_bp.route("/app/login")
def app_login():
    return redirect(config.APP_AUTH_LINK)

@auth_bp.route("/app/auth")
@login_required
def app_auth():
    code = request.args.get('code')
    r = requests.post('https://shikimori.one/oauth/token',
                      headers={'User-Agent': config.SHIKI_USERAGENT},
                      params={'grant_type': 'authorization_code',
                              'client_id': config.SHIKI_APP_ID,
                              'client_secret': config.SHIKI_APP_SECRET,
                              'code': code,
                              'redirect_uri': f'{config.GLOBAL_URL}/app/auth'})
    if r.ok and r.json():

        if r.json()['scope'] != 'user_rates':
            return redirect('/?error=Вы не приняли разрешения!')
        else:
            resp = r.json()
            db_sess = db_session.create_session()
            r = requests.get('https://shikimori.one/api/users/whoami',
                             headers={'User-Agent': config.SHIKI_USERAGENT,
                                      'Authorization': f'Bearer {resp["access_token"]}'})
            user = db_sess.query(User).filter(User.shiki_user_id == r.json()['id']).first()
            if not user:
                user = User(
                    modified_date=datetime.now()
                )
                db_sess.add(user)
                db_sess.commit()
                db_sess.refresh(user)
            user.shiki_access_token = resp['access_token']
            user.shiki_refresh_token = resp['refresh_token']
            user.shiki_user_id = r.json()['id']
            user.modified_date = datetime.now()
            db_sess.commit()
            login_user(user, remember=True)
            db_sess.close()

            token = jwt.encode({
                "user_id": current_user.id,
                "exp": datetime.utcnow() + timedelta(days=1)
            }, config.SECRET_KEY, algorithm="HS256")
            # return redirect(f"animeparser://?token={token}") todo: на релизе разкоментить
            return redirect(f"exp://128.0.0.1:8081/--/?token={token}")

    return redirect('/?error=Ошибка авторизации')


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")
        if token is None or not token.startswith("Bearer "):
            return {"error": "Token missing"}, 401
        token = token.split()[1]

        try:
            payload = jwt.decode(token, config.SECRET_KEY, algorithms=["HS256"])
            request.user_id = payload["user_id"]
        except jwt.ExpiredSignatureError:
            return {"error": "Token expired"}, 401
        except jwt.InvalidTokenError:
            return {"error": "Invalid token"}, 401

        return f(*args, **kwargs)
    return decorated

@auth_bp.route("/app/check")
@token_required
def app_check():
    return 'OK', 200