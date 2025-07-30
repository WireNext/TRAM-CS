async function cargarDatosGTFS() {
  try {
    const baseURL = 'public/gtfs/';
    const [routes, trips, stops, stopTimes, calendarDates, shapes] = await Promise.all([
      fetch(baseURL + 'routes.json').then(r => r.json()),
      fetch(baseURL + 'trips.json').then(r => r.json()),
      fetch(baseURL + 'stops.json').then(r => r.json()),
      fetch(baseURL + 'stop_times.json').then(r => r.json()),
      fetch(baseURL + 'calendar_dates.json').then(r => r.json()),
      fetch(baseURL + 'shapes.json').then(r => r.json())

    ]);

    console.log("✅ Datos cargados");
    iniciarMapa(stops, stopTimes, trips, routes);

  } catch (e) {
    console.error("❌ Error cargando GTFS:", e);
    alert("Error cargando datos. Mira la consola.");
  }
}

function iniciarMapa(stops, stopTimes, trips, routes) {
  const map = L.map('map').setView([39.985, -0.5], 13); // Vista general Castelló

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Creamos el icono personalizado con un círculo y emoji bus
  const busDivIcon = L.divIcon({
    html: `<div style="
      background: #0078A8; 
      border-radius: 50%; 
      width: 30px; 
      height: 30px; 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      color: white; 
      font-weight: bold;
      font-size: 18px;
      ">
      🚌
      </div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });

  const clusterGroup = L.markerClusterGroup();

  stops.forEach(stop => {
    const marker = L.marker([stop.stop_lat, stop.stop_lon], { icon: busDivIcon });
    marker.bindPopup("Cargando...");

    marker.on('click', () => {
      const horarios = stopTimes
        .filter(st => st.stop_id === stop.stop_id)
        .map(st => {
          const trip = trips.find(t => t.trip_id === st.trip_id);
          if (!trip) return null;

          const ruta = routes.find(r => r.route_id === trip.route_id);
          if (!ruta) return null;

          return {
            linea: ruta.route_short_name || '',
            nombre: ruta.route_long_name || '',
            hora: st.departure_time
          };
        })
        .filter(h => h !== null)
        .sort((a, b) => a.hora.localeCompare(b.hora));

      const ahora = new Date();
      const horaActual = ahora.getHours().toString().padStart(2, '0') + ':' +
                         ahora.getMinutes().toString().padStart(2, '0') + ':00';

      const siguientes = horarios.filter(h => h.hora >= horaActual).slice(0, 5);

      if (siguientes.length === 0) {
        marker.setPopupContent(`<strong>${stop.stop_name}</strong><br>No hay más servicios hoy.`);
        return;
      }

      const html = `<strong>${stop.stop_name}</strong><br><ul>` +
        siguientes.map(h =>
          `<li><b>${h.linea}</b> ${h.nombre}: ${h.hora}</li>`
        ).join('') +
        `</ul>`;

      marker.setPopupContent(html);
    });

    clusterGroup.addLayer(marker);
  });

  map.addLayer(clusterGroup);
}

cargarDatosGTFS();
