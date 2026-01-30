import random
import requests
import config
import time
from data import db_session
from data.user import User
from bs4 import BeautifulSoup
from datetime import datetime

def request(protocol, url, headers: dict = None, data: dict = None, json = None):
    if protocol == "GET":
        try:
            resp = requests.get(url, headers=headers, data=data, json=json)
        except Exception as e:
            raise EOFError(f"Ошибка запроса: {e}")
    elif protocol == "POST":
        try:
            resp = requests.post(url, headers=headers, data=data, json=json)
        except Exception as e:
            raise EOFError(f"Ошибка запроса: {e}")
    elif protocol == "PATCH":
        try:
            resp = requests.patch(url, headers=headers, data=data, json=json)
        except Exception as e:
            raise EOFError(f"Ошибка запроса: {e}")
    else:
        raise EOFError(f"Протокол не поддерживается: {protocol}")
    if resp.status_code == 401 and resp.json() == {"error": "invalid_token",
                                                   "error_description": "The access token is invalid",
                                                   "state": "unauthorized"}:
        new_token = refresh_token(headers['Authorization'])
        if new_token['status'] == 'failure' and new_token['do'] == 'reauth':
            return 'reauth'
        elif new_token['status'] == 'success':
            headers['Authorization'] = f'Bearer {new_token["token"]}'
            return request(url, protocol, headers, data)
    elif resp.status_code == 200 or resp.status_code == 201:
        return resp
    elif resp.status_code == 429:
        return request(protocol, url, headers, data)
    elif resp.status_code == 404:
        return '404'
    else:
        raise EOFError(resp)


def refresh_token(token):
    try:
        resp = requests.post('https://shiki.one/oauth/token',
                             headers={
                                 'User-Agent': config.SHIKI_USERAGENT
                             },
                             data={
                                 "grant_type": "refresh_token",
                                 "client_id": config.SHIKI_APP_ID,
                                 "client_secret": config.SHIKI_APP_SECRET,
                                 "refresh_token": token
                             })
    except Exception as e:
        return {'status': 'failure',
                'do': e}
    if resp.status_code == 400 and resp.json() == {'error': 'invalid_grant',
                                                   'error_description': 'The provided authorization grant is invalid, expired, revoked, does not match the redirection URI used in the authorization request, or was issued to another client.'}:
        return {'status': 'failure',
                'do': 'reauth'}
    rest_json = resp.json()
    db_sess = db_session.create_session()
    user = db_sess.query(User).filter(User.shiki_refresh_token == token).first()
    user.shiki_access_token = rest_json['access_token']
    user.shiki_refresh_token = rest_json['refresh_token']
    db_sess.commit()
    db_sess.close()
    return {'status': 'success',
            'token': rest_json['access_token']}


def get_title_poster_highres(title_id, token):
    resp = request("GET", f"https://shiki.one/animes/{title_id}",
                   headers={
                       'User-Agent': config.SHIKI_USERAGENT,
                       'Authorization': f'Bearer {token}'
                   })
    if resp == "404":
        return {'error': '404'}
    soup = BeautifulSoup(resp.text, "lxml")
    poster_div = soup.find("div", class_="b-db_entry-poster")
    if poster_div:
        link = poster_div.get("data-href")
        return link
    return None


def get_title_info(title_id, token):
    resp = request("GET", f"https://shiki.one/api/animes/{title_id}",
                   headers={
                       'User-Agent': config.SHIKI_USERAGENT,
                       'Authorization': f'Bearer {token}'
                   })
    if resp == 'reauth':
        return {'error': 'reauth'}
    elif resp == "404":
        return {'error': '404'}
    else:
        resp = resp.json()

    kind_map = {
        "tv": "TV Сериал",
        "movie": "Фильм",
        "ona": "ONA",
        "ova": "OVA",
        "tv_special": "Спецвыпуск",
        "special": "Спецвыпуск",
        "music": "Клип",
        "pv": "Проморолик",
        "cm": "Реклама"
    }

    status_map = {
        'released': 'Вышло',
        'ongoing': 'Онгоинг',
        'anons': 'Анонс'
    }
    rating_map = {
        'g': 'G',
        'pg': 'PG',
        'pg_13': 'PG-13',
        'r': 'R-17',
        'r_plus': 'R+',
        'rx': 'Rx',
    }
    return {
        'name': resp['russian'],
        'original_name': resp['name'],
        'poster': 'https://shiki.one' + resp['image']['original'],
        'type': kind_map.get(resp['kind'], resp['kind']),
        'score': resp['score'],
        'status': status_map.get(resp['status'], resp['status']),
        'total_episodes': resp['episodes'],
        'released_episodes': resp['episodes_aired'],
        'started': resp['aired_on'],
        'released': resp['released_on'],
        'rating': rating_map.get(resp['rating'], resp['rating']),
        'is_anons': resp['anons'],
        'is_ongoing': resp['ongoing'],
        'next_episode_at': resp['next_episode_at'],
        'user_rate': resp['user_rate']
    }


def get_title_related(title_id, token):
    resp = request("GET", f"https://shiki.one/api/animes/{title_id}/related",
                   headers={
                       'User-Agent': config.SHIKI_USERAGENT,
                       'Authorization': f'Bearer {token}'
                   })
    if resp == 'reauth':
        return {'error': 'reauth'}
    elif resp == "404":
        return {'error': '404'}
    else:
        resp = resp.json()
    related = []
    for relation in resp:
        related.append({
            'type': relation['relation_russian'],
            'anime': relation['anime'],
            'manga': relation['manga'],
        })
    return related

def random_watchlist(user_id, token):
    resp = request("GET",
                         f"https://shiki.one/api/users/{user_id}/anime_rates?limit=5000&status=planned",
                         headers={
                             'User-Agent': config.SHIKI_USERAGENT,
                             'Authorization': f'Bearer {token}'
                         })
    if resp == 'reauth':
        return {'error': 'reauth'}
    rand = random.choice(resp.json())
    start_time = time.time()
    while time.time() - start_time < 1:
        if rand['anime']['status'] == 'released' or rand['anime']['status'] == 'ongoing':
            return rand
        else:
            rand = random.choice(resp.json())
    return None


def get_watchlist(user_id, token):
    resp_rates = request("GET", f"https://shiki.one/api/v2/user_rates?user_id={user_id}&status=watching&target_type=Anime",
                   headers={
                       'User-Agent': config.SHIKI_USERAGENT,
                       'Authorization': f'Bearer {token}'
                   })
    if resp_rates == 'reauth':
        return {'error': 'reauth'}
    sorted_rates = sorted(
        resp_rates.json(),
        key=lambda x: datetime.fromisoformat(x["updated_at"]),
        reverse=True
    )

    resp_animes = request("GET", f"https://shiki.one/api/animes?mylist=watching&limit=50",
                   headers={
                       'User-Agent': config.SHIKI_USERAGENT,
                       'Authorization': f'Bearer {token}'
                   })
    if resp_animes == 'reauth':
        return {'error': 'reauth'}
    new_data = []

    kind_map = {
        "tv": "TV Сериал",
        "movie": "Фильм",
        "ona": "ONA",
        "ova": "OVA",
        "tv_special": "Спецвыпуск",
        "special": "Спецвыпуск",
        "music": "Клип",
        "pv": "Проморолик",
        "cm": "Реклама"
    }

    status_map = {
        'released': 'Вышло',
        'ongoing': 'Онгоинг',
        'anons': 'Анонс'
    }

    for rate in sorted_rates:
        item = {
            'id': rate['id'],
            'episodes': rate['episodes'],
            'title_id': rate['target_id'],
            'updated_at': rate['updated_at']
        }

        for anime in resp_animes.json():
            if anime['id'] == rate['target_id']:
                if anime['status'] != "ongoing":
                    item['total_episodes'] = anime['episodes']
                else:
                    item['total_episodes'] = anime['episodes_aired']
                item['name'] = anime['russian']
                item['original_name'] = anime['name']
                item['poster'] = anime['image']['original']
                item['type'] = kind_map.get(anime['kind'], anime['kind'])
                item['score'] = anime['score']
                item['status'] = status_map.get(anime['status'], anime['status'])
                break

        new_data.append(item)
    return new_data

def last_watched(user_id, token):
    watchlist = get_watchlist(user_id, token)
    if watchlist == {'error': 'reauth'}:
        return {'error': 'reauth'}
    if watchlist:
        return watchlist[0]
    else:
        return None

def get_rate(user_id, anime_id, token):
    resp = request("GET",
                   f"https://shiki.one/api/v2/user_rates?user_id={user_id}&target_id={anime_id}&target_type=Anime&limit=1",
                   headers={
                       'User-Agent': config.SHIKI_USERAGENT,
                       'Authorization': f'Bearer {token}'
                   })
    if resp == 'reauth':
        return {'error': 'reauth'}
    if resp == "404":
        return {'error': '404'}
    return resp.json()

def create_rate(user_id, anime_id, token):
    resp = request("POST",
                   f"https://shiki.one/api/v2/user_rates/",
                   headers={
                       'User-Agent': config.SHIKI_USERAGENT,
                       'Authorization': f'Bearer {token}'
                   },
                   json={
                       "user_rate": {
                           "user_id": user_id,
                           "target_type": "Anime",
                           "target_id": anime_id,
                       }
                   })
    if resp == 'reauth':
        return {'error': 'reauth'}
    return resp.json()

def update_rate(rate_id, token, **kwargs):
    resp = request("PATCH",
                   f"https://shiki.one/api/v2/user_rates/{rate_id}",
                   headers={
                       'User-Agent': config.SHIKI_USERAGENT,
                       'Authorization': f'Bearer {token}'
                   },
                   json={
                       "user_rate": kwargs['user_rate']
                   })
    if resp == 'reauth':
        return {'error': 'reauth'}
    if resp == "404":
        return {'error': '404'}
    return resp.json()

def search(query, token):
    resp = request("GET", f"https://shiki.one/api/animes?search={query}&limit=50&rating=!rx",
                   headers={
                       'User-Agent': config.SHIKI_USERAGENT,
                       'Authorization': f'Bearer {token}'
                   })
    if resp == 'reauth':
        return {'error': 'reauth'}
    return resp.json()

def search_trending(token):
    resp = request("GET", f"https://shiki.one/api/animes?status=ongoing&order=ranked&page={random.randint(1, 4)}&limit=8&rating=!rx",
                   headers={
                       'User-Agent': config.SHIKI_USERAGENT,
                       'Authorization': f'Bearer {token}'
                   })
    if resp == 'reauth':
        return {'error': 'reauth'}
    return resp.json()


if __name__ == '__main__':
    # db_session.global_init("../database.db")
    pass
