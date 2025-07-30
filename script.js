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

// Cargar paradas
fetch('public/gtfs/stops.json')
  .then(res => res.json())
  .then(data => {
    data.forEach(stop => {
      L.marker([parseFloat(stop.stop_lat), parseFloat(stop.stop_lon)], { icon: paradaIcon })
        .addTo(map)
        .bindPopup(`<b>${stop.stop_name}</b>`);
    });
  })
  .catch(err => console.error("Error cargando paradas:", err));

// Cargar shapes (líneas)
fetch('public/gtfs/shapes.geojson')
  .then(res => res.json())
  .then(geojson => {
    L.geoJSON(geojson, {
      style: {
        color: '#3388ff',
        weight: 4
      },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(`Shape ID: ${feature.properties.shape_id}`);
      }
    }).addTo(map);
  })
  .catch(err => console.error("Error cargando shapes:", err));
