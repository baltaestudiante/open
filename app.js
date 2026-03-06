// app.js - Motor principal de la aplicación
// Gestiona datos, rutas, búsqueda, playlist y llama a Homeshow para renderizar.

(function() {
    // ---------- Configuración ----------
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

    let DATA = []; // episodios procesados
    let userPlaylist = JSON.parse(localStorage.getItem('streamhub_userPlaylist')) || [];
    let lastScrollTop = 0;
    let searchTimeout = null;

    // ---------- Inicialización de datos ----------
    function loadData() {
        if (typeof window.processEpisodes === 'function') {
            DATA = window.processEpisodes();
        } else {
            console.error('window.processEpisodes no está definido');
            DATA = [];
        }
    }

    // ---------- Playlist ----------
    function isInPlaylist(mediaUrl) {
        return userPlaylist.some(item => item.mediaUrl === mediaUrl);
    }

    function addToUserPlaylist(episodeData) {
        if (!episodeData || !episodeData.mediaUrl) return false;
        const exists = userPlaylist.some(item => item.mediaUrl === episodeData.mediaUrl);
        if (!exists) {
            const playlistItem = {
                mediaUrl: episodeData.mediaUrl,
                mediaType: episodeData.type || 'audio',
                coverUrlContainer: episodeData.cover,
                coverUrlInfo: episodeData.cover,
                title: episodeData.title,
                detailUrl: episodeData.detailUrl,
                author: episodeData.author,
                next: [],
                text: episodeData.description,
                allowDownload: episodeData.allowDownload
            };
            userPlaylist.push(playlistItem);
            localStorage.setItem('streamhub_userPlaylist', JSON.stringify(userPlaylist));
            updateAddButtons(episodeData.id || episodeData.mediaUrl);
            return true;
        }
        return false;
    }

    function updateAddButtons(identifier) {
        const buttons = document.querySelectorAll(`[data-episode-id="${identifier}"], [data-media-url="${identifier}"]`);
        buttons.forEach(btn => {
            if (btn.dataset.added !== 'true') {
                if (btn.tagName === 'IMG') btn.src = Homeshow.ICONS.added;
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

    // ---------- Handlers de reproducción y descarga ----------
    function playEpisode(ep, list = []) {
        try {
            if (typeof window.playEpisodeExpanded === 'function') {
                window.playEpisodeExpanded(
                    ep.mediaUrl,
                    ep.type || 'audio',
                    ep.cover,
                    ep.cover,
                    ep.title,
                    ep.detailUrl,
                    ep.author,
                    list,
                    ep.description || '',
                    ep.allowDownload
                );
            } else {
                showErrorModal('Reproductor no disponible', `No se pudo reproducir "${ep.title}".`);
            }
        } catch (e) {
            console.error(e);
            showErrorModal('Error al reproducir', `Ocurrió un problema con "${ep.title}".`);
        }
    }

    function handlePlay(e, id) {
        e.stopPropagation();
        e.preventDefault();
        const ep = DATA.find(x => x.id == id);
        if (ep) playEpisode(ep);
        else showErrorModal('Episodio no encontrado', 'No se encontró el episodio.');
        return false;
    }

    function handleAdd(e, id) {
        e.stopPropagation();
        e.preventDefault();
        const ep = DATA.find(x => x.id == id);
        if (!ep) return false;
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
            const button = e.target.closest('img') || e.target;
            if (button.tagName === 'IMG') button.src = Homeshow.ICONS.added;
            button.dataset.added = 'true';
        }
        return false;
    }

    function handleDl(e, id) {
        e.stopPropagation();
        e.preventDefault();
        const ep = DATA.find(x => x.id == id);
        if (!ep) return false;
        if (!ep.allowDownload) {
            showErrorModal('Descarga no disponible', `"${ep.title}" no puede descargarse.`);
            return false;
        }
        try {
            const ext = ep.type === 'video' ? 'mp4' : 'mp3';
            const filename = `${ep.title.replace(/[^a-z0-9]/gi, '_')}.${ext}`;
            const a = document.createElement('a');
            a.href = ep.mediaUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            showErrorModal('Error al descargar', `No se pudo descargar "${ep.title}".`);
            window.open(ep.mediaUrl, '_blank');
        }
        return false;
    }

    // ---------- Búsqueda ----------
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
            container.innerHTML = `<div class="text-center py-4 text-gray-400">No hay resultados</div>`;
            return;
        }
        container.innerHTML = results.map(ep => `
            <div class="search-result-item" onclick="App.goToDetail('${ep.detailUrl}'); event.stopPropagation();">
                <div class="w-12 h-12 rounded-md overflow-hidden"><img src="${ep.cover}" class="w-full h-full object-cover"></div>
                <div><h4 class="font-bold text-sm text-white">${ep.title}</h4><p class="text-xs text-gray-400">${ep.author}</p></div>
            </div>
        `).join('');
        container.innerHTML += `<div class="search-result-item" onclick="App.navigate('/buscar?q='+encodeURIComponent('${query}'))">Ver todos</div>`;
    }

    function handleDesktopSearchInput(query) {
        clearTimeout(searchTimeout);
        if (!query) { clearDesktopSearchResults(); return; }
        searchTimeout = setTimeout(() => {
            renderDesktopSearchResults(performQuickSearch(query), query);
        }, 300);
    }

    function handleDesktopSearchEnter(e) {
        e.preventDefault();
        const q = document.getElementById('desktopSearch').value.trim();
        if (q) navigate('/buscar?q=' + encodeURIComponent(q));
    }

    function showDesktopSearchResults() {
        document.getElementById('desktopSearchResults')?.classList.add('active');
    }

    function hideDesktopSearchResults() {
        setTimeout(() => document.getElementById('desktopSearchResults')?.classList.remove('active'), 200);
    }

    function clearDesktopSearchResults() {
        const c = document.getElementById('desktopSearchResultsContent');
        if (c) c.innerHTML = '';
        document.getElementById('desktopSearchResults')?.classList.remove('active');
    }

    // Móvil
    function toggleMobileSearch() {
        const el = document.getElementById('mobileSearchBar');
        const overlay = document.getElementById('searchOverlay');
        if (!el) return;
        if (el.classList.contains('open')) {
            el.classList.remove('open');
            overlay?.classList.remove('active');
            document.getElementById('mobileSearchInput').value = '';
            document.getElementById('mobileSearchResults').innerHTML = '';
        } else {
            el.classList.add('open');
            overlay?.classList.add('active');
            document.getElementById('mobileSearchInput')?.focus();
        }
    }

    function handleMobileSearchInput(query) {
        clearTimeout(searchTimeout);
        if (!query) { document.getElementById('mobileSearchResults').innerHTML = ''; return; }
        searchTimeout = setTimeout(() => {
            const results = performQuickSearch(query);
            const container = document.getElementById('mobileSearchResults');
            if (results.length === 0) container.innerHTML = '<div class="text-center py-4 text-gray-400">No hay resultados</div>';
            else {
                container.innerHTML = results.map(ep => `
                    <div class="search-result-item" onclick="App.goToDetail('${ep.detailUrl}'); closeSearch();">
                        <div class="w-12 h-12 rounded-md overflow-hidden"><img src="${ep.cover}" class="w-full h-full object-cover"></div>
                        <div><h4 class="font-bold text-sm">${ep.title}</h4><p class="text-xs text-gray-400">${ep.author}</p></div>
                    </div>
                `).join('');
            }
        }, 300);
    }

    function handleMobileSearchEnter(e) {
        e.preventDefault();
        const q = document.getElementById('mobileSearchInput').value.trim();
        if (q) handleMobileSearch(q);
    }

    function handleMobileSearchButton() {
        const q = document.getElementById('mobileSearchInput').value.trim();
        if (q) handleMobileSearch(q);
    }

    function handleMobileSearch(query) {
        navigate('/buscar?q=' + encodeURIComponent(query));
        closeSearch();
    }

    function closeSearch() {
        document.getElementById('mobileSearchBar')?.classList.remove('open');
        document.getElementById('searchOverlay')?.classList.remove('active');
        clearDesktopSearchResults();
    }

    // ---------- Cambios de vista ----------
    function toggleView(view) {
        const feed = document.getElementById('feed-view');
        const grid = document.getElementById('grid-view');
        const detail = document.getElementById('detail-view');
        feed.classList.add('hidden');
        grid.classList.add('hidden');
        detail.classList.add('hidden');
        if (view === 'feed') feed.classList.remove('hidden');
        else if (view === 'grid') grid.classList.remove('hidden');
        else if (view === 'detail') detail.classList.remove('hidden');
    }

    function showFeed() { navigate('/'); }

    // ---------- Renderizado de vistas ----------
    function renderGrid(items, title) {
        toggleView('grid');
        document.getElementById('grid-title').innerText = title;
        const gridContainer = document.getElementById('results-grid');
        const emptyState = document.getElementById('empty-state');
        gridContainer.innerHTML = '';
        if (items.length === 0) {
            emptyState.classList.remove('hidden');
            gridContainer.classList.add('hidden');
            document.getElementById('empty-msg').innerText = `No encontramos nada.`;
            const recGrid = document.getElementById('recommendations-grid');
            recGrid.innerHTML = '';
            DATA.slice(0,5).forEach(ep => recGrid.innerHTML += Homeshow.createGridCard(ep, isInPlaylist, handlePlay, handleAdd, handleDl));
        } else {
            emptyState.classList.add('hidden');
            gridContainer.classList.remove('hidden');
            items.forEach(item => gridContainer.innerHTML += Homeshow.createGridCard(item, isInPlaylist, handlePlay, handleAdd, handleDl));
        }
    }

    function performSearch(query) {
        if (!query) { showFeed(); return; }
        const term = query.toLowerCase().trim();
        const results = DATA.filter(ep =>
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
        if (cat === 'Todos') { navigate('/'); return; }
        navigate('/categoria/' + encodeURIComponent(cat));
    }

    function renderCategoryPills(activeCat = 'Todos') {
        const container = document.getElementById('category-pills');
        if (!container) return;
        container.innerHTML = '';
        CATEGORIES.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = `whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold transition-all ${cat === activeCat ? 'bg-white text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`;
            btn.innerText = cat;
            btn.onclick = () => filterByCategory(cat);
            container.appendChild(btn);
        });
    }

    // ---------- Inicialización del feed (página principal) ----------
    function initFeed() {
        if (!DATA.length) return;
        renderCategoryPills();
        const feed = document.getElementById('feed-view');
        const getRandomSafe = (count, filterFn) => {
            const filtered = DATA.filter(filterFn);
            const shuffled = [...filtered].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, Math.min(count, shuffled.length));
        };
        feed.innerHTML = '';
        feed.innerHTML += Homeshow.createCarousel("Nuevos Lanzamientos", "standard", getRandomSafe(15, ep => new Date(ep.date) > new Date(Date.now() - 30*24*60*60*1000)), "Todos", isInPlaylist, handlePlay, handleAdd, handleDl);
        feed.innerHTML += Homeshow.createCarousel("Series de Video", "expand", getRandomSafe(10, e => e.type === 'video'), "Cine y TV", isInPlaylist, handlePlay, handleAdd, handleDl);
        feed.innerHTML += Homeshow.createCarousel("Top Semanal", "list", getRandomSafe(16), "Todos", isInPlaylist, handlePlay, handleAdd, handleDl);
        feed.innerHTML += Homeshow.createCarousel("Para Estudiar Profundamente", "double", getRandomSafe(20, e => e.categories.includes("Matemáticas") || e.categories.includes("Física y Astronomía")), "Matemáticas", isInPlaylist, handlePlay, handleAdd, handleDl);
        feed.innerHTML += Homeshow.createCarousel("Matemáticas", "standard", getRandomSafe(15, e => e.categories.includes("Matemáticas")), "Matemáticas", isInPlaylist, handlePlay, handleAdd, handleDl);
        feed.innerHTML += Homeshow.createCarousel("Especiales en Video", "expand", getRandomSafe(10, e => e.type === 'video' && e.categories.includes("Documentales")), "Documentales", isInPlaylist, handlePlay, handleAdd, handleDl);
        feed.innerHTML += Homeshow.createCarousel("Física y Astronomía", "standard", getRandomSafe(15, e => e.categories.includes("Física y Astronomía")), "Física y Astronomía", isInPlaylist, handlePlay, handleAdd, handleDl);
        feed.innerHTML += Homeshow.createCarousel("Ciencias Naturales y Tecnología", "double", getRandomSafe(20, e => e.categories.some(c => ["Ciencias Naturales", "Tecnología e Informática"].includes(c))), "Otras Ciencias", isInPlaylist, handlePlay, handleAdd, handleDl);
        feed.innerHTML += Homeshow.createSeriesCarousel(DATA, isInPlaylist, handlePlay, handleAdd, handleDl);
        feed.innerHTML += Homeshow.createCarousel("Otras Ciencias y Disciplinas", "standard", getRandomSafe(15, e => e.categories.includes("Otras Ciencias")), "Otras Ciencias", isInPlaylist, handlePlay, handleAdd, handleDl);
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
        const [path, query] = fullPath.split('?');
        const params = new URLSearchParams(query);

        // Ocultar todas las vistas
        document.getElementById('feed-view').classList.add('hidden');
        document.getElementById('grid-view').classList.add('hidden');
        document.getElementById('detail-view').classList.add('hidden');

        // 1. Páginas especiales (window.PAGES)
        const page = (window.PAGES || []).find(p => p.url === path);
        if (page) {
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
            const renderFuncName = `render${page.titulo}`;
            if (typeof window[renderFuncName] === 'function') {
                view.innerHTML = window[renderFuncName]();
                document.title = `${page.titulo} · Balta Media`;
            } else {
                loadScript(page.script)
                    .then(() => {
                        if (typeof window[renderFuncName] === 'function') {
                            view.innerHTML = window[renderFuncName]();
                            document.title = `${page.titulo} · Balta Media`;
                        } else {
                            throw new Error('Función no encontrada');
                        }
                    })
                    .catch(() => {
                        view.innerHTML = '<div class="text-center py-20"><h2>Error cargando página</h2></div>';
                    });
            }
            return;
        }

        // 2. Raíz
        if (path === '/' || path === '') {
            document.getElementById('feed-view').classList.remove('hidden');
            document.getElementById('top-header')?.classList.remove('hidden');
            document.getElementById('category-filters')?.classList.remove('hidden');
            document.title = 'Balta Media · Conocimiento en acción';
            return;
        }

        // 3. Búsqueda
        if (path === '/buscar') {
            const q = params.get('q');
            if (q) performSearch(q);
            else navigate('/');
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

        // 5. Serie
        const seriesEpisodes = DATA.filter(ep => ep.series && ep.series.url_serie === path);
        if (seriesEpisodes.length > 0) {
            const sorted = seriesEpisodes.sort((a,b) => new Date(b.date) - new Date(a.date));
            const seriesInfo = sorted[0].series;
            const container = document.getElementById('detail-view');
            container.classList.remove('hidden');
            container.innerHTML = Homeshow.renderSeriesWidget(seriesInfo, sorted, isInPlaylist, handlePlay, handleAdd, handleDl, goToDetail);
            // Adjuntar eventos específicos de la serie
            setTimeout(() => attachSeriesEvents(sorted), 0);
            document.title = `${seriesInfo.titulo_serie} · Balta Media`;
            return;
        }

        // 6. Episodio
        const episode = DATA.find(ep => ep.detailUrl === path);
        if (episode) {
            const container = document.getElementById('detail-view');
            container.classList.remove('hidden');
            container.innerHTML = Homeshow.renderEpisodeWidget(episode, isInPlaylist, handlePlay, handleAdd, handleDl, goToDetail);
            setTimeout(() => attachEpisodeEvents(episode), 0);
            document.title = `${episode.title} · Balta Media`;
            return;
        }

        // 7. Novedades
        if (path === '/novedades') {
            const sorted = [...DATA].sort((a,b) => new Date(b.date) - new Date(a.date));
            const combined = [...new Set([...sorted.slice(0,20), ...DATA.sort(()=>0.5-Math.random()).slice(0,10)])];
            renderGrid(combined, 'Novedades y Recomendaciones');
            document.title = 'Novedades · Balta Media';
            return;
        }

        // 8. No encontrado
        renderNotFound();
    }

    function attachSeriesEvents(episodes) {
        const last = episodes[0];
        document.getElementById('podcastLastEpisodePlayBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            playEpisode(last, episodes);
        });
        document.getElementById('podcastBtnAddMain')?.addEventListener('click', () => {
            addToUserPlaylist({
                mediaUrl: last.mediaUrl, type: last.type, cover: last.cover, title: last.title,
                detailUrl: last.detailUrl, author: last.author, description: last.description,
                allowDownload: last.allowDownload, id: last.id
            });
            const img = document.querySelector('#podcastBtnAddMain img');
            if (img) img.src = Homeshow.ICONS.added;
        });
        document.getElementById('podcastBtnDownloadMain')?.addEventListener('click', () => {
            if (last.allowDownload) window.open(last.mediaUrl, '_blank');
            else showErrorModal('Descarga no disponible', `"${last.title}" no puede descargarse.`);
        });
        document.getElementById('podcastBtnShareMain')?.addEventListener('click', async () => {
            await navigator.clipboard.writeText(window.location.href);
            alert('Enlace copiado');
        });
        episodes.forEach(ep => {
            const card = document.querySelector(`.podcast-episode-card[data-episode-id="${ep.id}"]`);
            if (!card) return;
            card.querySelector('.podcast-add-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                addToUserPlaylist({
                    mediaUrl: ep.mediaUrl, type: ep.type, cover: ep.cover, title: ep.title,
                    detailUrl: ep.detailUrl, author: ep.author, description: ep.description,
                    allowDownload: ep.allowDownload, id: ep.id
                });
                e.currentTarget.querySelector('img').src = Homeshow.ICONS.added;
            });
            card.querySelector('.podcast-download-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                if (ep.allowDownload) window.open(ep.mediaUrl, '_blank');
                else showErrorModal('Descarga no disponible', `"${ep.title}" no puede descargarse.`);
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
            card.addEventListener('click', () => navigate(ep.detailUrl));
        });
    }

    function attachEpisodeEvents(episode) {
        document.getElementById('episodeBtnAdd')?.addEventListener('click', () => {
            addToUserPlaylist({
                mediaUrl: episode.mediaUrl, type: episode.type, cover: episode.cover, title: episode.title,
                detailUrl: episode.detailUrl, author: episode.author, description: episode.description,
                allowDownload: episode.allowDownload, id: episode.id
            });
            document.querySelector('#episodeBtnAdd img').src = Homeshow.ICONS.added;
        });
        document.getElementById('episodeBtnDownload')?.addEventListener('click', () => {
            if (episode.allowDownload) window.open(episode.mediaUrl, '_blank');
            else showErrorModal('Descarga no disponible', `"${episode.title}" no puede descargarse.`);
        });
        document.getElementById('episodeBtnShare')?.addEventListener('click', async () => {
            await navigator.clipboard.writeText(window.location.href);
            alert('Enlace copiado');
        });
        document.getElementById('episodePlayBtn')?.addEventListener('click', () => {
            playEpisode(episode, [episode]);
        });
    }

    function renderNotFound() {
        const container = document.getElementById('detail-view');
        container.classList.remove('hidden');
        if (typeof window.render404 === 'function') {
            container.innerHTML = window.render404();
        } else {
            container.innerHTML = `
                <div class="detail-404">
                    <h2 class="text-3xl font-bold mb-4">404</h2>
                    <p class="text-lg">Este contenido no está disponible</p>
                    <button onclick="App.navigate('/')" class="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full">Volver al inicio</button>
                </div>
            `;
        }
        document.title = 'Página no encontrada · Balta Media';
    }

    function goToDetail(url) {
        if (url && url !== '#') navigate(url);
    }

    // ---------- Inicialización global ----------
    function init() {
        loadData();
        Homeshow.injectStyles();
        initFeed();

        // Eventos de navegación
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;
            const href = link.getAttribute('href');
            if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('#')) return;
            e.preventDefault();
            navigate(href);
        });

        window.addEventListener('popstate', () => {
            renderPath(window.location.pathname + window.location.search);
        });

        // Scroll header
        window.addEventListener('scroll', () => {
            const st = window.pageYOffset;
            const topHeader = document.getElementById('top-header');
            const mobileSearch = document.getElementById('mobileSearchBar');
            if (!topHeader || !mobileSearch) return;
            if (st > lastScrollTop && st > 100) {
                topHeader.style.opacity = '0';
                topHeader.style.pointerEvents = 'none';
                mobileSearch.style.opacity = '0';
                mobileSearch.style.pointerEvents = 'none';
            } else {
                topHeader.style.opacity = '1';
                topHeader.style.pointerEvents = 'auto';
                mobileSearch.style.opacity = '1';
                mobileSearch.style.pointerEvents = 'auto';
            }
            lastScrollTop = st <= 0 ? 0 : st;
        });

        // Procesar la ruta actual
        renderPath(window.location.pathname + window.location.search);
    }

    // Exponer funciones necesarias globalmente (para llamadas desde HTML)
    window.App = {
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
        // Inicialización
        init
    };
})();

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    if (window.App && typeof window.App.init === 'function') {
        window.App.init();
    }
});
