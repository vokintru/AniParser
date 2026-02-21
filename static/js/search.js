let debounceTimeout;
let currentRequestId = 0;
let infoQueue = [];
let infoTimerActive = false;

const searchInput = document.getElementById('searchInput');
const container = document.getElementById('resultContainer');

function redirectIfReauth(response, json = null) {
	if (response.status === 401 || json === 'reauth') {
		window.location.href = '/reauth';
		return true;
	}
	return false;
}

searchInput.addEventListener('input', () => handleSearch(searchInput.value.trim()));
window.addEventListener('DOMContentLoaded', () => {
	const initialQuery = searchInput.value.trim();
	if (initialQuery) handleSearch(initialQuery);
});

function handleSearch(query) {
	clearTimeout(debounceTimeout);

	debounceTimeout = setTimeout(async () => {
		container.innerHTML = '';
		if (!query) return;

		const thisRequestId = ++currentRequestId;
		infoQueue = [];

		try {
			const searchResponse = await fetch(`/api/v1/search/${encodeURIComponent(query)}`);
			if (!searchResponse.ok) {
                if (searchResponse.status === 401) {
                    window.location.href = '/reauth';
                    return;
                }
                throw new Error('Ошибка запроса');
            }

			if (!searchResponse.ok) throw new Error('Ошибка запроса поиска');

			const searchResults = await searchResponse.json();
			if (thisRequestId !== currentRequestId) return;

			if (!Array.isArray(searchResults) || searchResults.length === 0) {
				container.innerHTML = '<p class="text-white">Ничего не найдено</p>';
				return;
			}

			searchResults.forEach((item, index) => {
				const link = document.createElement('a');
				link.href = `/release/${item.id}`;
				link.className = 'block';

				const placeholder = document.createElement('div');
				placeholder.className = 'cinput flex items-start text-white p-2 rounded-lg max-w-2xl mx-auto';
				placeholder.dataset.id = item.id;

				const statusMap = {
                    released: { text: 'Вышло', color: 'text-green-400' },
                    ongoing: { text: 'Онгоинг', color: 'text-blue-400' },
                    anons: { text: 'Анонс', color: 'text-orange-400' }
                };
                const status = statusMap[item.status] || { text: item.status, color: 'text-gray-300' };
                const kindMap = {
                    tv: "TV Сериал",
                    movie: "Фильм",
                    ona: "ONA",
                    ova: "OVA",
                    tv_special: "Спецвыпуск",
                    special: "Спецвыпуск",
                    music: "Клип",
                    pv: "Проморолик",
                    cm: "Реклама"
                };
                item.kind = kindMap[item.kind] || item.kind;

                placeholder.innerHTML = `
                    <img
                        src="https://${SHIKI_DOMAIN}${item.image.original}"
                        alt="Постер"
                        class="w-full max-w-[80px] h-auto rounded-md object-cover mr-4 portrait"
                    />
                    <div class="space-y-1 text-sm leading-snug flex-1 min-w-0" id="watch-container">
                        <h1 class="text-base font-bold">${item.russian}</h2>
                        <p><span class="text-gray-300 font-bold">${item.kind}</span><span class="text-gray-300"> | </span><span class="text-gray-300 font-bold">${item.aired_on.slice(0, 4)} год</span></p>
                        <p><span class="${status.color} font-bold">${status.text}</span> <span class="text-gray-300">${(item.status === 'released')
	? ''
	: (item.episodes === 0
		? `${item.episodes_aired}/?`
		: `${item.episodes_aired}/${item.episodes}`)}

                                                                                                                        </span></p>
                    </div>
                `;

				link.appendChild(placeholder);
				container.appendChild(link);
			});

		} catch (error) {
			if (thisRequestId === currentRequestId) {
				console.error('Ошибка при поиске:', error);
			}
		}
	}, 300);
}