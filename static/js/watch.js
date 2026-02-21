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
const rateCookieName = 'videoPlaybackRate'

let currentEpisode = 1;
let playersData = {};
let currentPlayer = null;
let currentQuality = null;
let hls = null;
let errorCount = 0;

devBtn.onclick = () => {
  settingsModal.classList.add('hidden');
  devModal.classList.remove('hidden');

  // Очистить предыдущие элементы
  const existingTsDiv = document.getElementById('tsButtons');
  if (existingTsDiv) existingTsDiv.remove();

  // Добавить кнопки для скачивания каждого качества как TS
  const modalInput = document.getElementById('modal-input');
  if (!modalInput || !modalInput.value) return;

  try {
    const data = JSON.parse(modalInput.value);
    const tsDiv = document.createElement('div');
    tsDiv.id = 'tsButtons';
    tsDiv.className = 'mt-4';

    Object.entries(data).forEach(([player, qualities]) => {
      Object.entries(qualities).forEach(([quality, url]) => {
        if (typeof url === 'string' && url.includes('.m3u8')) {
          const btn = document.createElement('button');
          btn.textContent = `Скачать ${player}/${quality}p`;
          btn.className = 'mr-2 mb-1 px-3 py-1 bg-zinc-700 rounded hover:bg-zinc-600';
          btn.onclick = () => downloadQualityAsTs(url, quality);
          tsDiv.appendChild(btn);
        }
      });
    });

    const modalContainer = document.getElementById('modal-input').parentNode;
    modalContainer.appendChild(tsDiv);
  } catch (e) {
    console.error('Ошибка парсинга JSON:', e);
  }
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

async function downloadQualityAsTs(url, quality) {
  if (!url || !url.includes('.m3u8')) {
    alert('Неверный URL');
    return;
  }

  try {
    const response = await fetch(url);
    const m3u8Text = await response.text();
    const lines = m3u8Text.split('\n');

    // Найти базовый URL
    const baseUrl = url.replace(':hls:manifest.m3u8', ':hls:');
    let sequence = 0;
    let segments = [];
    lines.forEach(line => {
      if (line.startsWith('#EXT-X-MEDIA-SEQUENCE:')) {
        sequence = parseInt(line.split(':')[1]);
      } else if (line.startsWith('#EXTINF:') && segments.length === 0) {
        // После #EXTINF идёт URL сегмента, но поскольку Kodik, генерируем
      }
    });
    // Предполагаем сегменты seg-{sequence + i}-v1-a1.ts, нужно знать count
    // Для простоты, парсим #EXTINF для count
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('#EXTINF:')) count++;
    }
    if (count === 0) {
      alert('Не удалось определить количество сегментов');
      return;
    }

    const tsUrls = [];
    for (let i = 0; i < count; i++) {
      tsUrls.push(`${baseUrl}seg-${sequence + i}-v1-a1.ts`);
    }

    // Добавить прогресс-бар
    const progressContainer = document.createElement('div');
    progressContainer.id = 'downloadProgress';
    progressContainer.className = 'mt-4';
    const progressBar = document.createElement('div');
    progressBar.className = 'w-full bg-gray-600 rounded h-2 relative';
    const progressFill = document.createElement('div');
    progressFill.className = 'bg-white rounded h-full transition-all duration-300';
    progressFill.style.width = '0%';
    progressBar.appendChild(progressFill);
    progressContainer.appendChild(progressBar);
    const modalContainer = document.getElementById('modal-input').parentNode;
    modalContainer.appendChild(progressContainer);

    // Скачать TS батчами (до 1000 сегментов за раз).
    // Сервер может не отдать один сегмент, поэтому не валим всю загрузку.
    const MAX_SEGMENTS_PER_BATCH = 1000;
    const buffers = [];
    const failedSegments = [];
    let processed = 0;

    for (let batchStart = 0; batchStart < tsUrls.length; batchStart += MAX_SEGMENTS_PER_BATCH) {
      const batch = tsUrls.slice(batchStart, batchStart + MAX_SEGMENTS_PER_BATCH);
      const batchPromises = batch.map(async tsUrl => {
        try {
          const res = await fetch(tsUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('video')) {
            const text = await res.text();
            throw new Error(`Не видео: ${text.substring(0, 100)}`);
          }

          return await res.arrayBuffer();
        } finally {
          processed++;
          progressFill.style.width = `${(processed / count) * 100}%`;
        }
      });
      const results = await Promise.allSettled(batchPromises);

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          buffers.push(result.value);
        } else {
          failedSegments.push({
            url: batch[index],
            error: result.reason?.message || String(result.reason)
          });
        }
      });
    }

    if (buffers.length === 0) {
      throw new Error('Не удалось скачать ни одного сегмента');
    }

    // Удалить прогресс-бар
    progressContainer.remove();

    // Объединить в один blob
    const combined = new Blob(buffers, { type: 'video/MP2T' });

    // Скачать
    const a = document.createElement('a');
    a.href = URL.createObjectURL(combined);
    a.download = `${document.title} ${currentEpisode} серия.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);

    if (failedSegments.length > 0) {
      alert(`Скачивание завершено с пропущенными сегментами: ${failedSegments.length}`);
      console.warn('Пропущенные сегменты:', failedSegments);
    }
  } catch (e) {
    alert('Ошибка скачивания: ' + e.message);
  }
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

function insertVideoPlayer(m3u8url, startTime=0, startRate=1) {
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

  const savedRate = getCookie(rateCookieName)
  if (savedRate !== undefined) {
    video.playbackRate = parseFloat(savedRate)
  }
  video.addEventListener('ratechange', () => {
    setCookie(rateCookieName, video.playbackRate)
  })
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = m3u8url;
    video.currentTime = startTime;
    video.playbackRate = startRate;
    video.play().catch(() => {});
  } else if (window.Hls) {
    hls = new Hls();
    hls.loadSource(m3u8url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.playbackRate = startRate;
      if (startTime <= 0) {
      video.play().catch(() => {});
      video.currentTime = startTime;
      } else {
      video.currentTime = startTime;
      video.pause().catch(() => {});};
    });
    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR || data.details === Hls.ErrorDetails.MEDIA_ERROR) {
        errorCount++;
        if (errorCount >= 3) {
          reloadPlayerBtn.click();
          errorCount = 0;
        }
      }
    });
    hls.on(Hls.Events.FRAG_LOADED, () => {
      errorCount = 0;
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

function setPlayerQuality(player, quality, startTime=0, startRate=1) {
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
    insertVideoPlayer(url, startTime, startRate);
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
          let currentRate = 1;
          if (video && video.tagName.toLowerCase() === 'video') {
            currentTime = video.currentTime || 0;
            currentRate = video.playbackRate || 1;
          }
          setPlayerQuality(playerName, quality, currentTime, currentRate);
          buildSettingsList();
        };
        playerDiv.appendChild(btn);
      });

    playersList.appendChild(playerDiv);
  });
}


async function fetchPlayerData() {

    try {
		const resp = await fetch(`/api/v2/title/${release_id}/eps`);
		if (resp.ok) {
			const max_episodes = await resp.json();

            let total = null;

            if (typeof max_episodes?.eps === 'number') {
                total = max_episodes.eps;
            } else if (max_episodes?.eps === 'movie') {
                total = 1;
            }
			if (total !== null && (currentEpisode) > total) {
				window.location.href = `/release/${release_id}`;
			}
		}
	} catch (e) {
		console.error('Не удалось получить информацию о количестве серий', e);
	}

	const url = `/api/v2/title/${release_id}/watch?transl=${translation_id}&ep=${currentEpisode}`;
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
		const resp = await fetch(`/api/v2/title/${release_id}/eps`);
		if (resp.ok) {
			const max_episodes = await resp.json();
			const total = max_episodes && typeof max_episodes.eps === 'number' ? max_episodes.eps : null;
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
  let currentRate = 1;
  if (video && video.tagName.toLowerCase() === 'video') {
    currentTime = video.currentTime || 0;
    currentRate = video.playbackRate || 1;
  }
  setPlayerQuality(currentPlayer, currentQuality, currentTime, currentRate);
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
