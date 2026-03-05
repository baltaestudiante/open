(function() {
    const module = {
        render(container) {
            container.innerHTML = `
                <div class="text-center py-20">
                    <h1 class="text-6xl font-bold text-white mb-4">404</h1>
                    <p class="text-xl text-gray-400 mb-8">La página que buscas no existe.</p>
                    <a href="/" class="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition">Volver al inicio</a>
                </div>
            `;
        }
    };
    if (window.registerPage) window.registerPage('404.js', module);
})();
