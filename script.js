const map = L.map('map').setView([39.9864, -0.0513], 13); // Castellón

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Icono para paradas
const paradaIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/252/252025.png',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24]
});

// Cargar datos GTFS
let stops = [];
let stopTimes = [];
let trips = [];

Promise.all([
  fetch("public/gtfs/stops.json").then(r => r.json()),
  fetch("public/gtfs/stop_times.json").then(r => r.json()),
  fetch("public/gtfs/trips.json").then(r => r.json()),
  fetch("public/gtfs/shapes.geojson").then(r => r.json())
]).then(([stopsData, stopTimesData, tripsData, shapesGeoJSON]) => {
  stops = stopsData;
  stopTimes = stopTimesData;
  trips = tripsData;

  // Mostrar paradas
  stops.forEach(stop => {
    const marker = L.marker([parseFloat(stop.stop_lat), parseFloat(stop.stop_lon)], { icon: paradaIcon })
      .addTo(map)
      .bindPopup("Cargando...");

    marker.on('click', () => {
      const stopId = stop.stop_id;

      // Obtener próximos horarios (solo los próximos 5)
      const ahora = new Date();
      const horarios = stopTimes
        .filter(st => st.stop_id === stopId)
        .map(st => {
          const trip = trips.find(t => t.trip_id === st.trip_id);
          return {
            time: st.arrival_time,
            route: trip ? trip.route_id : "Desconocida"
          };
        })
        .filter(h => {
          // Solo horarios futuros
          const [h, m, s] = h.time.split(":").map(Number);
          const horarioDate = new Date();
          horarioDate.setHours(h, m, s || 0, 0);
          return horarioDate > ahora;
        })
        .sort((a, b) => a.time.localeCompare(b.time))
        .slice(0, 5);

      let html = `<b>${stop.stop_name}</b><br>`;
      if (horarios.length > 0) {
        html += "<b>Próximas llegadas:</b><ul>";
        horarios.forEach(h => {
          html += `<li>${h.time} - Ruta ${h.route}</li>`;
        });
        html += "</ul>";
      } else {
        html += "No hay llegadas próximas.";
      }

      marker.getPopup().setContent(html).openOn(map);
    });
  });

  // Mostrar shapes
  L.geoJSON(shapesGeoJSON, {
    style: {
      color: '#007bff',
      weight: 3
    }
  }).addTo(map);
}).catch(console.error);
