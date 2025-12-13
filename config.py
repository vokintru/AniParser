import urllib
from dotenv import dotenv_values

env = dotenv_values(".env")


# Flask App
HOST = "0.0.0.0"
POST = "8080"
SECRET_KEY = env.get('SECRET_KEY')

# Shikimori App
GLOBAL_URL = 'http://127.0.0.1:8080' # For shikimori callbacks
SHIKI_APP_ID = env.get('SHIKI_APP_ID')
SHIKI_APP_SECRET = env.get('SHIKI_APP_SECRET')
SHIKI_AUTH_LINK = f"https://shikimori.one/oauth/authorize?client_id={SHIKI_APP_ID}&redirect_uri={urllib.parse.quote(f'{GLOBAL_URL}/callback', safe='')}&response_type=code&scope=user_rates"
APP_AUTH_LINK = f"https://shikimori.one/oauth/authorize?client_id={SHIKI_APP_ID}&redirect_uri={urllib.parse.quote(f'{GLOBAL_URL}/app/auth', safe='')}&response_type=code&scope=user_rates"

# Shikimori API
SHIKI_USERAGENT = env.get('SHIKI_USERAGENT')

