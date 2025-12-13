document.addEventListener("DOMContentLoaded", () => {
    updateWatchList();
});

document.getElementById('searchInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const query = encodeURIComponent(this.value.trim());
        if (query) {
            window.location.href = `/search?q=${query}`;
        }
    }
});

document.getElementById('shikiInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const id = this.value.trim();
        if (/^\d+$/.test(id)) {
            window.location.href = `/release/${id}`;
        } else {
            alert('ID должен содержать только цифры');
        }
    }
});

async function updateWatchList() {
  try {
    const res = await fetch('/api/v1/user/watch_list/last');
    if (!res.ok) {
			if (res.status === 401) {
				window.location.href = '/reauth';
				return;
			}
			throw new Error('Ошибка запроса');
		}

	if (res.status === 204) {
        document.getElementById('watch-poster') = '/resources/no_poster.jpg';
        const nameSpan = document.getElementById('watch-title').innerHTML = 'У тебя нету ни одного тайтла со статусом "Смотрю"';
        const episodesP = document.getElementById('watch-episodes').innerHTML = "";
        return;
    }

    const data = await res.json();
    if (!data) {
      console.warn('Недостаточно данных для отображения');
      return;
    }

    const poster = document.getElementById('watch-poster');
    if (poster) poster.src = data.poster ? `https://shikimori.one${data.poster}` : '/resources/no_poster.jpg';

    const nameSpan = document.getElementById('watch-title');
    if (nameSpan) nameSpan.innerHTML = `${data.name}` || 'None';

    const episodesP = document.getElementById('watch-episodes');
    if (episodesP) {
      episodesP.innerHTML = `<span class="font-semibold">Эпизодов просмотрено:</span> <span class="text-gray-300">${data.episodes}/${data.total_episodes}</span>`;
    }

    let btn = document.getElementById('watch-button');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'watch-button';
      btn.className = 'flex-grow h-8 min-w-[80px] max-w-[150px] border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 rounded shadow flex items-center justify-center gap-1 px-3 py-1 mx-auto';
      btn.textContent = 'Смотреть дальше';
      const container = document.getElementById('watch-container');
      if (container) container.appendChild(btn);
    }
    btn.onclick = () => {
      window.location.href = `/watch/${data.title_id}?ep=${data.episodes + 1}`;
    };

  } catch (error) {
    console.error('Ошибка при обновлении списка:', error);
  }
}
