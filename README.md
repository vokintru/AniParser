# [AniParser](https://anime.v0k1nt.su)
![AniParser logo](https://raw.githubusercontent.com/vokintru/AniParser/refs/heads/main/resources/logo.webp)\
Веб-приложение для просмотра аниме из разных плееров

### Функции:
 - Поиск через API shikimori.one
 - Плеер Kodik
 - Синхронизация просмотра со списком на shikimori

## Запуск
1. Создание venv, установка `requirements.txt`
2. Настройка `config.py` и `.env`
```python
# ./config.py

HOST = "0.0.0.0" # хост фласка (0.0.0.0 - паблик/ 127.0.0.1 - локалка)
POST = "8080" # порт фласка
GLOBAL_URL = "http://127.0.0.1:8080" # путь для callback-ов от shikimori
# Если локалка - оставьте 127, если публичный хост, заметите на IP/домен хоста
```

Для настройки `.env`, сначала нужно создать oauth проложение [здесь](https://shikimori.one/oauth/applications)

> [!IMPORTANT]
> В поле `Redirect URI` нужно указать `GLOBAL_URL/callback` из шага выше\
> *Пример: `http:/127.0.0.1:8080/callback`*\
> \
> В поле `Scopes` нужно выбрать галочку `user_rates`

```dotenv
# ./.env
SECRET_KEY="" // случайный ключ
SHIKI_APP_ID="" // полученный Client ID (можно найти в блоке OAuth2 Credentials)
SHIKI_APP_SECRET="" // полученный Client Secret (можно найти там же)
SHIKI_USERAGENT="" // название вашего приложения
```
3. Запуск ``python main.py``

## Credits

- [Telegram](https://t.me/AnimeParser)
- [Бот для связи](https://t.me/AniFeedBot)
- [Поддержать](https://pay.cloudtips.ru/p/ad7b4660)
