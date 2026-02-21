async function safeCall(fn) {
  try {
    await fn();
  } catch (e) {
    console.warn("Error:", e);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await safeCall(loadRelated);
  await safeCall(loadTitleInfo);
});
async function loadTitlePoster() {
	const res = await fetch(`/api/v1/title/${release_id}/info/poster`);
	if (!res.ok) {
			if (res.status === 401) {
				window.location.href = '/reauth';
				return;
			}
			throw new Error('Ошибка запроса poster');
		}
	const data = await res.text();
	const posterImg = document.getElementById("banner");
	if (posterImg && data) {
		posterImg.src = data;
	}
}

function formatDate(date) {
	let options = { year: 'numeric' }
	let locale = 'ru-RU'

	let endDate = new Date(date).toLocaleDateString(locale, options)
	return `${endDate} год`
}

function formatDateRange(start, end) {
	let options = { day: 'numeric', month: 'short', year: 'numeric' }
	let locale = 'ru-RU'

	let startDate = new Date(start).toLocaleDateString(locale, options)

	if (!end || Number(end) === 0) {
		return `с ${startDate}`
	}

	let endDate = new Date(end).toLocaleDateString(locale, options)
	return `с ${startDate} по ${endDate}`
}


function declOfNum(n, titles) {
	n = Math.abs(n) % 100;
	let n1 = n % 10;
	if (n > 10 && n < 20) return titles[2];
	if (n1 > 1 && n1 < 5) return titles[1];
	if (n1 == 1) return titles[0];
	return titles[2];
}

function startCountdown(targetDate) {
	const el = document.getElementById("next-episode-timer");
	if (!el) return;
	let interval = setInterval(updateTimer, 1000);

	function updateTimer() {
		let now = new Date();
		let diff = new Date(targetDate) - now;

		if (diff <= 0) {
			el.textContent = "Эпизод уже вышел!";
			clearInterval(interval);
			return;
		}

		let days = Math.floor(diff / (1000 * 60 * 60 * 24));
		let hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
		let minutes = Math.floor((diff / (1000 * 60)) % 60);
		let seconds = Math.floor((diff / 1000) % 60);

		el.textContent =
			`${days} ${declOfNum(days, ["день","дня","дней"])} ` +
			`${hours} ${declOfNum(hours, ["час","часа","часов"])} ` +
			`${minutes} ${declOfNum(minutes, ["минута","минуты","минут"])} ` +
			`${seconds} ${declOfNum(seconds, ["секунда","секунды","секунд"])}`
	}

	updateTimer();
}

async function loadTitleInfo() {
	const res = await fetch(`/api/v1/title/${release_id}/info`);
	if (!res.ok) {
        if (res.status === 401) {
            window.location.href = '/reauth';
            return;
        }
        throw new Error('Ошибка запроса info');
    }

	const data = await res.json();
	document.getElementById("title").textContent = data.name;

	const posterImg = document.getElementById("banner");
	if (posterImg && data.poster) {
		posterImg.src = data.poster;
	}
	loadTitlePoster();

	document.title = data.name;

	const metaContainer = document.getElementById("info-container");

	if (data.status === "Анонс") {
		metaContainer.innerHTML = `
		    <h1 class="text-2xl font-bold"><a href="https://${SHIKI_DOMAIN}/animes/${release_id}" target="_blank" rel="noopener noreferrer" class="hover:underline">${data.name}</a></h1>
			<p><span class="font-semibold">Статус:</span> ${data.status}</p>
		`;
		return;
	}

	metaContainer.innerHTML = `
		<h1 class="text-2xl font-bold"><a href="https://${SHIKI_DOMAIN}/animes/${release_id}" target="_blank" rel="noopener noreferrer" class="hover:underline">${data.name}</a></h1>
		<p><span class="font-semibold">Тип:</span> ${data.type}</p>
		<p><span class="font-semibold">Статус:</span> ${data.status}</p>
		<p><span class="font-semibold">Оценка:</span> ${data.score}</p>
		<p><span class="font-semibold">Возрастной рейтинг:</span> ${data.rating}</p>
	`;
	if (data.total_episodes == 0) {
	    data.total_episodes = "?"
	}
	if (data.is_ongoing) {
		metaContainer.innerHTML += `
			<p><span class="font-semibold">Кол-во серий:</span> ${data.released_episodes}/${data.total_episodes}</p>
			<p><span class="font-semibold">Даты:</span> ${formatDateRange(data.started, data.released)}</p>
			<p><span class="font-semibold">Следующая серия через:</span> <span id="next-episode-timer"></span></p>
		`;
		startCountdown(data.next_episode_at);
	} else {
		metaContainer.innerHTML += `
			<p><span class="font-semibold">Кол-во серий:</span> ${data.total_episodes}</p>
			<p><span class="font-semibold">Даты:</span> ${formatDateRange(data.started, data.released)}</p>
		`;
	}
	const rate_res = await fetch(`/api/v1/user/get_rate/${release_id}`);
	if (!rate_res.ok) {
        if (rate_res.status === 401) {
            window.location.href = '/reauth';
            return;
        }
        ep_id = 0;
            metaContainer.innerHTML += `
                <button onclick="openModal()" class="relative flex text-sm items-center justify-center gap-1 px-3 py-2 rounded-xl bg-zinc-800 text-white font-medium shadow-md hover:bg-zinc-700 active:bg-zinc-600 transition duration-200 select-none overflow-hidden">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3v18l15-9L5 3z" /></svg>
                    Смотреть
                </button>
            `
        await loadTranslationsModal();
        throw new Error('Ошибка запроса rate');
        return;
    }
    if (rate_res.status === 204) {
            ep_id = 0;
            metaContainer.innerHTML += `
                <button onclick="openModal()" class="relative flex text-sm items-center justify-center gap-1 px-3 py-2 rounded-xl bg-zinc-800 text-white font-medium shadow-md hover:bg-zinc-700 active:bg-zinc-600 transition duration-200 select-none overflow-hidden">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3v18l15-9L5 3z" /></svg>
                    Смотреть
                </button>
            `
            await loadTranslationsModal();
            return;
        }
	const rate = await rate_res.json();
	if (rate.episodes > 0 && rate.status !== "completed") {
	    ep_id = rate.episodes + 1;
        metaContainer.innerHTML += `
            <button onclick="openModal()" class="relative flex text-sm items-center justify-center gap-1 px-3 py-2 rounded-xl bg-zinc-800 text-white font-medium shadow-md hover:bg-zinc-700 active:bg-zinc-600 transition duration-200 select-none overflow-hidden">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3v18l15-9L5 3z" /></svg>
                Продолжить
                <span class="absolute bottom-0 left-0 h-[2px] bg-white transition-all duration-300" style="width: calc(${rate.episodes} / ${data.total_episodes} * 100%)"></span>
            </button>
        `
	} else {
	    ep_id = 0;
	    metaContainer.innerHTML += `
            <button onclick="openModal()" class="relative flex text-sm items-center justify-center gap-1 px-3 py-2 rounded-xl bg-zinc-800 text-white font-medium shadow-md hover:bg-zinc-700 active:bg-zinc-600 transition duration-200 select-none overflow-hidden">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3v18l15-9L5 3z" /></svg>
                Смотреть
            </button>
        `
	}
	await loadTranslationsModal();
}

async function loadRelated() {
	const res = await fetch(`/api/v1/title/${release_id}/related`);
	if (!res.ok) {
		if (res.status === 401) {
			window.location.href = '/reauth';
			return;
		}
		throw new Error('Ошибка запроса related');
	}

	const data = await res.json();
	const container = document.getElementById("related-container");

	const title = document.getElementById("related-titles");
	if (data.length > 0 && title.classList.contains("hidden")) {
		title.classList.remove("hidden");
	}

	container.innerHTML = "";

	data.sort((a, b) => {
		if (a.anime && b.manga) return -1;
		if (a.manga && b.anime) return 1;
		return 0;
	});

    const kindMap = {
        "light_novel": "Ранобэ",
        "novel": "Новелла",
        "manga": "Манга",
        "manhwa": "Манхва",
        "manhua": "Маньхуа",
        "one_shot": "Ваншот",
        "doujin": "Додзинси",
        "tv": "TV Сериал",
        "movie": "Фильм",
        "ona": "ONA",
        "ova": "OVA",
        "tv_special": "Спецвыпуск",
        "special": "Спецвыпуск",
        "music": "Клип",
        "pv": "Проморолик",
        "cm": "Реклама"
    };

	for (const item of data) {
        const content = item.anime || item.manga;
        const kindHuman = kindMap[content.kind] || content.kind;

        let url;
        if (item.anime) {
            url = `/release/${content.id}`;
        } else if (item.manga) {
            url = 'https://${SHIKI_DOMAIN}' + `${content.url}`;
        }

        const block = document.createElement("div");
        block.className = "bg-zinc-900 p-3 rounded shadow flex items-start gap-4 w-full max-w-md cursor-pointer";

        block.innerHTML = `
            <img src="${content.image ? 'https://' + SHIKI_DOMAIN + content.image.preview : '/resources/no_poster.jpg'}"
                alt="Постер" class="w-20 h-auto rounded object-cover" />
            <div class="flex-1">
                <h3 class="font-semibold text-sm leading-snug">
                    ${content.russian}
                </h3>
                <p class="text-sm text-gray-400">${kindHuman}<br>${formatDate(content.aired_on)}</p>
            </div>
        `

        block.addEventListener("click", () => {
            window.location.href = url
        })

        container.appendChild(block);
    }

}
