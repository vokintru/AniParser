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
	const res = await fetch(`/api/v1/title/${release_id}/translations`);
	if (!res.ok) {
		if (res.status === 401) {
			window.location.href = '/reauth';
			return;
		}
		throw new Error('Ошибка запроса translations');
	}

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
	if (!(data.translations.length > 0)) {
	    noTranslations.classList.remove("hidden");
	}
    loadTranslations.classList.add("hidden");
	for (const t of data.translations) {
        const btn = document.createElement("a");
        btn.href = `/watch/${release_id}/${t.id}#ep=${ep_id}`;
        btn.textContent = t.name;
        btn.className = "bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded shadow";

        btn.addEventListener("click", (e) => {
            e.preventDefault();
            directModal.classList.add("hidden");
            window.location.href = btn.href;
        });

        container.appendChild(btn);
    }
}