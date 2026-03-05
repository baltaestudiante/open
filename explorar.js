(function() {
    const module = {
        render(container) {
            container.innerHTML = `
                <div class="py-10 text-center">
                    <h1 class="text-4xl font-bold mb-4">Explorar</h1>
                    <p class="text-gray-400">Contenido de exploración.</p>
                </div>
            `;
        }
    };
    if (window.registerPage) window.registerPage('explorar.js', module);
})();
