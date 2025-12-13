# not in use
# https://github.com/vypivshiy/anicli-api

from anicli_api.source.anilibme import Extractor
from anicli_api.tools import cli

def _print_to_rows(items):
    print(*[f"{i}) {r}" for i, r in enumerate(items)], sep="\n")

if __name__ == "__main__":
    ex = Extractor()
    print("PRESS CTRL + C for exit app")
    results = ex.search("Takanashi Rikka Kai: Chuunibyou demo Koi ga Shitai! Movie")
    _print_to_rows(results)

    anime = results[0].get_anime()
    print(anime)

    episodes = anime.get_episodes()
    _print_to_rows(episodes)
    episode = episodes[0]

    sources = episode.get_sources()
    _print_to_rows(sources)
    source = sources[int(input("source > "))]

    videos = source.get_videos()
    _print_to_rows(videos)
    video = videos[int(input("video > "))]
    print(video.type, video.quality, video.url, video.headers)