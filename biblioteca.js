(function() {
    const module = {
        render(container) {
            container.innerHTML = `
                <div class="py-10 text-center">
                    <h1 class="text-4xl font-bold mb-4">Biblioteca</h1>
                    <p class="text-gray-400">Aquí irá el contenido de la biblioteca.</p>
                </div>
            `;
        }
    };
    // Registrar el módulo para que el router pueda cargarlo
    if (window.registerPage) window.registerPage('biblioteca.js', module);
})();
