# not in use

import requests
import re
from pprint import pprint

def get_episodes(shiki_id):
    url = "https://api.cdnlibs.org/api/episodes"
    resp = requests.get(url, headers={'site-id': '5'}, json={"shiki_id": shiki_id})
    return resp.json()

def get_episode(episode_id):
    url = f"https://api.cdnlibs.org/api/episodes/{episode_id}"
    resp = requests.get(url, headers={'Authorization': 'Bearer token'})
    return resp.json()

if __name__ == '__main__':
    #shiki_id = 57025
    #resp = get_episodes(shiki_id)
    resp = get_episode(134498)
    pprint(resp)