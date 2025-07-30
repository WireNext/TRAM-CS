const map = L.map('map').setView([39.985, -0.05], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
}).addTo(map);

let stops = [];
let stopTimes = [];
let trips = [];

async function cargarDatos() {
  try {
    const [stopsData, stopTimesData, tripsData, shapesData] = await Promise.all([
      fetch("public/gtfs/stops.json").then(r => r.json()),
      fetch("public/gtfs/stop_times.json").then(r => r.json()),
      fetch("public/gtfs/trips.json").then(r => r.json()),
      fetch("public/gtfs/shapes.json").then(r => r.json())
    ]);

    stops = stopsData;
    stopTimes = stopTimesData;
    trips = tripsData;

    // Mostrar shapes como líneas
    for (const [shape_id, points] of Object.entries(shapesData)) {
      const latlngs = points.map(p => [p.lat, p.lon]);
      L.polyline(latlngs, {
        color: '#007bff',
        weight: 3,
        opacity: 0.7
      }).addTo(map);
    }

    // Añadir paradas
    stops.forEach(stop => {
      const marker = L.marker([parseFloat(stop.stop_lat), parseFloat(stop.stop_lon)])
        .addTo(map)
        .bindPopup("Cargando...");

      marker.on('click', () => {
        const arrivals = stopTimes
          .filter(st => st.stop_id === stop.stop_id)
          .slice(0, 5)
          .map(st => {
            const trip = trips.find(t => t.trip_id === st.trip_id);
            return `${trip?.route_id || "?"} → ${st.arrival_time}`;
          });

        const content = `
          <b>${stop.stop_name}</b><br>
          <b>Próximas llegadas:</b><br>
          <ul>${arrivals.map(a => `<li>${a}</li>`).join('')}</ul>
        `;

        marker.setPopupContent(content);
      });
    });

  } catch (err) {
    console.error("Error al cargar datos:", err);
  }
}

cargarDatos();
