// homeshow.js
// Funciones de renderizado de componentes (cards, carruseles, vistas de episodio/serie)
// NO contiene lógica de negocio ni router. Solo recibe datos y devuelve HTML.

(function() {
    // ---------- CONSTANTES (íconos) ----------
    const ICONS = {
        play: 'https://marca1.odoo.com/web/image/508-f876320c/play.svg',
        add: 'https://marca1.odoo.com/web/image/509-c555b4ef/a%C3%B1adir%20a.svg',
        added: 'https://nikichitonjesus.odoo.com/web/image/1112-d141b3eb/a%C3%B1adido.png',
        dl: 'https://marca1.odoo.com/web/image/510-7a9035c1/descargar.svg',
        noDl: 'https://nikichitonjesus.odoo.com/web/image/1051-622a3db3/no-desc.webp'
    };

    // Función para inyectar estilos (solo una vez)
    function injectStyles() {
        if (document.getElementById('homeshow-styles')) return;
        const style = document.createElement('style');
        style.id = 'homeshow-styles';
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

    // Funciones de renderizado
    function createStandardCard(ep, isInPlaylistFn, handlePlayFn, handleAddFn, handleDlFn) {
        const isInPlaylistItem = isInPlaylistFn(ep.mediaUrl);
        const addIcon = isInPlaylistItem ? ICONS.added : ICONS.add;
        const dlIcon = ep.allowDownload ? ICONS.dl : ICONS.noDl;
        return `<div class="card-std group">
            <div class="relative w-full aspect-square rounded-xl overflow-hidden bg-zinc-800" onclick="App.goToDetail('${ep.detailUrl}')">
                <img src="${ep.cover}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                <div class="overlay-full">
                    <img src="${addIcon}" class="action-icon" onclick="App.handleAdd(event, ${ep.id}); return false;" 
                         data-episode-id="${ep.id}" data-added="${isInPlaylistItem}">
                    <img src="${ICONS.play}" class="play-icon-lg" onclick="App.handlePlay(event, ${ep.id}); return false;">
                    <img src="${dlIcon}" class="action-icon" onclick="App.handleDl(event, ${ep.id}); return false;" 
                         title="${ep.allowDownload ? 'Descargar' : 'Descarga no disponible'}">
                </div>
                <div class="mobile-play-button" onclick="App.handlePlay(event, ${ep.id}); return false;">
                    <img src="${ICONS.play}" alt="Play">
                </div>
            </div>
            <div onclick="App.goToDetail('${ep.detailUrl}')">
                <h3 class="font-bold text-white text-sm truncate">${ep.title}</h3>
                <p class="text-xs text-gray-400 mt-1 truncate">${ep.author}</p>
            </div>
        </div>`;
    }

    function createVideoExpand(ep, isInPlaylistFn, handlePlayFn, handleAddFn, handleDlFn) {
        const isInPlaylistItem = isInPlaylistFn(ep.mediaUrl);
        const addIcon = isInPlaylistItem ? ICONS.added : ICONS.add;
        const dlIcon = ep.allowDownload ? ICONS.dl : ICONS.noDl;
        const hasCover2 = ep.coverWide && ep.coverWide !== ep.cover;
        return `<div class="card-video group">
            <img src="${ep.cover}" class="absolute inset-0 w-full h-full object-cover z-10 group-hover:opacity-0 transition-opacity duration-300">
            ${hasCover2 ? `<img src="${ep.coverWide}" class="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300">` : ''}
            <div class="overlay-full z-20">
                <img src="${addIcon}" class="action-icon" onclick="App.handleAdd(event, ${ep.id}); return false;" 
                     data-episode-id="${ep.id}" data-added="${isInPlaylistItem}">
                <img src="${ICONS.play}" class="play-icon-lg" onclick="App.handlePlay(event, ${ep.id}); return false;">
                <img src="${dlIcon}" class="action-icon" onclick="App.handleDl(event, ${ep.id}); return false;" 
                     title="${ep.allowDownload ? 'Descargar' : 'Descarga no disponible'}">
            </div>
            <div class="mobile-play-button z-30" onclick="App.handlePlay(event, ${ep.id}); return false;">
                <img src="${ICONS.play}" alt="Play">
            </div>
            <div class="absolute bottom-2 left-2 z-20 bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold">VIDEO</div>
        </div>`;
    }

    function createListItem(ep, idx, isInPlaylistFn, handlePlayFn, handleAddFn, handleDlFn) {
        const isInPlaylistItem = isInPlaylistFn(ep.mediaUrl);
        const addIcon = isInPlaylistItem ? ICONS.added : ICONS.add;
        return `<div class="list-item group">
            <span class="text-gray-500 font-bold w-4 text-center text-sm flex-shrink-0">${idx + 1}</span>
            <div class="relative w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 rounded overflow-hidden" onclick="App.goToDetail('${ep.detailUrl}')">
                <img src="${ep.cover}" class="w-full h-full object-cover">
                <div class="overlay-mini" onclick="App.handlePlay(event, ${ep.id}); return false;"><img src="${ICONS.play}" class="play-icon-sm"></div>
            </div>
            <div class="item-content" onclick="App.goToDetail('${ep.detailUrl}')">
                <h4 class="font-bold text-sm truncate text-white">${ep.title}</h4>
                <p class="text-xs text-gray-500 truncate">${ep.author}</p>
            </div>
            <div class="item-actions">
                <button class="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity" onclick="App.handleAdd(event, ${ep.id}); return false;">
                    <img src="${addIcon}" alt="Agregar" class="w-5 h-5" data-episode-id="${ep.id}" data-added="${isInPlaylistItem}">
                </button>
                <div class="lg:hidden mobile-play-button" style="position: static; width: 32px; height: 32px;" onclick="App.handlePlay(event, ${ep.id}); return false;">
                    <img src="${ICONS.play}" alt="Play" class="w-4 h-4">
                </div>
            </div>
        </div>`;
    }

    function createCarousel(title, type, items, categoryContext, isInPlaylistFn, handlePlayFn, handleAddFn, handleDlFn) {
        if (!items || items.length === 0) return '';
        const id = 'c-' + Math.random().toString(36).substr(2, 9);
        let content = '';
        if (type === 'double') {
            content = `<div id="${id}" class="flex flex-col flex-wrap h-[580px] gap-x-6 gap-y-6 overflow-x-auto no-scrollbar scroll-smooth">` + items.map(ep => createStandardCard(ep, isInPlaylistFn, handlePlayFn, handleAddFn, handleDlFn)).join('') + `</div>`;
        } else if (type === 'list') {
            content = `<div id="${id}" class="flex gap-4 sm:gap-8 overflow-x-auto no-scrollbar scroll-smooth pb-4">`;
            for (let i = 0; i < items.length; i += 4) {
                content += `<div class="card-list-group min-w-[300px] sm:min-w-[340px]">` +
                    (items[i] ? createListItem(items[i], i, isInPlaylistFn, handlePlayFn, handleAddFn, handleDlFn) : '') +
                    (items[i+1] ? createListItem(items[i+1], i+1, isInPlaylistFn, handlePlayFn, handleAddFn, handleDlFn) : '') +
                    (items[i+2] ? createListItem(items[i+2], i+2, isInPlaylistFn, handlePlayFn, handleAddFn, handleDlFn) : '') +
                    (items[i+3] ? createListItem(items[i+3], i+3, isInPlaylistFn, handlePlayFn, handleAddFn, handleDlFn) : '') +
                    `</div>`;
            }
            content += `</div>`;
        } else if (type === 'expand') {
            content = `<div id="${id}" class="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth py-2 pl-1">` + items.map(ep => createVideoExpand(ep, isInPlaylistFn, handlePlayFn, handleAddFn, handleDlFn)).join('') + `</div>`;
        } else {
            content = `<div id="${id}" class="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar scroll-smooth py-2 pl-1">` + items.map(ep => createStandardCard(ep, isInPlaylistFn, handlePlayFn, handleAddFn, handleDlFn)).join('') + `</div>`;
        }
        return `<section class="carousel-wrapper relative group/section mb-8 sm:mb-12">
            <div class="flex items-end justify-between mb-3 sm:mb-5 px-1">
                <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-white hover:text-blue-500 transition-colors">${title}</h2>
                <button onclick="App.filterByCategory('${categoryContext}')" class="text-xs font-bold text-gray-500 uppercase tracking-wider hover:text-white">Ver todo</button>
            </div>
            <div class="relative">
                <div class="nav-btn left" onclick="document.getElementById('${id}').scrollLeft -= 600"><button>❮</button></div>
                ${content}
                <div class="nav-btn right" onclick="document.getElementById('${id}').scrollLeft += 600"><button>❯</button></div>
            </div>
        </section>`;
    }

    function createSeriesCarousel(data, isInPlaylistFn, handlePlayFn, handleAddFn, handleDlFn) {
        const id = 'c-series-' + Math.random().toString(36).substr(2, 9);
        const seriesGroups = {};
        data.forEach(ep => {
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
                <div class="mb-4 cursor-pointer" onclick="App.goToDetail('${s.url_serie}')">
                    <div class="relative w-full aspect-square rounded-xl overflow-hidden bg-zinc-800">
                        <img src="${s.portada_serie}" class="w-full h-full object-cover">
                    </div>
                    <h3 class="font-bold text-white text-sm truncate mt-2">${s.titulo_serie}</h3>
                    <p class="text-xs text-gray-400">ver serie</p>
                </div>`;
            group.episodes.slice(0, 4).forEach((ep, i) => {
                content += createListItem(ep, i, isInPlaylistFn, handlePlayFn, handleAddFn, handleDlFn);
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

    function createGridCard(item, isInPlaylistFn, handlePlayFn, handleAddFn, handleDlFn) {
        const isInPlaylistItem = isInPlaylistFn(item.mediaUrl);
        const addIcon = isInPlaylistItem ? ICONS.added : ICONS.add;
        const dlIcon = item.allowDownload ? ICONS.dl : ICONS.noDl;
        return `
            <div class="grid-card group">
                <div class="aspect-square bg-zinc-800 relative" onclick="App.goToDetail('${item.detailUrl}')">
                    <img src="${item.cover}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <div class="overlay-full">
                        <img src="${addIcon}" class="action-icon" onclick="App.handleAdd(event, ${item.id}); return false;" 
                             data-episode-id="${item.id}" data-added="${isInPlaylistItem}">
                        <img src="${ICONS.play}" class="play-icon-lg" onclick="App.handlePlay(event, ${item.id}); return false;">
                        <img src="${dlIcon}" class="action-icon" onclick="App.handleDl(event, ${item.id}); return false;" 
                             title="${item.allowDownload ? 'Descargar' : 'Descarga no disponible'}">
                    </div>
                    <div class="mobile-play-button" onclick="App.handlePlay(event, ${item.id}); return false;">
                        <img src="${ICONS.play}" alt="Play">
                    </div>
                </div>
                <div onclick="App.goToDetail('${item.detailUrl}')">
                    <h4 class="font-bold text-sm text-white truncate">${item.title}</h4>
                    <p class="text-xs text-gray-500 truncate">${item.author}</p>
                </div>
            </div>
        `;
    }

    function renderSeriesWidget(series, episodes, isInPlaylistFn, handlePlayFn, handleAddFn, handleDlFn, goToDetailFn) {
        const lastEpisode = episodes[0];
        const cover = series.portada_serie || episodes[0].cover;
        const author = episodes[0].author;
        const description = series.descripcion_serie || 'Sin descripción';
        const episodesHtml = episodes.map((ep, index) => {
            const inPlaylist = isInPlaylistFn(ep.mediaUrl);
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

    function renderEpisodeWidget(episode, isInPlaylistFn, handlePlayFn, handleAddFn, handleDlFn, goToDetailFn) {
        const series = episode.series;
        const inPlaylist = isInPlaylistFn(episode.mediaUrl);
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
                    <div class="program-card" onclick="App.goToDetail('${series.url_serie}')">
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

    // Exponer funciones públicas
    window.Homeshow = {
        ICONS,
        injectStyles,
        createStandardCard,
        createVideoExpand,
        createListItem,
        createCarousel,
        createSeriesCarousel,
        createGridCard,
        renderSeriesWidget,
        renderEpisodeWidget
    };
})();
