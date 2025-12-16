from anime_parsers_ru import KodikParser
from anime_parsers_ru.errors import NoResults

import lxml # ОБЯЗАТЕЛЬНО!!!
kodik_parser = KodikParser(use_lxml=True)


def get_info(title_id):
    try:
        res = kodik_parser.get_info(title_id, 'shikimori')
    except NoResults:
        return None
    return res


def search(query):
    try:
        result = kodik_parser.search(query, limit=50)
    except NoResults:
        return []
    out = []
    for res in result:
        if res['shikimori_id'] is not None:
            out.append({
                'id': res['shikimori_id'],
                'name': res['title'],
                'type': res['material_data']['anime_kind'],
                'status': res['material_data']['all_status'],
                'episodes_released': res['material_data']['episodes_aired'],
                'episodes_total': res['material_data']['episodes_total'],
                'poster_url': res['material_data']['poster_url']
            })
            pass
    return out


def watch_link(title_id, seria_num, translation_id):
    res = kodik_parser.get_info(title_id, 'shikimori')
    if res['series_count'] == 0:
        return "https:" + kodik_parser.get_link(title_id, "shikimori", 0, translation_id)[0]
    else:
        return "https:" + kodik_parser.get_link(title_id, "shikimori", seria_num, translation_id)[0]


if __name__ == '__main__':
    print(watch_link(32262, 10, 609))
