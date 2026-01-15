import pprint
from anime_parsers_ru import AniboomParser
import config
from apis import shikimori

parser = AniboomParser()

def watch_link(animego_id, episode_num, translation_id):
    return parser.get_mpd_playlist(animego_id, episode_num, translation_id)

def find_match(anime_id, token):
    title = shikimori.request("GET", f"https://shikimori.one/api/animes/{anime_id}",
                   headers={
                       'User-Agent': config.SHIKI_USERAGENT,
                       'Authorization': f'Bearer {token}'
                   }).json()

    title_name = title['name']
    anime_names = list({title_name} | {title['name']} | set(title['english']) | set(title['japanese']) | set(title['synonyms']))

    fast_s = parser.fast_search(title_name)
    s = parser.search(title_name)
    all_names = list(set([s[0]['title']] + s[0]['other_titles']) | {fast_s[0]['title'], fast_s[0]['other_title']})

    if set(all_names) & set(anime_names):
        return s[0]
    else:
        return None

if __name__ == '__main__':
    tt = "ls2U220QLgTGmKR-Fp4ffNI8xnx54Z8xNUm7o-C5Bzg"

    match = find_match(59047, tt)
    translations = match['translations']
    pprint.pp(translations)

    parser.get_as_file(match['animego_id'], 1, 41, 'filename.mpd')
    #pprint.pp(watch_link(match['animego_id'], 1, 41))
