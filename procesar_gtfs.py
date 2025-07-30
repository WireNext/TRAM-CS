const map = L.map('map').setView([39.4699, -0.3763], 12); // Centrado en Valencia

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Icono personalizado para las paradas
const stopIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/685/685655.png',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -10]
});

// Cargar todos los datos necesarios
Promise.all([
  fetch("public/gtfs/stops.json").then(res => res.json()),
  fetch("public/gtfs/stop_times.json").then(res => res.json()),
  fetch("public/gtfs/trips.json").then(res => res.json()),
  fetch("public/gtfs/routes.json").then(res => res.json()),
  fetch("public/gtfs/shapes.geojson").then(res => res.json())
]).then(([stops, stopTimes, trips, routes, shapesGeoJSON]) => {

  // Crear índice: stop_id -> trip_ids
  const stopToTrips = {};
  stopTimes.forEach(st => {
    if (!stopToTrips[st.stop_id]) stopToTrips[st.stop_id] = new Set();
    stopToTrips[st.stop_id].add(st.trip_id);
  });

  // Crear índice: trip_id -> shape_id y route_id
  const tripToShape = {};
  const tripToRoute = {};
  trips.forEach(trip => {
    tripToShape[trip.trip_id] = trip.shape_id;
    tripToRoute[trip.trip_id] = trip.route_id;
  });

  // Crear índice: shape_id -> feature (línea del mapa)
  const shapeFeatures = {};
  shapesGeoJSON.features.forEach(f => {
    shapeFeatures[f.properties.shape_id] = f;
  });

  // Añadir las paradas al mapa
  stops.forEach(stop => {
    const marker = L.marker([stop.stop_lat, stop.stop_lon], { icon: stopIcon })
      .bindPopup(`<strong>${stop.stop_name}</strong><br>Click para ver recorridos`)
      .addTo(map);

    marker.on('click', () => {
      // Eliminar capas anteriores si las hubiera
      if (window.shapeLayers) {
        window.shapeLayers.forEach(layer => map.removeLayer(layer));
      }
      window.shapeLayers = [];

      const tripIds = stopToTrips[stop.stop_id];
      const shapeIds = new Set();

      // Obtener shape_ids que pasan por esta parada
      tripIds.forEach(trip_id => {
        const shape_id = tripToShape[trip_id];
        if (shape_id) shapeIds.add(shape_id);
      });

      // Mostrar en el mapa los shapes asociados
      shapeIds.forEach(shape_id => {
        const feature = shapeFeatures[shape_id];
        if (!feature) return;

        const layer = L.geoJSON(feature, {
          style: {
            color: feature.properties.color,
            weight: 4
          }
        }).addTo(map);

        window.shapeLayers.push(layer);
      });
    });
  });
});
