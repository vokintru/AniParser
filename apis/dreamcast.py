import requests
from requests.exceptions import ConnectionError
from bs4 import BeautifulSoup as Soup
import re
import base64
from pprint import pprint

def get_title_url(orig_title):
    url = "https://dreamerscast.com/"

    headers = {
        "accept": "application/json, text/javascript, */*; q=0.01",
        "accept-language": "ru,en-US;q=0.9,en;q=0.8",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "priority": "u=1, i",
        "sec-ch-ua": '"Chromium";v="133", "Not(A:Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-requested-with": "XMLHttpRequest",
        "referer": "https://dreamerscast.com/"
    }

    data = {
        "search": orig_title,
        "status": "",
        "pageSize": "1",
        "pageNumber": "1"
    }

    try:
        response = requests.post(url, headers=headers, data=data, timeout=1)
        if response.status_code == 200:
            releases = response.json()['releases']
            if len(releases) > 0 and releases[0]['original'] == orig_title:
                return f"https://dreamerscast.com{releases[0]['url']}"
            else:
                return None
        else:
            return None
    except:
        return None

def get_episodes(url, use_lxml=True):
    try:
        html = requests.get(url, timeout=1).text
        soup = Soup(html, "lxml") if use_lxml else Soup(html, "html.parser")
        scripts = soup.find_all("script")
        pattern = re.compile(r'atob\("([^"]+)"\)')
        encoded_string = None
        for script in scripts:
            if script.string:
                match = pattern.search(script.string)
                if match:
                    encoded_string = match.group(1)

        if encoded_string:
            encoded_string = base64.b64decode(encoded_string).decode('utf-8').split('||||')
        return encoded_string
    except:
        return None

if __name__ == '__main__':
    import lxml
    title = get_title_url("Shiunji-ke no Kodomotachi")
    print(title)
    print(get_episodes(title))

