const map = L.map('map').setView([39.9864, -0.0513], 13); // Centrado en Castellón

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Icono personalizado para paradas
const paradaIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/252/252025.png',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24]
});

let stops = [];
let stopTimes = [];
let trips = [];
let routes = [];
let shapesGeoJSON = null;

// Cargar todos los datos necesarios
Promise.all([
  fetch('public/gtfs/stops.json').then(res => res.json()),
  fetch('public/gtfs/stop_times.json').then(res => res.json()),
  fetch('public/gtfs/trips.json').then(res => res.json()),
  fetch('public/gtfs/routes.json').then(res => res.json()),
  fetch('public/gtfs/shapes.geojson').then(res => res.json())
]).then(([stopsData, stopTimesData, tripsData, routesData, shapesData]) => {
  stops = stopsData;
  stopTimes = stopTimesData;
  trips = tripsData;
  routes = routesData;
  shapesGeoJSON = shapesData;

  // Pintar paradas
  stops.forEach(stop => {
    const marker = L.marker([parseFloat(stop.stop_lat), parseFloat(stop.stop_lon)], { icon: paradaIcon }).addTo(map);

    marker.on('click', () => {
      const stopId = stop.stop_id;
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
        .filter(item => {
          const [hH, hM, hS] = item.time.split(":").map(Number);
          const horaLlegada = new Date();
          horaLlegada.setHours(hH, hM, hS || 0, 0);
          return horaLlegada > ahora;
        })
        .sort((a, b) => a.time.localeCompare(b.time))
        .slice(0, 5);

      let html = `<b>${stop.stop_name}</b><br><u>Próximas llegadas:</u><ul>`;
      horarios.forEach(el => {
        html += `<li>${el.time} - Ruta ${el.route}</li>`;
      });
      html += '</ul>';

      marker.bindPopup(html).openPopup();

      // Mostrar las líneas (shapes) asociadas a las rutas
      const routeIdsEnParada = new Set(horarios.map(el => el.route));

      if (window.shapeLayer) {
        map.removeLayer(window.shapeLayer);
      }

      const colores = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4'];

      window.shapeLayer = L.geoJSON(shapesGeoJSON, {
        filter: feature => routeIdsEnParada.has(feature.properties.route_id),
        style: feature => {
          const index = Array.from(routeIdsEnParada).indexOf(feature.properties.route_id);
          return {
            color: colores[index % colores.length],
            weight: 4
          };
        },
        onEachFeature: (feature, layer) => {
          const route = routes.find(r => r.route_id === feature.properties.route_id);
          if (route) {
            layer.bindPopup(`<b>${route.route_short_name}</b><br>${route.route_long_name}`);
          }
        }
      }).addTo(map);
    });
  });
}).catch(error => {
  console.error("Error al cargar datos:", error);
});
