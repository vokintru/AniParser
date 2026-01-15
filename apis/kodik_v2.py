import requests
import config
from bs4 import BeautifulSoup as Soup
from base64 import b64decode
import json
import lxml

def get_translations(title_id, get_type=False):
    try:
        response = requests.get(f'https://kodikapi.com/search?token={config.KODIK_TOKEN}&shikimori_id={title_id}')
        res = []
        for tr in response.json()['results']:
            res.append({
                'translation_id': tr['translation']['id'],
                'type': tr['translation']['type'],
                'name': tr['translation']['title'],
                'url': tr['link'],
                **({'eps': tr['episodes_count']} if tr['type'] == "anime-serial" else {})
            })
    except Exception as e:
        return None
    if get_type:
        return res, response.json()['results'][0]['type']
    return res

def get_eps(title_id):
    try:
        response = requests.get(f'https://kodikapi.com/search?token={config.KODIK_TOKEN}&shikimori_id={title_id}').json()
        max_episodes = max(item['episodes_count'] for item in response['results'])
    except Exception as e:
        return None
    return max_episodes

def _convert_char(char: str, num):
    low = char.islower()
    alph = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    if char.upper() in alph:
        ch = alph[(alph.index(char.upper()) + num) % len(alph)]
        if low:
            return ch.lower()
        else:
            return ch
    else:
        return char

def _convert( string: str):
    _crypt_step = None
    for rot in range(0, 26):
        crypted_url = "".join([_convert_char(i, rot) for i in string])
        padding = (4 - (len(crypted_url) % 4)) % 4
        crypted_url += "=" * padding
        try:
            result = b64decode(crypted_url).decode("utf-8")
            if "mp4:hls:manifest" in result:
                _crypt_step = rot
                return result
        except UnicodeDecodeError:
            continue
    else:
        raise "DecryptionFailure"

def watch_links(title_id:int, ep_num:int, translation_id:int):
    res, atype = get_translations(title_id, get_type=True)
    tr = next((i for i in res if i.get('translation_id') == translation_id), None)
    data = requests.get("https:" + tr['url'] + f"?min_age=16&first_url=false&season=1&episode={0 if atype == 'anime' else ep_num}").text
    urlParams = data[data.find("urlParams") + 13:]
    urlParams = json.loads(urlParams[: urlParams.find(";") - 1])
    soup = Soup(data, "lxml")
    script_url = soup.find_all("script")[1].get_attribute_list("src")[0]

    hash_container = soup.find_all("script")[4].text
    video_type = hash_container[hash_container.find(".type = '") + 9:]
    video_type = video_type[: video_type.find("'")]
    video_hash = hash_container[hash_container.find(".hash = '") + 9:]
    video_hash = video_hash[: video_hash.find("'")]
    video_id = hash_container[hash_container.find(".id = '") + 7:]
    video_id = video_id[: video_id.find("'")]

    data = requests.get("https://kodik.info" + script_url).text
    url = data[data.find("$.ajax") + 30: data.find("cache:!1") - 3]
    post_link = b64decode(url.encode()).decode()

    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    params = {
        "hash": video_hash,
        "id": video_id,
        "type": video_type,
        'd': urlParams['d'],
        'd_sign': urlParams['d_sign'],
        'pd': urlParams['pd'],
        'pd_sign': urlParams['pd_sign'],
        'ref': '',
        'ref_sign': urlParams['ref_sign'],
        'bad_user': 'true',
        'cdn_is_working': 'true',
    }

    data = requests.post(f"https://kodik.info{post_link}", data=params, headers=headers).json()
    res = {}
    for quality, items in data['links'].items():
        url = items[0]['src']
        url = url if "mp4:hls:manifest" in url else _convert(url)
        res[quality] = "https:" + url
    return res


if __name__ == '__main__':
    print(get_translations(61142))
