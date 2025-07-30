const map = L.map('map').setView([39.9864, -0.0513], 13); // Castellón

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Icono de parada
const paradaIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/252/252025.png',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24]
});

let stops = [], stopTimes = [], trips = [], routes = [], shapes = null;

Promise.all([
  fetch('public/gtfs/stops.json').then(r => r.json()),
  fetch('public/gtfs/stop_times.json').then(r => r.json()),
  fetch('public/gtfs/trips.json').then(r => r.json()),
  fetch('public/gtfs/routes.json').then(r => r.json()),
  fetch('public/gtfs/shapes.geojson').then(r => r.json())
]).then(([st, stt, tr, ro, sh]) => {
  stops = st;
  stopTimes = stt;
  trips = tr;
  routes = ro;
  shapes = sh;

  stops.forEach(stop => {
    const marker = L.marker([+stop.stop_lat, +stop.stop_lon], { icon: paradaIcon }).addTo(map);

    marker.on('click', () => {
      const ahora = new Date();
      const llegadas = stopTimes
        .filter(st => st.stop_id === stop.stop_id)
        .map(st => {
          const trip = trips.find(t => t.trip_id === st.trip_id);
          return {
            hora: st.arrival_time,
            route_id: trip?.route_id
          };
        })
        .filter(e => {
          const [h, m, s] = e.hora.split(":").map(Number);
          const llegada = new Date();
          llegada.setHours(h, m, s || 0);
          return llegada > ahora;
        })
        .sort((a, b) => a.hora.localeCompare(b.hora))
        .slice(0, 5);

      let html = `<b>${stop.stop_name}</b><br><u>Próximas llegadas:</u><ul>`;
      llegadas.forEach(l => {
        const ruta = routes.find(r => r.route_id === l.route_id);
        html += `<li>${l.hora} - ${ruta?.route_short_name || "?"}</li>`;
      });
      html += '</ul>';

      marker.bindPopup(html).openPopup();

      // Dibujar rutas
      const routesToDraw = new Set(llegadas.map(l => l.route_id));
      if (window.shapesLayer) map.removeLayer(window.shapesLayer);

      window.shapesLayer = L.geoJSON(shapes, {
        filter: f => routesToDraw.has(f.properties.route_id),
        style: {
          color: "#ff5733",
          weight: 4
        }
      }).addTo(map);
    });
  });
}).catch(err => console.error("Error cargando datos:", err));
