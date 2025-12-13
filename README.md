# AniParser
Веб-приложение для просмотра аниме из разных плееров

### Функции:
 - Поиск по API shikimori.one
 - Плееры Kodik и Anilibria (AniLiberty)
 - Синхронизация просмотра со списком на shikimori
### В будущем:
 - Добавить Aniboom, плеер студийной банды, *возможно плеер anilib.me*
 - Watchtogether + активность в Discord
 - Приложение на телефоны ([В разработке](https://github.com/vokintru/AnimeParser))
 - Приложение для пк (для [Anime4K](https://github.com/bloc97/Anime4K))
 - Прокси, для обхода cors браузера
 - *Будет дополняться*

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
