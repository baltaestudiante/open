window.render404 = function() {
    return `
        <div class="text-center py-20">
            <h1 class="text-4xl font-bold mb-4">404</h1>
            <p class="text-gray-400 text-lg mb-8">Este contenido no está disponible</p>
            <button onclick="App.navigate('/')" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full transition">Volver al inicio</button>
        </div>
    `;
};
