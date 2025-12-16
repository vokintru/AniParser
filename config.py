import urllib
from dotenv import load_dotenv
import os

load_dotenv()

# Flask App
HOST = "0.0.0.0"
POST = "8080"
SECRET_KEY = os.getenv('SECRET_KEY')

# Shikimori App
GLOBAL_URL = 'http://127.0.0.1:8080' # For shikimori callbacks
SHIKI_APP_ID = os.getenv('SHIKI_APP_ID')
SHIKI_APP_SECRET = os.getenv('SHIKI_APP_SECRET')
SHIKI_AUTH_LINK = f"https://shikimori.one/oauth/authorize?client_id={SHIKI_APP_ID}&redirect_uri={urllib.parse.quote(f'{GLOBAL_URL}/callback', safe='')}&response_type=code&scope=user_rates"
APP_AUTH_LINK = f"https://shikimori.one/oauth/authorize?client_id={SHIKI_APP_ID}&redirect_uri={urllib.parse.quote(f'{GLOBAL_URL}/app/auth', safe='')}&response_type=code&scope=user_rates"

# Shikimori API
SHIKI_USERAGENT = os.getenv('SHIKI_USERAGENT')

# Parsers
YUMMY_PUBLIC_TOKEN = os.getenv('YUMMY_PUBLIC_TOKEN')
KODIK_TOKEN = os.getenv('KODIK_TOKEN') # needs for v2 api