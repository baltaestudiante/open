// ===============================
// homeshow.js - Lógica completa del feed, detalle y páginas
// Dependencias: episodios.js (window.processEpisodes)
// Expone un objeto global window.StreamHub con todas las funciones necesarias
// ===============================

(function() {
    // ---------- Configuración ----------
    const ICONS = {
        play: 'https://marca1.odoo.com/web/image/508-f876320c/play.svg',
        add: 'https://marca1.odoo.com/web/image/509-c555b4ef/a%C3%B1adir%20a.svg',
        added: 'https://nikichitonjesus.odoo.com/web/image/1112-d141b3eb/a%C3%B1adido.png',
        dl: 'https://marca1.odoo.com/web/image/510-7a9035c1/descargar.svg',
        noDl: 'https://nikichitonjesus.odoo.com/web/image/1051-622a3db3/no-desc.webp'
    };

    const CATEGORIES = [
        "Todos",
        "Derecho",
        "Física y Astronomía",
        "Matemáticas",
        "Historia",
        "Filosofía",
        "Economía y Finanzas",
        "Ciencias Sociales",
        "Arte y Cultura",
        "Literatura y Audiolibros",
        "Cine y TV",
        "Documentales",
        "Ciencias Naturales",
        "Tecnología e Informática",
        "Otras Ciencias"
    ];

    // Datos (se llenan desde episodios.js)
    let DATA = [];

    // Playlist
    const playlistKey = 'streamhub_userPlaylist';
    let userPlaylist = JSON.parse(localStorage.getItem(playlistKey)) || [];

    // Variables de búsqueda y scroll
    let lastScrollTop = 0;
    let searchTimeout = null;

    // ---------- Funciones de utilidad ----------
    function isInPlaylist(mediaUrl) {
        return userPlaylist.some(item => item.mediaUrl === mediaUrl);
    }

    function addToUserPlaylist(episodeData) {
        if (!episodeData || !episodeData.mediaUrl) return false;
        const exists = userPlaylist.some(item => item.mediaUrl === episodeData.mediaUrl);
        if (!exists) {
            const playlistItem = {
                mediaUrl: episodeData.mediaUrl,
                mediaType: episodeData.type || episodeData.mediaType || 'audio',
                coverUrlContainer: episodeData.cover || episodeData.coverUrlContainer || episodeData.coverUrl,
                coverUrlInfo: episodeData.cover || episodeData.coverUrlInfo || episodeData.coverUrl,
                title: episodeData.title,
                detailUrl: episodeData.detailUrl || '#',
                author: episodeData.author || 'Desconocido',
                next: [],
                text: episodeData.description || '',
                allowDownload: episodeData.allowDownload !== undefined ? episodeData.allowDownload : true
            };
            userPlaylist.push(playlistItem);
            localStorage.setItem(playlistKey, JSON.stringify(userPlaylist));
            updateAddButtons(episodeData.id || episodeData.mediaUrl);
            return true;
        }
        return false;
    }

    function updateAddButtons(identifier) {
        const buttons = document.querySelectorAll(`[data-episode-id="${identifier}"], [data-media-url="${identifier}"]`);
        buttons.forEach(btn => {
            if (btn.dataset.added !== 'true') {
                if (btn.tagName === 'IMG') btn.src = ICONS.added;
                btn.dataset.added = 'true';
                btn.title = 'Añadido a tu lista';
            }
        });
    }

    // ---------- Modal de error ----------
    function showErrorModal(title, message) {
        const modal = document.getElementById('errorModal');
        if (!modal) return;
        document.getElementById('errorModalTitle').innerText = title;
        document.getElementById('errorModalMessage').innerText = message;
        modal.classList.remove('hidden');
    }

    // ---------- Handlers de reproducción y descarga (con fallback) ----------
    function playEpisode(ep, list = []) {
        try {
            if (typeof window.playEpisodeExpanded === 'function') {
                window.playEpisodeExpanded(
                    ep.mediaUrl,
                    ep.type || 'audio',
                    ep.cover,
                    ep.cover,
                    ep.title,
                    ep.detailUrl || '#',
                    ep.author || 'Desconocido',
                    list,
                    ep.description || '',
                    ep.allowDownload !== undefined ? ep.allowDownload : true
                );
            } else {
                // Fallback: mostrar modal de error
                showErrorModal(
                    `Reproductor no disponible`,
                    `No se pudo iniciar la reproducción de "${ep.title}". Intenta recargar la página.`
                );
            }
        } catch (e) {
            console.error('Error al reproducir:', e);
            showErrorModal(
                `Error al reproducir`,
                `Ocurrió un problema al intentar reproducir "${ep.title}".`
            );
        }
    }

    function handlePlay(e, id) {
        e.stopPropagation();
        e.preventDefault();
        const ep = DATA.find(x => x.id == id);
        if (ep) {
            playEpisode(ep);
        } else {
            showErrorModal('Episodio no encontrado', 'No se pudo encontrar el episodio solicitado.');
        }
        return false;
    }

    function handleAdd(e, id) {
        e.stopPropagation();
        e.preventDefault();
        const ep = DATA.find(x => x.id == id);
        if (!ep) return false;
        const button = e.target.closest('img') || e.target;
        const agregado = addToUserPlaylist({
            mediaUrl: ep.mediaUrl,
            type: ep.type,
            cover: ep.cover,
            title: ep.title,
            detailUrl: ep.detailUrl,
            author: ep.author,
            description: ep.description,
            allowDownload: ep.allowDownload,
            id: ep.id
        });
        if (agregado) {
            if (button.tagName === 'IMG') button.src = ICONS.added;
            button.dataset.added = 'true';
            if (button.parentElement) button.parentElement.title = 'Añadido a tu lista';
            button.style.transform = 'scale(1.2)';
            setTimeout(() => button.style.transform = 'scale(1)', 200);
        }
        return false;
    }

    function handleDl(e, id) {
        e.stopPropagation();
        e.preventDefault();
        const ep = DATA.find(x => x.id == id);
        if (!ep) return false;
        if (!ep.allowDownload) {
            showErrorModal(
                `Descarga no disponible`,
                `"${ep.title}" no puede descargarse. ¿Quieres solicitarlo a nuestro equipo?`
            );
            return false;
        }
        try {
            const ext = ep.type === 'video' ? 'mp4' : 'mp3';
            const filename = `${ep.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}.${ext}`;
            const a = document.createElement('a');
            a.href = ep.mediaUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error en descarga:', error);
            showErrorModal(
                `Error al descargar`,
                `No se pudo descargar "${ep.title}". Puedes intentar abrirlo en el navegador.`
            );
            window.open(ep.mediaUrl, '_blank');
        }
        return false;
    }

    // ---------- Funciones de búsqueda (desktop y móvil) ----------
    function showDesktopSearchResults() {
        document.getElementById('desktopSearchResults')?.classList.add('active');
    }

    function hideDesktopSearchResults() {
        setTimeout(() => {
            document.getElementById('desktopSearchResults')?.classList.remove('active');
        }, 200);
    }

    function performQuickSearch(query) {
        const term = query.toLowerCase().trim();
        return DATA.filter(ep =>
            ep.title.toLowerCase().includes(term) ||
            ep.author.toLowerCase().includes(term) ||
            ep.categories.some(c => c.toLowerCase().includes(term)) ||
            ep.description.toLowerCase().includes(term)
        ).slice(0, 5);
    }

    function renderDesktopSearchResults(results, query) {
        const container = document.getElementById('desktopSearchResultsContent');
        if (!container) return;
        if (results.length === 0) {
            container.innerHTML = `<div class="text-center py-4 text-gray-400"><p>No encontramos resultados para "${query}"</p></div>`;
            return;
        }
        container.innerHTML = results.map(ep => `
            <div class="search-result-item" onclick="StreamHub.goToDetail('${ep.detailUrl}'); event.stopPropagation();">
                <div class="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                    <img src="${ep.cover}" class="w-full h-full object-cover">
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-sm text-white truncate">${ep.title}</h4>
                    <p class="text-xs text-gray-400 truncate">${ep.author} • ${ep.type === 'video' ? 'Video' : 'Audio'}</p>
                </div>
            </div>
        `).join('');
        container.innerHTML += `
            <div class="search-result-item mt-2 border-t border-white/10 pt-2" onclick="StreamHub.navigate('/buscar?q='+encodeURIComponent('${query}'))">
                <div class="flex items-center justify-center w-full">
                    <span class="text-blue-400 font-bold text-sm">Ver todos los resultados para "${query}"</span>
                </div>
            </div>
        `;
    }

    function handleDesktopSearchInput(query) {
        clearTimeout(searchTimeout);
        if (!query || query.trim() === '') {
            clearDesktopSearchResults();
            return;
        }
        searchTimeout = setTimeout(() => {
            const results = performQuickSearch(query);
            renderDesktopSearchResults(results, query);
        }, 300);
    }

    function handleDesktopSearchEnter(event) {
        event.preventDefault();
        const query = document.getElementById('desktopSearch')?.value.trim();
        if (query) {
            navigate('/buscar?q=' + encodeURIComponent(query));
            hideDesktopSearchResults();
        }
    }

    function clearDesktopSearchResults() {
        const container = document.getElementById('desktopSearchResultsContent');
        if (container) container.innerHTML = '';
        document.getElementById('desktopSearchResults')?.classList.remove('active');
    }

    // Móvil
    function toggleMobileSearch() {
        const el = document.getElementById('mobileSearchBar');
        const overlay = document.getElementById('searchOverlay');
        if (!el || !overlay) return;
        if (el.classList.contains('open')) {
            el.classList.remove('open');
            overlay.classList.remove('active');
            document.getElementById('mobileSearchInput').value = '';
            clearMobileSearchResults();
        } else {
            el.classList.add('open');
            overlay.classList.add('active');
            document.getElementById('mobileSearchInput')?.focus();
        }
    }

    function handleMobileSearchInput(query) {
        clearTimeout(searchTimeout);
        if (!query || query.trim() === '') {
            clearMobileSearchResults();
            return;
        }
        searchTimeout = setTimeout(() => {
            const results = performQuickSearch(query);
            renderMobileSearchResults(results, query);
        }, 300);
    }

    function handleMobileSearchEnter(event) {
        event.preventDefault();
        const query = document.getElementById('mobileSearchInput')?.value.trim();
        if (query) handleMobileSearch(query);
    }

    function handleMobileSearchButton() {
        const query = document.getElementById('mobileSearchInput')?.value.trim();
        if (query) handleMobileSearch(query);
    }

    function renderMobileSearchResults(results, query) {
        const container = document.getElementById('mobileSearchResults');
        if (!container) return;
        if (results.length === 0) {
            container.innerHTML = `<div class="text-center py-4 text-gray-400"><p>No encontramos resultados para "${query}"</p></div>`;
            return;
        }
        container.innerHTML = results.map(ep => `
            <div class="search-result-item" onclick="StreamHub.goToDetail('${ep.detailUrl}'); closeSearch();">
                <div class="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                    <img src="${ep.cover}" class="w-full h-full object-cover">
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-sm text-white truncate">${ep.title}</h4>
                    <p class="text-xs text-gray-400 truncate">${ep.author} • ${ep.type === 'video' ? 'Video' : 'Audio'}</p>
                </div>
            </div>
        `).join('');
        container.innerHTML += `
            <div class="search-result-item mt-2 border-t border-white/10 pt-2" onclick="handleMobileSearch('${query}')">
                <div class="flex items-center justify-center w-full">
                    <span class="text-blue-400 font-bold text-sm">Ver todos los resultados para "${query}"</span>
                </div>
            </div>
        `;
    }

    function clearMobileSearchResults() {
        const container = document.getElementById('mobileSearchResults');
        if (container) container.innerHTML = '';
    }

    function handleMobileSearch(query) {
        const input = document.getElementById('mobileSearchInput');
        const searchQuery = query || input.value.trim();
        if (searchQuery) {
            navigate('/buscar?q=' + encodeURIComponent(searchQuery));
            closeSearch();
        }
    }

    function closeSearch() {
        const mobileBar = document.getElementById('mobileSearchBar');
        const overlay = document.getElementById('searchOverlay');
        if (mobileBar?.classList.contains('open')) {
            mobileBar.classList.remove('open');
        }
        overlay?.classList.remove('active');
        document.getElementById('desktopSearch')?.blur();
        clearDesktopSearchResults();
        clearMobileSearchResults();
    }

    // ---------- Funciones de cambio de vista ----------
    function toggleView(view) {
        const feed = document.getElementById('feed-view');
        const grid = document.getElementById('grid-view');
        const detail = document.getElementById('detail-view');
        if (view === 'grid') {
            feed.classList.add('hidden');
            grid.classList.remove('hidden');
            detail.classList.add('hidden');
            window.scrollTo(0, 0);
        } else if (view === 'feed') {
            feed.classList.remove('hidden');
            grid.classList.add('hidden');
            detail.classList.add('hidden');
            const desktopSearch = document.getElementById('desktopSearch');
            if (desktopSearch) desktopSearch.value = '';
            const mobileInput = document.getElementById('mobileSearchInput');
            if (mobileInput) mobileInput.value = '';
            renderCategoryPills('Todos');
        } else if (view === 'detail') {
            feed.classList.add('hidden');
            grid.classList.add('hidden');
            detail.classList.remove('hidden');
        }
    }

    function showFeed() {
        navigate('/');
    }

    // ---------- Renderizado de grids y cards ----------
    function createStandardCard(ep) {
        const isInPlaylistItem = isInPlaylist(ep.mediaUrl);
        const addIcon = isInPlaylistItem ? ICONS.added : ICONS.add;
        const dlIcon = ep.allowDownload ? ICONS.dl : ICONS.noDl;
        return `<div class="card-std group">
            <div class="relative w-full aspect-square rounded-xl overflow-hidden bg-zinc-800" onclick="StreamHub.goToDetail('${ep.detailUrl}')">
                <img src="${ep.cover}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                <div class="overlay-full">
                    <img src="${addIcon}" class="action-icon" onclick="StreamHub.handleAdd(event, ${ep.id}); return false;" 
                         data-episode-id="${ep.id}" data-added="${isInPlaylistItem}">
                    <img src="${ICONS.play}" class="play-icon-lg" onclick="StreamHub.handlePlay(event, ${ep.id}); return false;">
                    <img src="${dlIcon}" class="action-icon" onclick="StreamHub.handleDl(event, ${ep.id}); return false;" 
                         title="${ep.allowDownload ? 'Descargar' : 'Descarga no disponible'}">
                </div>
                <div class="mobile-play-button" onclick="StreamHub.handlePlay(event, ${ep.id}); return false;">
                    <img src="${ICONS.play}" alt="Play">
                </div>
            </div>
            <div onclick="StreamHub.goToDetail('${ep.detailUrl}')">
                <h3 class="font-bold text-white text-sm truncate">${ep.title}</h3>
                <p class="text-xs text-gray-400 mt-1 truncate">${ep.author}</p>
            </div>
        </div>`;
    }

    function createVideoExpand(ep) {
        const isInPlaylistItem = isInPlaylist(ep.mediaUrl);
        const addIcon = isInPlaylistItem ? ICONS.added : ICONS.add;
        const dlIcon = ep.allowDownload ? ICONS.dl : ICONS.noDl;
        const hasCover2 = ep.coverWide && ep.coverWide !== ep.cover;
        return `<div class="card-video group">
            <img src="${ep.cover}" class="absolute inset-0 w-full h-full object-cover z-10 group-hover:opacity-0 transition-opacity duration-300">
            ${hasCover2 ? `<img src="${ep.coverWide}" class="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300">` : ''}
            <div class="overlay-full z-20">
                <img src="${addIcon}" class="action-icon" onclick="StreamHub.handleAdd(event, ${ep.id}); return false;" 
                     data-episode-id="${ep.id}" data-added="${isInPlaylistItem}">
                <img src="${ICONS.play}" class="play-icon-lg" onclick="StreamHub.handlePlay(event, ${ep.id}); return false;">
                <img src="${dlIcon}" class="action-icon" onclick="StreamHub.handleDl(event, ${ep.id}); return false;" 
                     title="${ep.allowDownload ? 'Descargar' : 'Descarga no disponible'}">
            </div>
            <div class="mobile-play-button z-30" onclick="StreamHub.handlePlay(event, ${ep.id}); return false;">
                <img src="${ICONS.play}" alt="Play">
            </div>
            <div class="absolute bottom-2 left-2 z-20 bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold">VIDEO</div>
        </div>`;
    }

    function createListItem(ep, idx) {
        const isInPlaylistItem = isInPlaylist(ep.mediaUrl);
        const addIcon = isInPlaylistItem ? ICONS.added : ICONS.add;
        return `<div class="list-item group">
            <span class="text-gray-500 font-bold w-4 text-center text-sm flex-shrink-0">${idx + 1}</span>
            <div class="relative w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 rounded overflow-hidden" onclick="StreamHub.goToDetail('${ep.detailUrl}')">
                <img src="${ep.cover}" class="w-full h-full object-cover">
                <div class="overlay-mini" onclick="StreamHub.handlePlay(event, ${ep.id}); return false;"><img src="${ICONS.play}" class="play-icon-sm"></div>
            </div>
            <div class="item-content" onclick="StreamHub.goToDetail('${ep.detailUrl}')">
                <h4 class="font-bold text-sm truncate text-white">${ep.title}</h4>
                <p class="text-xs text-gray-500 truncate">${ep.author}</p>
            </div>
            <div class="item-actions">
                <button class="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity" onclick="StreamHub.handleAdd(event, ${ep.id}); return false;">
                    <img src="${addIcon}" alt="Agregar" class="w-5 h-5" data-episode-id="${ep.id}" data-added="${isInPlaylistItem}">
                </button>
                <div class="lg:hidden mobile-play-button" style="position: static; width: 32px; height: 32px;" onclick="StreamHub.handlePlay(event, ${ep.id}); return false;">
                    <img src="${ICONS.play}" alt="Play" class="w-4 h-4">
                </div>
            </div>
        </div>`;
    }

    function createCarousel(title, type, items, categoryContext) {
        if (!items || items.length === 0) return '';
        const id = 'c-' + Math.random().toString(36).substr(2, 9);
        let content = '';
        if (type === 'double') {
            content = `<div id="${id}" class="flex flex-col flex-wrap h-[580px] gap-x-6 gap-y-6 overflow-x-auto no-scrollbar scroll-smooth">` + items.map(ep => createStandardCard(ep)).join('') + `</div>`;
        } else if (type === 'list') {
            content = `<div id="${id}" class="flex gap-4 sm:gap-8 overflow-x-auto no-scrollbar scroll-smooth pb-4">`;
            for (let i = 0; i < items.length; i += 4) {
                content += `<div class="card-list-group min-w-[300px] sm:min-w-[340px]">` +
                    (items[i] ? createListItem(items[i], i) : '') +
                    (items[i+1] ? createListItem(items[i+1], i+1) : '') +
                    (items[i+2] ? createListItem(items[i+2], i+2) : '') +
                    (items[i+3] ? createListItem(items[i+3], i+3) : '') +
                    `</div>`;
            }
            content += `</div>`;
        } else if (type === 'expand') {
            content = `<div id="${id}" class="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth py-2 pl-1">` + items.map(ep => createVideoExpand(ep)).join('') + `</div>`;
        } else {
            content = `<div id="${id}" class="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar scroll-smooth py-2 pl-1">` + items.map(ep => createStandardCard(ep)).join('') + `</div>`;
        }
        return `<section class="carousel-wrapper relative group/section mb-8 sm:mb-12">
            <div class="flex items-end justify-between mb-3 sm:mb-5 px-1">
                <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-white hover:text-blue-500 transition-colors">${title}</h2>
                <button onclick="StreamHub.filterByCategory('${categoryContext}')" class="text-xs font-bold text-gray-500 uppercase tracking-wider hover:text-white">Ver todo</button>
            </div>
            <div class="relative">
                <div class="nav-btn left" onclick="document.getElementById('${id}').scrollLeft -= 600"><button>❮</button></div>
                ${content}
                <div class="nav-btn right" onclick="document.getElementById('${id}').scrollLeft += 600"><button>❯</button></div>
            </div>
        </section>`;
    }

    function createSeriesCarousel() {
        const id = 'c-series-' + Math.random().toString(36).substr(2, 9);
        const seriesGroups = {};
        DATA.forEach(ep => {
            if (ep.series && ep.series.titulo_serie) {
                const serieKey = ep.series.titulo_serie;
                if (!seriesGroups[serieKey]) {
                    seriesGroups[serieKey] = {episodes: [], seriesInfo: ep.series};
                }
                seriesGroups[serieKey].episodes.push(ep);
            }
        });
        const seriesKeys = Object.keys(seriesGroups);
        if (seriesKeys.length === 0) return '';
        let content = `<div id="${id}" class="flex gap-4 sm:gap-8 overflow-x-auto no-scrollbar scroll-smooth pb-4">`;
        seriesKeys.forEach(serieKey => {
            let group = seriesGroups[serieKey];
            group.episodes.sort((a, b) => new Date(b.date) - new Date(a.date));
            const s = group.seriesInfo;
            if (!s || group.episodes.length < 1) return;
            content += `<div class="card-list-group min-w-[300px] sm:min-w-[340px]">
                <div class="mb-4 cursor-pointer" onclick="StreamHub.goToDetail('${s.url_serie}')">
                    <div class="relative w-full aspect-square rounded-xl overflow-hidden bg-zinc-800">
                        <img src="${s.portada_serie}" class="w-full h-full object-cover">
                    </div>
                    <h3 class="font-bold text-white text-sm truncate mt-2">${s.titulo_serie}</h3>
                    <p class="text-xs text-gray-400">ver serie</p>
                </div>`;
            group.episodes.slice(0, 4).forEach((ep, i) => {
                content += createListItem(ep, i);
            });
            content += `</div>`;
        });
        content += `</div>`;
        return `<section class="carousel-wrapper relative group/section mb-8 sm:mb-12">
            <div class="flex items-end justify-between mb-3 sm:mb-5 px-1">
                <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-white hover:text-blue-500 transition-colors">Series y Cursos Académicos</h2>
                <button class="text-xs font-bold text-gray-500 uppercase tracking-wider hover:text-white">Ver todo</button>
            </div>
            <div class="relative">
                <div class="nav-btn left" onclick="document.getElementById('${id}').scrollLeft -= 600"><button>❮</button></div>
                ${content}
                <div class="nav-btn right" onclick="document.getElementById('${id}').scrollLeft += 600"><button>❯</button></div>
            </div>
        </section>`;
    }

    function createGridCard(item) {
        const isInPlaylistItem = isInPlaylist(item.mediaUrl);
        const addIcon = isInPlaylistItem ? ICONS.added : ICONS.add;
        const dlIcon = item.allowDownload ? ICONS.dl : ICONS.noDl;
        return `
            <div class="grid-card group">
                <div class="aspect-square bg-zinc-800 relative" onclick="StreamHub.goToDetail('${item.detailUrl}')">
                    <img src="${item.cover}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <div class="overlay-full">
                        <img src="${addIcon}" class="action-icon" onclick="StreamHub.handleAdd(event, ${item.id}); return false;" 
                             data-episode-id="${item.id}" data-added="${isInPlaylistItem}">
                        <img src="${ICONS.play}" class="play-icon-lg" onclick="StreamHub.handlePlay(event, ${item.id}); return false;">
                        <img src="${dlIcon}" class="action-icon" onclick="StreamHub.handleDl(event, ${item.id}); return false;" 
                             title="${item.allowDownload ? 'Descargar' : 'Descarga no disponible'}">
                    </div>
                    <div class="mobile-play-button" onclick="StreamHub.handlePlay(event, ${item.id}); return false;">
                        <img src="${ICONS.play}" alt="Play">
                    </div>
                </div>
                <div onclick="StreamHub.goToDetail('${item.detailUrl}')">
                    <h4 class="font-bold text-sm text-white truncate">${item.title}</h4>
                    <p class="text-xs text-gray-500 truncate">${item.author}</p>
                </div>
            </div>
        `;
    }

    function renderGrid(items, title) {
        toggleView('grid');
        const gridContainer = document.getElementById('results-grid');
        const emptyState = document.getElementById('empty-state');
        const titleEl = document.getElementById('grid-title');
        titleEl.innerText = title;
        gridContainer.innerHTML = '';
        if (items.length === 0) {
            emptyState.classList.remove('hidden');
            gridContainer.classList.add('hidden');
            const searchTerm = title.replace('Resultados para ', '').replace(/"/g, '');
            document.getElementById('empty-msg').innerText = `No hemos encontrado nada para "${searchTerm}"`;
            const suggestions = [...DATA].sort(() => 0.5 - Math.random()).slice(0, 5);
            const recGrid = document.getElementById('recommendations-grid');
            recGrid.innerHTML = '';
            suggestions.forEach(ep => recGrid.innerHTML += createGridCard(ep));
        } else {
            emptyState.classList.add('hidden');
            gridContainer.classList.remove('hidden');
            items.forEach(item => {
                gridContainer.innerHTML += createGridCard(item);
            });
        }
    }

    function performSearch(query) {
        if (!query || query.trim() === '') { 
            showFeed(); 
            return; 
        }
        const term = query.toLowerCase().trim();
        let results = DATA.filter(ep =>
            ep.title.toLowerCase().includes(term) ||
            ep.author.toLowerCase().includes(term) ||
            ep.categories.some(c => c.toLowerCase().includes(term)) ||
            ep.description.toLowerCase().includes(term)
        );
        renderGrid(results, `Resultados para "${query}"`);
        document.title = `Búsqueda: ${query} · Balta Media`;
    }

    function filterByCategory(cat) {
        renderCategoryPills(cat);
        if (cat === 'Todos') { 
            navigate('/');
            return; 
        }
        navigate('/categoria/' + encodeURIComponent(cat));
    }

    function renderCategoryPills(activeCat = 'Todos') {
        const container = document.getElementById('category-pills');
        if (!container) return;
        container.innerHTML = '';
        CATEGORIES.forEach(cat => {
            const isActive = cat === activeCat;
            const btn = document.createElement('button');
            btn.className = `whitespace-nowrap px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-bold transition-all ${isActive ? 'bg-white text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`;
            btn.innerText = cat;
            btn.onclick = () => filterByCategory(cat);
            container.appendChild(btn);
        });
    }

    // ---------- Vistas de detalle (serie / episodio) ----------
    function renderSeriesWidget(series, episodes) {
        const lastEpisode = episodes[0];
        const cover = series.portada_serie || episodes[0].cover;
        const author = episodes[0].author;
        const description = series.descripcion_serie || 'Sin descripción';
        const episodesHtml = episodes.map((ep, index) => {
            const inPlaylist = isInPlaylist(ep.mediaUrl);
            return `
            <div class="podcast-episode-card" data-episode-id="${ep.id}">
                <img class="podcast-episode-cover" src="${ep.cover}" alt="${ep.title}" loading="lazy">
                <div class="podcast-episode-info">
                    <h3 class="podcast-episode-title">${ep.title}</h3>
                    <div class="podcast-episode-author">
                        ${ep.author} <span>${ep.type === 'video' ? 'VIDEO' : 'PODCAST'}</span>
                    </div>
                    <div class="podcast-episode-description">${ep.description || ''}</div>
                    <div class="podcast-episode-actions">
                        <div class="podcast-left-episode-actions">
                            <button class="podcast-action-btn podcast-add-btn" data-mediaurl="${ep.mediaUrl}" title="Añadir a mi lista">
                                <img src="${inPlaylist ? ICONS.added : ICONS.add}" alt="añadir">
                            </button>
                            <button class="podcast-action-btn podcast-download-btn" data-mediaurl="${ep.mediaUrl}" data-allow="${ep.allowDownload}" title="${ep.allowDownload ? 'Descargar' : 'Descarga no disponible'}">
                                <img src="${ep.allowDownload ? ICONS.dl : ICONS.noDl}" alt="descargar">
                            </button>
                            <button class="podcast-action-btn podcast-share-btn" data-detailurl="${ep.detailUrl}" data-title="${ep.title}" title="Compartir">
                                <img src="${ICONS.add}" alt="compartir">
                            </button>
                        </div>
                        <button class="podcast-play-episode-btn podcast-play-specific" data-index="${index}" title="Reproducir episodio">
                            <img src="${ICONS.play}" alt="play">
                        </button>
                    </div>
                </div>
            </div>
        `}).join('');
        return `
            <div class="podcast-widget">
                <div class="podcast-header" id="podcastHeader">
                    <div class="podcast-header-bg" style="background-image: url('${cover}');"></div>
                    <div class="podcast-header-content">
                        <div class="podcast-thumbnail">
                            <img src="${cover}" alt="${series.titulo_serie}" id="seriesCoverImg">
                        </div>
                        <div class="podcast-info">
                            <h1 class="series-title">${series.titulo_serie}</h1>
                            <p class="series-author">${author}</p>
                            <p class="series-description">${description}</p>
                        </div>
                    </div>
                    <div class="podcast-control-bar">
                        <div class="podcast-left-actions">
                            <div class="podcast-creator-avatar">
                                <img src="${cover}" alt="Docente" loading="lazy">
                            </div>
                            <button class="podcast-icon-btn" id="podcastBtnAddMain" title="Añadir último episodio a lista">
                                <img src="${ICONS.add}" alt="">
                            </button>
                            <button class="podcast-icon-btn" id="podcastBtnDownloadMain" title="Descargar último episodio">
                                <img src="${ICONS.dl}" alt="">
                            </button>
                            <button class="podcast-icon-btn" id="podcastBtnShareMain" title="Compartir serie">
                                <img src="${ICONS.add}" alt="">
                            </button>
                        </div>
                        <button class="podcast-last-episode-btn" id="podcastLastEpisodePlayBtn">
                            <span class="podcast-play-icon-large">
                                <img src="${ICONS.play}" alt="">
                            </span>
                            <span class="podcast-btn-text">
                                <span class="podcast-small-label">ÚLTIMO EPISODIO</span>
                                <span class="podcast-strong-title">${lastEpisode.title.substring(0,25)}${lastEpisode.title.length>25?'...':''}</span>
                            </span>
                        </button>
                    </div>
                </div>
                <div class="podcast-episodes-list" id="podcastEpisodesListContainer">
                    ${episodesHtml}
                </div>
            </div>
        `;
    }

    function attachSeriesEvents(episodes) {
        const lastEpisode = episodes[0];
        document.getElementById('podcastLastEpisodePlayBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            playEpisode(lastEpisode, episodes);
        });
        document.getElementById('podcastBtnAddMain')?.addEventListener('click', () => {
            addToUserPlaylist({
                mediaUrl: lastEpisode.mediaUrl,
                type: lastEpisode.type,
                cover: lastEpisode.cover,
                title: lastEpisode.title,
                detailUrl: lastEpisode.detailUrl,
                author: lastEpisode.author,
                description: lastEpisode.description,
                allowDownload: lastEpisode.allowDownload,
                id: lastEpisode.id
            });
            const btnImg = document.querySelector('#podcastBtnAddMain img');
            if (btnImg) btnImg.src = ICONS.added;
        });
        document.getElementById('podcastBtnDownloadMain')?.addEventListener('click', () => {
            if (lastEpisode.allowDownload) {
                window.open(lastEpisode.mediaUrl, '_blank');
            } else {
                showErrorModal('Descarga no disponible', `"${lastEpisode.title}" no puede descargarse.`);
            }
        });
        document.getElementById('podcastBtnShareMain')?.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(window.location.href); alert('Enlace copiado'); } catch { }
        });
        episodes.forEach((ep, index) => {
            const card = document.querySelector(`.podcast-episode-card[data-episode-id="${ep.id}"]`);
            if (!card) return;
            card.querySelector('.podcast-add-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                addToUserPlaylist({
                    mediaUrl: ep.mediaUrl,
                    type: ep.type,
                    cover: ep.cover,
                    title: ep.title,
                    detailUrl: ep.detailUrl,
                    author: ep.author,
                    description: ep.description,
                    allowDownload: ep.allowDownload,
                    id: ep.id
                });
                const img = e.currentTarget.querySelector('img');
                if (img) img.src = ICONS.added;
            });
            card.querySelector('.podcast-download-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                if (ep.allowDownload) {
                    window.open(ep.mediaUrl, '_blank');
                } else {
                    showErrorModal('Descarga no disponible', `"${ep.title}" no puede descargarse.`);
                }
            });
            card.querySelector('.podcast-share-btn')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                await navigator.clipboard.writeText(ep.detailUrl);
                alert('Enlace copiado');
            });
            card.querySelector('.podcast-play-specific')?.addEventListener('click', (e) => {
                e.stopPropagation();
                playEpisode(ep, episodes);
            });
            card.addEventListener('click', () => {
                navigate(ep.detailUrl);
            });
        });
    }

    function renderEpisodeWidget(episode) {
        const series = episode.series;
        const inPlaylist = isInPlaylist(episode.mediaUrl);
        return `
            <div class="podcast-widget">
                <div class="podcast-header">
                    <div class="podcast-header-bg" style="background-image: url('${episode.cover}');"></div>
                    <div class="podcast-header-content">
                        <div class="podcast-thumbnail">
                            <img src="${episode.cover}" alt="${episode.title}">
                        </div>
                        <div class="podcast-info">
                            <h1 class="series-title">${episode.title}</h1>
                            <p class="series-author">${episode.author}</p>
                            <p class="series-description">${episode.description || ''}</p>
                        </div>
                    </div>
                    <div class="podcast-control-bar">
                        <div class="podcast-left-actions">
                            <div class="podcast-creator-avatar">
                                <img src="${series?.portada_serie || episode.cover}" alt="Serie">
                            </div>
                            <button class="podcast-icon-btn" id="episodeBtnAdd" title="Añadir a lista">
                                <img src="${inPlaylist ? ICONS.added : ICONS.add}" alt="">
                            </button>
                            <button class="podcast-icon-btn" id="episodeBtnDownload" title="Descargar">
                                <img src="${episode.allowDownload ? ICONS.dl : ICONS.noDl}" alt="">
                            </button>
                            <button class="podcast-icon-btn" id="episodeBtnShare" title="Compartir">
                                <img src="${ICONS.add}" alt="">
                            </button>
                        </div>
                        <button class="podcast-last-episode-btn" id="episodePlayBtn">
                            <span class="podcast-play-icon-large">
                                <img src="${ICONS.play}" alt="">
                            </span>
                            <span class="podcast-btn-text">
                                <span class="podcast-small-label">REPRODUCIR</span>
                                <span class="podcast-strong-title">${episode.title.substring(0,25)}</span>
                            </span>
                        </button>
                    </div>
                </div>
                ${series ? `
                <div class="part-of-program">
                    <h3 class="text-lg sm:text-xl font-bold mb-4">Parte del programa</h3>
                    <div class="program-card" onclick="StreamHub.navigate('${series.url_serie}')">
                        <img src="${series.portada_serie || episode.cover}" alt="${series.titulo_serie}">
                        <div>
                            <h3>${series.titulo_serie}</h3>
                            <p>${series.descripcion_serie || ''}</p>
                            <p class="view-link">Ver más episodios →</p>
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    function attachEpisodeEvents(episode) {
        document.getElementById('episodeBtnAdd')?.addEventListener('click', () => {
            addToUserPlaylist({
                mediaUrl: episode.mediaUrl,
                type: episode.type,
                cover: episode.cover,
                title: episode.title,
                detailUrl: episode.detailUrl,
                author: episode.author,
                description: episode.description,
                allowDownload: episode.allowDownload,
                id: episode.id
            });
            const img = document.querySelector('#episodeBtnAdd img');
            if (img) img.src = ICONS.added;
        });
        document.getElementById('episodeBtnDownload')?.addEventListener('click', () => {
            if (episode.allowDownload) {
                window.open(episode.mediaUrl, '_blank');
            } else {
                showErrorModal('Descarga no disponible', `"${episode.title}" no puede descargarse.`);
            }
        });
        document.getElementById('episodeBtnShare')?.addEventListener('click', async () => {
            await navigator.clipboard.writeText(window.location.href);
            alert('Enlace copiado');
        });
        document.getElementById('episodePlayBtn')?.addEventListener('click', () => {
            playEpisode(episode, [episode]);
        });
    }

    // ---------- Inicialización del feed ----------
    function initFeed() {
        console.log('Inicializando feed...');
        if (!DATA || DATA.length === 0) {
            console.error('No hay datos para mostrar');
            const feedView = document.getElementById('feed-view');
            if (feedView) feedView.innerHTML = '<div class="text-center py-20"><p class="text-gray-400 text-lg">No hay contenido disponible en este momento.</p></div>';
            return;
        }
        renderCategoryPills();
        const feed = document.getElementById('feed-view');
        if (!feed) return;
        const getRandomSafe = (count, filterFn = () => true) => {
            const filtered = DATA.filter(filterFn);
            if (filtered.length === 0) return [];
            const shuffled = [...filtered].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, Math.min(count, shuffled.length));
        };
        feed.innerHTML = '';
        feed.innerHTML += createCarousel("Nuevos Lanzamientos", "standard", getRandomSafe(15, ep => new Date(ep.date) > new Date(Date.now() - 30*24*60*60*1000)), "Todos");
        feed.innerHTML += createCarousel("Series de Video", "expand", getRandomSafe(10, e => e.type === 'video'), "Cine y TV");
        feed.innerHTML += createCarousel("Top Semanal", "list", getRandomSafe(16), "Todos");
        feed.innerHTML += createCarousel("Para Estudiar Profundamente", "double", getRandomSafe(20, e => e.categories.includes("Matemáticas") || e.categories.includes("Física y Astronomía")), "Matemáticas");
        feed.innerHTML += createCarousel("Matemáticas", "standard", getRandomSafe(15, e => e.categories.includes("Matemáticas")), "Matemáticas");
        feed.innerHTML += createCarousel("Especiales en Video", "expand", getRandomSafe(10, e => e.type === 'video' && e.categories.includes("Documentales")), "Documentales");
        feed.innerHTML += createCarousel("Física y Astronomía", "standard", getRandomSafe(15, e => e.categories.includes("Física y Astronomía")), "Física y Astronomía");
        feed.innerHTML += createCarousel("Ciencias Naturales y Tecnología", "double", getRandomSafe(20, e => e.categories.some(c => ["Ciencias Naturales", "Tecnología e Informática"].includes(c))), "Otras Ciencias");
        feed.innerHTML += createSeriesCarousel();
        feed.innerHTML += createCarousel("Otras Ciencias y Disciplinas", "standard", getRandomSafe(15, e => e.categories.includes("Otras Ciencias") || e.categories.some(c => ["Ciencias Naturales", "Tecnología e Informática"].includes(c))), "Otras Ciencias");
        console.log('Feed inicializado correctamente');
    }

    // ---------- Router ----------
    function navigate(path) {
        history.pushState({}, '', path);
        renderPath(path);
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    function renderPath(fullPath) {
        // Separar path y query
        const [path, query] = fullPath.split('?');
        const params = new URLSearchParams(query);

        // Ocultar todas las vistas
        document.getElementById('feed-view').classList.add('hidden');
        document.getElementById('grid-view').classList.add('hidden');
        document.getElementById('detail-view').classList.add('hidden');

        // 1. Páginas estáticas definidas en window.PAGES
        const page = (window.PAGES || []).find(p => p.url === path);
        if (page) {
            // Control de visibilidad del header y categorías
            const topHeader = document.getElementById('top-header');
            const categoryFilters = document.getElementById('category-filters');
            if (page.header) {
                topHeader?.classList.remove('hidden');
                categoryFilters?.classList.remove('hidden');
            } else {
                topHeader?.classList.add('hidden');
                categoryFilters?.classList.add('hidden');
            }

            const view = document.getElementById('detail-view');
            view.classList.remove('hidden');

            const renderFuncName = `render${page.titulo}`; // ej. renderBiblioteca
            if (typeof window[renderFuncName] === 'function') {
                view.innerHTML = window[renderFuncName]() || '<div>Error al cargar la página</div>';
                document.title = `${page.titulo} · Balta Media`;
            } else {
                // Cargar script dinámicamente
                loadScript(page.script)
                    .then(() => {
                        if (typeof window[renderFuncName] === 'function') {
                            view.innerHTML = window[renderFuncName]();
                            document.title = `${page.titulo} · Balta Media`;
                        } else {
                            throw new Error('Función de renderizado no encontrada después de cargar script');
                        }
                    })
                    .catch(err => {
                        console.error('Error cargando página especial:', err);
                        // Fallback a 404
                        if (typeof window.render404 === 'function') {
                            view.innerHTML = window.render404();
                        } else {
                            view.innerHTML = '<div class="text-center py-20"><h2>404 - Página no encontrada</h2></div>';
                        }
                    });
            }
            return;
        }

        // 2. Ruta raíz
        if (path === '/' || path === '') {
            document.getElementById('feed-view').classList.remove('hidden');
            // Asegurar que header y categorías estén visibles
            document.getElementById('top-header')?.classList.remove('hidden');
            document.getElementById('category-filters')?.classList.remove('hidden');
            document.title = 'Balta Media · Conocimiento en acción';
            return;
        }

        // 3. Búsqueda
        if (path === '/buscar') {
            const q = params.get('q');
            if (q) {
                performSearch(q);
            } else {
                navigate('/');
            }
            return;
        }

        // 4. Categoría
        if (path.startsWith('/categoria/')) {
            const cat = decodeURIComponent(path.replace('/categoria/', ''));
            if (CATEGORIES.includes(cat)) {
                renderCategoryPills(cat);
                const results = DATA.filter(ep => ep.categories.includes(cat));
                renderGrid(results, cat);
                document.title = `${cat} · Balta Media`;
            } else {
                renderNotFound();
            }
            return;
        }

        // 5. Serie (buscamos por url_serie)
        const seriesEpisodes = DATA.filter(ep => ep.series && ep.series.url_serie === path);
        if (seriesEpisodes.length > 0) {
            const sorted = [...seriesEpisodes].sort((a, b) => new Date(b.date) - new Date(a.date));
            const seriesInfo = sorted[0].series;
            const container = document.getElementById('detail-view');
            container.classList.remove('hidden');
            container.innerHTML = renderSeriesWidget(seriesInfo, sorted);
            attachSeriesEvents(sorted);
            document.title = `${seriesInfo.titulo_serie} · Balta Media`;
            return;
        }

        // 6. Episodio (buscamos por detailUrl)
        const episode = DATA.find(ep => ep.detailUrl === path);
        if (episode) {
            const container = document.getElementById('detail-view');
            container.classList.remove('hidden');
            container.innerHTML = renderEpisodeWidget(episode);
            attachEpisodeEvents(episode);
            document.title = `${episode.title} · Balta Media`;
            return;
        }

        // 7. Novedades (vista especial)
        if (path === '/novedades') {
            const sorted = [...DATA].sort((a, b) => new Date(b.date) - new Date(a.date));
            const recientes = sorted.slice(0, 20);
            const aleatorios = [...DATA].sort(() => 0.5 - Math.random()).slice(0, 10);
            const combined = [...new Set([...recientes, ...aleatorios])];
            renderGrid(combined, 'Novedades y Recomendaciones');
            document.title = 'Novedades · Balta Media';
            return;
        }

        // 8. No encontrado
        renderNotFound();
    }

    function renderNotFound() {
        const container = document.getElementById('detail-view');
        container.classList.remove('hidden');
        if (typeof window.render404 === 'function') {
            container.innerHTML = window.render404();
        } else {
            container.innerHTML = `
                <div class="detail-404">
                    <h2 class="text-3xl sm:text-4xl font-bold mb-4">404</h2>
                    <p class="text-lg sm:text-xl">Este contenido no está disponible</p>
                    <button onclick="StreamHub.navigate('/')" class="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full">Volver al inicio</button>
                </div>
            `;
        }
        document.title = 'Página no encontrada · Balta Media';
    }

    function goToDetail(url) {
        if (url && url !== '#') navigate(url);
    }

function init() {
    // Obtener datos desde episodios.js
    if (typeof window.processEpisodes === 'function') {
        DATA = window.processEpisodes();
    } else {
        console.error('window.processEpisodes no está definido. Asegúrate de cargar episodios.js');
        DATA = [];
    }

    // Inyectar estilos adicionales
    injectComponentStyles();

    // Iniciar el feed (llenar el contenido de la página principal)
    initFeed();

    // Escuchar clicks en enlaces internos
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href) return;
        if (href.startsWith('http') || href.startsWith('//') || href.startsWith('#')) return;
        e.preventDefault();
        navigate(href);
    });

    // Manejar popstate (botones atrás/adelante)
    window.addEventListener('popstate', () => {
        renderPath(window.location.pathname + window.location.search);
    });

        // Scroll header
        window.addEventListener('scroll', () => {
            const st = window.pageYOffset || document.documentElement.scrollTop;
            const topHeader = document.getElementById('top-header');
            const mobileSearch = document.getElementById('mobileSearchBar');
            if (!topHeader || !mobileSearch) return;
            if (st > lastScrollTop && st > 100) {
                topHeader.style.transition = 'opacity 0.3s ease';
                topHeader.style.opacity = '0';
                topHeader.style.pointerEvents = 'none';
                mobileSearch.style.transition = 'opacity 0.3s ease';
                mobileSearch.style.opacity = '0';
                mobileSearch.style.pointerEvents = 'none';
            } else {
                topHeader.style.opacity = '1';
                topHeader.style.pointerEvents = 'auto';
                mobileSearch.style.opacity = '1';
                mobileSearch.style.pointerEvents = 'auto';
            }
            lastScrollTop = st <= 0 ? 0 : st;
        }, false);
    }
       // ¡¡¡ IMPORTANTE: Procesar la ruta actual !!!
    renderPath(window.location.pathname + window.location.search);
}

    function injectComponentStyles() {
        // Estos estilos son los que estaban en el index original y son necesarios para los componentes
        const style = document.createElement('style');
        style.innerHTML = `
            .nav-btn {
                position: absolute; top: 0; bottom: 0; z-index: 40; width: 60px;
                display: none; align-items: center; justify-content: center;
                transition: opacity 0.3s;
            }
            .nav-btn.left { left: 0; background: linear-gradient(to right, #050505 0%, transparent 100%); }
            .nav-btn.right { right: 0; background: linear-gradient(to left, #050505 0%, transparent 100%); }
            .nav-btn button {
                background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
                border-radius: 50%; width: 40px; height: 40px; border: 1px solid rgba(255,255,255,0.1);
                color: white; font-size: 20px; transition: transform 0.2s, background 0.2s;
            }
            .nav-btn button:hover { background: rgba(255,255,255,0.3); transform: scale(1.1); }
            @media (min-width: 1024px) { .carousel-wrapper:hover .nav-btn { display: flex; } }
            .card-std { min-width: 200px; width: 200px; display: flex; flex-direction: column; gap: 10px; cursor: pointer; position: relative; }
            .card-video {
                height: 220px; width: 220px; flex-shrink: 0; position: relative; overflow: hidden; border-radius: 12px;
                transition: width 0.5s cubic-bezier(0.25, 1, 0.5, 1); cursor: pointer;
            }
            @media (min-width: 1024px) { .card-video:hover { width: 390px; } }
            .card-list-group { min-width: 340px; display: flex; flex-direction: column; gap: 16px; }
            .list-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px 6px;
                border-radius: 8px;
                transition: background 0.2s;
                cursor: pointer;
                width: 100%;
            }
            .list-item:hover { background: rgba(255,255,255,0.08); }
            .list-item .item-content {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
            }
            .list-item .item-actions {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-shrink: 0;
            }
            @media (max-width: 640px) {
                .list-item {
                    flex-wrap: nowrap;
                }
                .list-item .item-actions button {
                    width: 32px;
                    height: 32px;
                    padding: 0;
                }
            }
            .overlay-full {
                position: absolute; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);
                opacity: 0; transition: opacity 0.3s; display: flex; align-items: center; justify-content: center; gap: 12px; border-radius: 12px;
            }
            .group:hover .overlay-full { opacity: 1; }
            .overlay-mini {
                position: absolute; inset: 0; background: rgba(0,0,0,0.4); opacity: 0; transition: opacity 0.2s;
                display: flex; align-items: center; justify-content: center; border-radius: 4px;
            }
            .list-item:hover .overlay-mini { opacity: 1; }
            .action-icon { width: 36px; height: 36px; transition: transform 0.2s, opacity 0.3s; cursor: pointer; pointer-events: auto; }
            .action-icon:hover { transform: scale(1.15); }
            .play-icon-lg { width: 56px; height: 56px; transition: transform 0.2s; cursor: pointer; pointer-events: auto; }
            .play-icon-lg:hover { transform: scale(1.1); }
            .play-icon-sm { width: 28px; height: 28px; pointer-events: auto; }
            .grid-card { width: 100%; display: flex; flex-direction: column; gap: 10px; cursor: pointer; position: relative; }
            .grid-card .aspect-square { border-radius: 12px; overflow: hidden; position: relative; }
            .desktop-search-container { position: relative; }
            .desktop-search-results {
                position: absolute; top: 100%; left: 0; right: 0;
                background: rgba(10, 10, 10, 0.98); backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; margin-top: 8px; padding: 12px;
                max-height: 400px; overflow-y: auto; z-index: 1000; display: none;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            }
            .desktop-search-results.active { display: block; animation: fadeIn 0.2s ease; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            .search-result-item { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 8px; cursor: pointer; transition: background 0.2s; }
            .search-result-item:hover { background: rgba(255, 255, 255, 0.1); }
            .mobile-play-button {
                position: absolute; bottom: 8px; right: 8px; width: 32px; height: 32px;
                background: rgba(0, 0, 0, 0.7); border-radius: 50%; display: flex; align-items: center; justify-content: center;
                z-index: 30; pointer-events: auto;
            }
            .mobile-play-button img { width: 16px; height: 16px; }
            @media (min-width: 1024px) { .mobile-play-button { display: none; } }
            #mobileSearchBar {
                position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
                transform: translateY(-100%); transition: transform 0.3s ease;
            }
            #mobileSearchBar.open { transform: translateY(0); }
            .search-overlay {
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(8px); z-index: 9998;
                opacity: 0; visibility: hidden; transition: opacity 0.3s ease, visibility 0.3s ease;
            }
            .search-overlay.active { opacity: 1; visibility: visible; }
            @media (max-width: 1023px) { .overlay-full, .overlay-mini, .nav-btn { display: none !important; } }

            /* Estilos para la vista de detalle */
            #detail-view { margin-top: 2rem; min-height: 60vh; }
            .detail-404 { text-align: center; padding: 4rem 2rem; color: #aaa; }
            .podcast-widget * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
            .podcast-widget { width: 100%; max-width: 100%; margin: 0 auto; background: transparent; padding: 16px 12px; }
            @media (min-width: 768px) { .podcast-widget { padding: 32px 28px; } }
            .podcast-header { position: relative; border-radius: 24px; margin-bottom: 32px; color: white; overflow: hidden; box-shadow: 0 25px 40px -15px rgba(0, 0, 0, 0.7); min-height: 300px; display: flex; flex-direction: column; justify-content: space-between; }
            @media (min-width: 768px) { .podcast-header { border-radius: 40px; min-height: 380px; } }
            .podcast-header-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; filter: blur(20px) brightness(0.7); transform: scale(1.2); z-index: 0; }
            .podcast-header::after { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%); z-index: 1; pointer-events: none; }
            .podcast-header-content { position: relative; z-index: 2; display: flex; align-items: flex-end; gap: 16px; padding: 20px 20px 15px 20px; flex: 1; }
            @media (min-width: 768px) { .podcast-header-content { gap: 30px; padding: 40px 40px 20px 40px; } }
            .podcast-thumbnail img { width: 100px; height: 100px; border-radius: 20px; object-fit: cover; box-shadow: 0 20px 30px -8px rgba(0, 0, 0, 0.6); border: 2px solid rgba(255, 255, 255, 0.2); }
            @media (min-width: 768px) { .podcast-thumbnail img { width: 160px; height: 160px; border-radius: 32px; } }
            .podcast-info { flex: 1; padding-bottom: 8px; }
            .series-title { font-size: 1.8rem; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; margin-bottom: 4px; text-shadow: 0 2px 10px rgba(0,0,0,0.3); }
            @media (min-width: 768px) { .series-title { font-size: 2.8rem; } }
            .series-author { font-size: 1rem; font-weight: 500; color: rgba(255, 255, 255, 0.9); margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
            .series-author::before { content: '👤'; font-size: 1rem; opacity: 0.8; }
            .series-description { font-size: 0.9rem; line-height: 1.5; color: rgba(255, 255, 255, 0.8); max-width: 700px; text-shadow: 0 1px 4px rgba(0,0,0,0.3); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
            .podcast-control-bar { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 10px 15px 20px 15px; margin-top: auto; }
            @media (min-width: 768px) { .podcast-control-bar { padding: 16px 30px 30px 30px; } }
            .podcast-left-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
            .podcast-creator-avatar { width: 40px; height: 40px; border-radius: 16px; background: rgba(255, 255, 255, 0.1); padding: 2px; backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.2); }
            @media (min-width: 768px) { .podcast-creator-avatar { width: 60px; height: 60px; border-radius: 24px; } }
            .podcast-creator-avatar img { width: 100%; height: 100%; border-radius: 12px; object-fit: cover; }
            @media (min-width: 768px) { .podcast-creator-avatar img { border-radius: 20px; } }
            .podcast-icon-btn { background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.15); width: 40px; height: 40px; border-radius: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3); }
            @media (min-width: 768px) { .podcast-icon-btn { width: 60px; height: 60px; border-radius: 24px; } }
            .podcast-icon-btn:hover { background: rgba(255, 255, 255, 0.2); transform: translateY(-3px); }
            .podcast-icon-btn img { width: 20px; height: 20px; filter: brightness(0) invert(1); }
            @media (min-width: 768px) { .podcast-icon-btn img { width: 28px; height: 28px; } }
            .podcast-last-episode-btn { background: rgba(123, 46, 218, 0.9); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 200px; padding: 6px 16px 6px 10px; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: all 0.25s ease; box-shadow: 0 15px 25px -8px rgba(0, 0, 0, 0.5); }
            @media (min-width: 768px) { .podcast-last-episode-btn { padding: 8px 28px 8px 16px; gap: 16px; } }
            .podcast-play-icon-large { background: rgba(255, 255, 255, 0.25); border-radius: 100px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); border: 1px solid rgba(255, 255, 255, 0.3); }
            @media (min-width: 768px) { .podcast-play-icon-large { width: 52px; height: 52px; } }
            .podcast-play-icon-large img { width: 18px; height: 18px; filter: brightness(0) invert(1); margin-left: 2px; }
            @media (min-width: 768px) { .podcast-play-icon-large img { width: 26px; height: 26px; margin-left: 3px; } }
            .podcast-btn-text { text-align: left; line-height: 1.2; }
            .podcast-small-label { display: block; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; color: rgba(255, 255, 255, 0.9); text-transform: uppercase; }
            @media (min-width: 768px) { .podcast-small-label { font-size: 12px; letter-spacing: 0.8px; } }
            .podcast-strong-title { font-size: 14px; font-weight: 700; color: white; white-space: nowrap; }
            @media (min-width: 768px) { .podcast-strong-title { font-size: 18px; } }
            .podcast-episodes-list { display: flex; flex-direction: column; gap: 12px; position: relative; width: 100%; margin: 20px auto 0; }
            @media (min-width: 768px) { .podcast-episodes-list { width: 90%; margin: 40px auto 0; } }
            .podcast-episode-card {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 16px;
                background: rgba(30, 41, 59, 0.7);
                backdrop-filter: blur(12px);
                border-radius: 24px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                transition: all 0.3s ease;
                box-shadow: 0 20px 30px -15px rgba(0, 0, 0, 0.6);
                position: relative;
                z-index: 2;
            }
            @media (min-width: 768px) { .podcast-episode-card { gap: 24px; padding: 24px; border-radius: 36px; } }
            .podcast-episode-cover { width: 80px; height: 80px; border-radius: 20px; object-fit: cover; box-shadow: 0 20px 30px -12px #000000cc; border: 2px solid rgba(255, 255, 255, 0.15); flex-shrink: 0; }
            @media (min-width: 768px) { .podcast-episode-cover { width: 120px; height: 120px; border-radius: 32px; } }
            .podcast-episode-info { flex: 1; min-width: 0; }
            .podcast-episode-title { font-size: 1.1rem; font-weight: 700; letter-spacing: -0.02em; line-height: 1.3; color: #ffffff; margin-bottom: 4px; }
            @media (min-width: 768px) { .podcast-episode-title { font-size: 1.4rem; } }
            .podcast-episode-author { font-size: 0.8rem; font-weight: 500; color: #b0c5e5; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
            .podcast-episode-author span { background: rgba(123, 46, 218, 0.3); padding: 2px 10px; border-radius: 100px; font-size: 0.6rem; font-weight: 700; color: #ffffff; letter-spacing: 0.5px; border: 1px solid rgba(255, 255, 255, 0.15); text-transform: uppercase; backdrop-filter: blur(4px); }
            .podcast-episode-description { font-size: 0.8rem; color: #e2e8f0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-width: 600px; opacity: 0.9; }
            .podcast-episode-actions { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
            .podcast-left-episode-actions { display: flex; gap: 6px; flex-wrap: wrap; }
            .podcast-action-btn { background: rgba(0, 0, 0, 0.3); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.1); width: 36px; height: 36px; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
            @media (min-width: 768px) { .podcast-action-btn { width: 46px; height: 46px; border-radius: 18px; } }
            .podcast-action-btn img { width: 18px; height: 18px; filter: brightness(0) invert(1); opacity: 0.9; }
            @media (min-width: 768px) { .podcast-action-btn img { width: 24px; height: 24px; } }
            .podcast-download-btn[data-allow="false"] { opacity: 0.5; cursor: not-allowed; }
            .podcast-play-episode-btn { background: #7b2eda; border: 1px solid rgba(255, 255, 255, 0.25); width: 44px; height: 44px; border-radius: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; box-shadow: 0 10px 20px rgba(0, 0, 0, 0.5); }
            @media (min-width: 768px) { .podcast-play-episode-btn { width: 60px; height: 60px; border-radius: 30px; } }
            .podcast-play-episode-btn img { width: 22px; height: 22px; filter: brightness(0) invert(1); margin-left: 2px; }
            @media (min-width: 768px) { .podcast-play-episode-btn img { width: 28px; height: 28px; margin-left: 3px; } }
            .part-of-program { margin-top: 2rem; padding: 1.5rem; background: rgba(30,41,59,0.5); backdrop-filter: blur(8px); border-radius: 24px; border: 1px solid rgba(255,255,255,0.05); }
            .program-card { display: flex; align-items: center; gap: 1.5rem; cursor: pointer; flex-wrap: wrap; }
            .program-card img { width: 80px; height: 80px; border-radius: 20px; object-fit: cover; }
            .program-card h3 { font-size: 1.5rem; font-weight: 700; }
            .program-card .view-link { color: #7b2eda; font-weight: 600; margin-top: 0.5rem; }
        `;
        document.head.appendChild(style);
    }

    // Exponer funciones globalmente
    window.StreamHub = {
        // Datos y utilidades
        DATA: () => DATA,
        CATEGORIES,
        ICONS,
        // Navegación
        navigate,
        goToDetail,
        showFeed,
        filterByCategory,
        // Búsqueda
        handleDesktopSearchInput,
        handleDesktopSearchEnter,
        showDesktopSearchResults,
        hideDesktopSearchResults,
        handleMobileSearchInput,
        handleMobileSearchEnter,
        handleMobileSearchButton,
        toggleMobileSearch,
        closeSearch,
        // Handlers
        handlePlay,
        handleAdd,
        handleDl,
        // Playlist
        addToUserPlaylist,
        isInPlaylist,
        // Renderizado (para páginas estáticas, se pueden añadir más)
        // Inicialización
        init
    };
})();
