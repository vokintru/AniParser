async function openModal() {
    const modal = document.getElementById("direct_path_modal");
    modal.classList.remove("hidden");

    const closeBtn = document.getElementById("close_direct_modal");
    if (closeBtn && modal) {
        closeBtn.addEventListener("click", () => {
            modal.classList.add("hidden");
            history.pushState({}, "", `/release/${release_id}`);
        });
    }
}

async function loadTranslationsModal() {
	const res = await fetch(`/api/v2/title/${release_id}/translations`);
	if (!res.ok) {
		if (res.status === 401) {
			window.location.href = '/reauth';
			return;
		}
		throw new Error('Ошибка запроса translations');
	}
	const max_eps_resp = await fetch(`/api/v2/title/${release_id}/eps`);
	const max_eps = await max_eps_resp.json();

	const directModal = document.getElementById("direct_path_modal");
	const container = document.getElementById("translations-container_modal");
	const noTranslations = document.getElementById("no-translations_modal");
	const loadTranslations = document.getElementById("load-translations_modal");

	if (res.status === 204) {
		container.textContent = "Переводы не найдены";
		loadTranslations.classList.add("hidden");
		return;
	}

	const data = await res.json();
	if (!(data.length > 0)) {
	    noTranslations.classList.remove("hidden");
	}
    loadTranslations.classList.add("hidden");
	for (const t of data) {
		const btn = document.createElement("button");
		btn.className = "relative flex text-sm items-center justify-center gap-1 px-3 py-2 rounded-xl bg-zinc-800 text-white font-medium shadow-md hover:bg-zinc-700 active:bg-zinc-600 transition duration-200 select-none overflow-hidden";
		btn.innerHTML = `
            <span>${t.name}</span>
            ${
                typeof max_eps.eps === 'number'
                    ? `<span class="text-[10px] select-none text-zinc-400">(<span style="color: ${t.eps > max_eps.eps ? 'rgba(80, 150, 255, 0.8)' : t.eps === max_eps.eps ? 'rgba(55, 184, 102, 0.8)' : 'rgba(255, 100, 100, 0.8)'}">${t.eps}</span>)</span>`
                    : ''
            }
        `;

		btn.addEventListener("click", () => {
			directModal.classList.add("hidden");
			window.location.href = `/watch/${release_id}/${t.translation_id}#ep=${ep_id}`;
		});

		container.appendChild(btn);
	}
}