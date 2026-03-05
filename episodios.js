// Este es solo un ejemplo. Reemplaza con tu archivo real.
window.processEpisodes = function() {
    return [
        {
            id: 1,
            title: "Derecho de los Pueblos Indígenas",
            author: "Dr. Juan Pérez",
            cover: "https://via.placeholder.com/300",
            mediaUrl: "https://example.com/audio.mp3",
            type: "audio",
            detailUrl: "/dp-indigenas",
            categories: ["Derecho"],
            description: "Análisis profundo sobre los derechos de los pueblos originarios.",
            date: "2025-01-15",
            allowDownload: true,
            series: {
                titulo_serie: "Derecho Indígena",
                url_serie: "/serie-derecho-indigena",
                portada_serie: "https://via.placeholder.com/300",
                descripcion_serie: "Serie completa sobre derecho indígena."
            }
        },
        {
            id: 2,
            title: "Introducción a la Astrofísica",
            author: "Dra. Laura Gómez",
            cover: "https://via.placeholder.com/300",
            mediaUrl: "https://example.com/video.mp4",
            type: "video",
            detailUrl: "/astrofisica",
            categories: ["Física y Astronomía"],
            description: "Conceptos básicos de astrofísica.",
            date: "2025-02-10",
            allowDownload: false
        }
    ];
};
