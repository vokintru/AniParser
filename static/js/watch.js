document.addEventListener("DOMContentLoaded", async () => {
	await loadTitle();
});

async function loadTitle() {
	const res = await fetch(`/api/v1/title/${release_id}/info`);
	if (!res.ok) {
		if (res.status === 401) {
			window.location.href = '/reauth';
			return;
		}
		throw new Error('Ошибка запроса info');
	}

	const data = await res.json();
	document.title = data.name;
}

const episodeNumberElem = document.getElementById('episodeNumber');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const skipBtn = document.getElementById('skipBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const devBtn = document.getElementById('devBtn');
const devModal = document.getElementById('devModal');
const playersList = document.getElementById('playersList');
const closeSettings = document.getElementById('closeSettings');
const reloadPlayerBtn = document.getElementById('reloadPlayerBtn');
const playerContainer = document.getElementById('playerContainer');
const cookieName = 'videoVolume'

let currentEpisode = 1;
let playersData = {};
let currentPlayer = null;
let currentQuality = null;
let hls = null;

devBtn.onclick = () => {
  settingsModal.classList.add('hidden');
  devModal.classList.remove('hidden');
};

function getCookie(name) {
    const matches = document.cookie.match(new RegExp(
        '(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'
    ))
    return matches ? decodeURIComponent(matches[1]) : undefined
}

function setCookie(name, value, days = 365) {
    const d = new Date()
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000)
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/`
}

function closeDevModal() {
  devModal.classList.add('hidden');
}

function readEpisodeFromHash() {
  const hash = window.location.hash;
  if (hash.startsWith('#ep=')) {
    const epNum = parseInt(hash.replace('#ep=', ''), 10);
    if (!isNaN(epNum) && epNum > 0) return epNum;
  }
  return 1;
}

function updateHash() {
  window.location.hash = `ep=${currentEpisode}`;
  episodeNumberElem.value = currentEpisode;
  const input = document.getElementById('episodeNumber');
  input.style.width = `${input.value.length || 1}ch`;
}

function clearPlayer() {
  if (hls) {
    hls.destroy();
    hls = null;
  }
  playerContainer.innerHTML = '';
}

function insertVideoPlayer(m3u8url, startTime=0) {
  clearPlayer();
  const video = document.createElement('video');
  video.id = 'videoPlayer';
  video.className = 'w-full h-full';
  video.controls = true;
  playerContainer.appendChild(video);

  const savedVolume = getCookie(cookieName)
  if (savedVolume !== undefined) {
    video.volume = parseFloat(savedVolume)
  }
  video.addEventListener('volumechange', () => {
    setCookie(cookieName, video.volume)
  })
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = m3u8url;
    video.currentTime = startTime;
    video.play().catch(() => {});
  } else if (window.Hls) {
    hls = new Hls();
    hls.loadSource(m3u8url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      if (startTime <= 0) {
      video.play().catch(() => {});
      video.currentTime = startTime;
      } else {
      video.currentTime = startTime;
      video.pause().catch(() => {});};
    });
  } else {
    alert('Ваш браузер не поддерживает воспроизведение HLS потоков');
  }
}

function insertIframe(src) {
  clearPlayer();
  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.width = '100%';
  iframe.height = '100%';
  iframe.allowFullscreen = true;
  iframe.frameBorder = '0';
  playerContainer.appendChild(iframe);
}

function setPlayerQuality(player, quality, startTime=0) {
  currentPlayer = player;
  currentQuality = quality;
  let url = playersData[player][quality];
  if (typeof url !== 'string') {
    alert('Ошибка: ссылка не строка');
    return;
  }

  if (url.startsWith('!iframe ')) {
    const iframeUrl = url.slice('!iframe '.length).trim();
    insertIframe(iframeUrl);
  } else {
    insertVideoPlayer(url, startTime);
  }
}

function buildSettingsList() {
  playersList.innerHTML = '';
  Object.entries(playersData).forEach(([playerName, qualities]) => {
    const playerDiv = document.createElement('div');
    playerDiv.classList.add('mb-3');

    const playerTitle = document.createElement('div');
    playerTitle.textContent = playerName;
    playerTitle.classList.add('font-semibold', 'mb-1');
    playerDiv.appendChild(playerTitle);

    Object.keys(qualities)
      .sort((a, b) => parseInt(b) - parseInt(a))
      .forEach(quality => {
        const btn = document.createElement('button');
        btn.textContent = quality;
        btn.className = 'mr-2 mb-1 px-3 py-1 bg-zinc-700 rounded hover:bg-zinc-600';
        if (playerName === currentPlayer && quality === currentQuality) {
          btn.classList.add('bg-zinc-500');
        }
        btn.onclick = () => {
          const video = document.getElementById('videoPlayer');
          let currentTime = 0;
          if (video && video.tagName.toLowerCase() === 'video') {
            currentTime = video.currentTime || 0;
          }
          setPlayerQuality(playerName, quality, currentTime);
          buildSettingsList();
        };
        playerDiv.appendChild(btn);
      });

    playersList.appendChild(playerDiv);
  });
}


async function fetchPlayerData() {
	const url = `/api/v1/title/${release_id}/watch?transl=${translation_id}&ep=${currentEpisode}`;
	try {
		const res = await fetch(url);
		if (!res.ok) {
            if (res.status === 401) {
                window.location.href = '/reauth';
                return;
            }
            throw new Error('Ошибка запроса watch');
        }
		const data = await res.json();

        const modalInput = document.getElementById('modal-input');
		if (modalInput) {
			modalInput.value = JSON.stringify(data, null, 2);
		}

		for (const player in data) {
			for (const quality in data[player]) {
				const value = data[player][quality];
				if (typeof value === 'string' && value.trim().startsWith('!onlyapp')) {
					delete data[player][quality];
				}
			}
			if (Object.keys(data[player]).length === 0) {
				delete data[player];
			}
		}

		playersData = data;


		const firstPlayer = Object.keys(data)[0];
		if (!firstPlayer) throw new Error('Нет доступных плееров после фильтрации');

		const firstQuality = Object.keys(data[firstPlayer])
			.sort((a, b) => parseInt(b) - parseInt(a))[0];

		buildSettingsList();
		setPlayerQuality(firstPlayer, firstQuality);
	} catch (e) {
		alert('Не удалось загрузить поток: ' + e.message);
	}
}


settingsBtn.onclick = () => {
  settingsModal.classList.remove('hidden');
};

closeSettings.onclick = () => {
  settingsModal.classList.add('hidden');
};

prevBtn.onclick = () => {
  if (currentEpisode > 1) {
    currentEpisode--;
    updateHash();
    fetchPlayerData();
  }
};

nextBtn.onclick = async () => {
	const watched_ep = currentEpisode;

	currentEpisode++;
	updateHash();
	fetchPlayerData();

	try {
		const resp = await fetch(`/api/v1/title/${release_id}/translations`);
		if (resp.ok) {
			const info = await resp.json();
			const total = info && typeof info.series_count === 'number' ? info.series_count : null;
			if (total !== null && (currentEpisode) > total) {
				fetch("/api/v1/user/mark_watched", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						release_id: release_id,
						episode: watched_ep,
					}),
				})
				.then(async res => {
					if (res.status === 401) throw new Error("redirect");
                    const data = await res.json();
					if (data.status === "error" && data.message === "reauth") throw new Error("redirect");
                    window.location.href = `/release/${release_id}`;
				})
				.catch(err => {
					if (err.message === "redirect") {
						window.location.href = '/reauth';
						return;
					}
					console.error("Ошибка при отправке mark_watched:", err);
				});
				return;
			}
		}
	} catch (e) {
		console.error('Не удалось получить информацию о количестве серий', e);
	}

	fetch("/api/v1/user/mark_watched", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			release_id: release_id,
			episode: watched_ep,
		}),
	})
	.then(async res => {
		if (res.status === 401) throw new Error("redirect");
		const data = await res.json();
		if (data.status === "error" && data.message === "reauth") throw new Error("redirect");
		console.log("Mark watched:", data);
	})
	.catch(err => {
		if (err.message === "redirect") {
			window.location.href = '/reauth';
			return;
		}
		console.error("Ошибка при отправке mark_watched:", err);
	});
};

skipBtn.onclick = () => {
  const video = document.getElementById('videoPlayer');
  if (video) {
    video.currentTime += 85;
  }
};

reloadPlayerBtn.onclick = () => {
  if (!currentPlayer || !currentQuality) return;
  const video = document.getElementById('videoPlayer');
  let currentTime = 0;
  if (video && video.tagName.toLowerCase() === 'video') {
    currentTime = video.currentTime || 0;
  }
  setPlayerQuality(currentPlayer, currentQuality, currentTime);
};

episodeNumberElem.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const id = episodeNumberElem.value.trim();
    if (/^\d+$/.test(id)) {
        const inputValue = parseInt(episodeNumberElem.value.replace(/\D/g, ''), 10) || 0;
        if (!isNaN(inputValue) && inputValue > 0 && inputValue !== currentEpisode) {
          currentEpisode = inputValue;
          updateHash();
          fetchPlayerData();
        } else if (inputValue !== currentEpisode) {
          episodeNumberElem.value = currentEpisode;
        }
    } else {
        alert('Номер должен содержать только цифры');
    }
  }
});

episodeNumberElem.addEventListener('blur', () => {
  episodeNumberElem.value = currentEpisode;
});

const input = document.getElementById('episodeNumber');
input.addEventListener('input', () => {
    input.style.width = `${input.value.length || 1}ch`;
});

function init() {
  currentEpisode = readEpisodeFromHash();
  updateHash();
  fetchPlayerData();
}

window.onhashchange = () => {
  const ep = readEpisodeFromHash();
  if (ep !== currentEpisode) {
    currentEpisode = ep;
    episodeNumberElem.value = currentEpisode;
    fetchPlayerData();
  }
};

init();