const map = L.map('map').setView([39.985, -0.05], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
}).addTo(map);

let stops = [];
let stopTimes = [];
let trips = [];
let routeIdToShortName = {}; // <-- diccionario para mapear route_id a número de línea

async function cargarDatos() {
  try {
    const [stopsData, stopTimesData, tripsData, shapesData, routesData] = await Promise.all([
      fetch("public/gtfs/stops.json").then(r => r.json()),
      fetch("public/gtfs/stop_times.json").then(r => r.json()),
      fetch("public/gtfs/trips.json").then(r => r.json()),
      fetch("public/gtfs/shapes.json").then(r => r.json()),
      fetch("public/gtfs/routes.json").then(r => r.json())  // <-- cargamos routes
    ]);

    stops = stopsData;
    stopTimes = stopTimesData;
    trips = tripsData;

    // Crear el diccionario route_id -> route_short_name
    routesData.forEach(route => {
      routeIdToShortName[route.route_id] = route.route_short_name;
    });

    // Dibujar shapes
    for (const [shape_id, points] of Object.entries(shapesData)) {
      if (Array.isArray(points)) {
        const latlngs = points.map(p => [p.lat, p.lon]);
        L.polyline(latlngs, {
          color: '#007bff',
          weight: 3,
          opacity: 0.7
        }).addTo(map);
      } else {
        console.warn(`Los puntos para shape_id ${shape_id} no son un array`, points);
      }
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
            // En vez de trip.route_id mostramos el número de línea
            const linea = routeIdToShortName[trip?.route_id] || "?";
            return `${linea} → ${st.arrival_time}`;
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
