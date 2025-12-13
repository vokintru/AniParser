const container = document.getElementById('related-container');
const randBtn = document.getElementById('randBtn');

window.addEventListener('DOMContentLoaded', () => {
	loadWatchlist();
});

randBtn.onclick = () => {
  window.location.href = "/watchlist/rand";
};

async function loadWatchlist() {
	try {
		const response = await fetch('/api/v1/user/watch_list');
		if (!response.ok) {
			if (response.status === 401) {
				window.location.href = '/reauth';
				return;
			}
			throw new Error('Ошибка запроса watch_list');
		}

		const watchlist = await response.json();
		container.innerHTML = '';

		if (!Array.isArray(watchlist) || watchlist.length === 0) {
			container.innerHTML = '<p class="text-white">Список пуст</p>';
			return;
		}

		watchlist.forEach(item => {
			const card = document.createElement('div');
			card.className = 'cinput flex items-start text-white p-2 rounded-lg max-w-sm mx-auto';

			const poster = item.poster
				? `https://shikimori.one${item.poster}`
				: '/resources/no_poster.jpg';

			card.innerHTML = `
				<a href="/release/${item.title_id}">
					<img src="${poster}" alt="Постер" class="w-full max-w-[60px] h-auto rounded-md object-cover mr-4 portrait">
				</a>
				<div class="space-y-1 text-sm leading-snug flex-1 min-w-0">
					<a href="/release/${item.title_id}">
						<h2 class="text-base font-bold truncate text-center">${item.name}</h2>
						<p class="text-center">
							<span class="font-semibold">Эпизодов просмотрено:</span>
							<span class="text-gray-300">${item.episodes}/${item.total_episodes}</span>
						</p>
					</a>
					<button onclick="window.location.href='/watch/${item.title_id}?ep=${item.episodes + 1}'"
						class="h-8 min-w-[80px] max-w-[150px] border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 rounded shadow flex items-center justify-center gap-1 px-3 py-1 mx-auto">
						Смотреть дальше
					</button>
				</div>
			`;

			container.appendChild(card);
		});
	} catch (err) {
		console.error('Ошибка загрузки watchlist:', err);
	}
}
