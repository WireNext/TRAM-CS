async function cargarDatosGTFS() {
  try {
    const baseURL = 'public/gtfs/';
    const [routes, trips, stops, stopTimes, calendarDates] = await Promise.all([
      fetch(baseURL + 'routes.json').then(r => r.json()),
      fetch(baseURL + 'trips.json').then(r => r.json()),
      fetch(baseURL + 'stops.json').then(r => r.json()),
      fetch(baseURL + 'stop_times.json').then(r => r.json()),
      fetch(baseURL + 'calendar_dates.json').then(r => r.json())
    ]);

    console.log("✅ Datos cargados");
    iniciarMapa(stops, stopTimes, trips, routes, calendarDates);

  } catch (e) {
    console.error("❌ Error cargando GTFS:", e);
    alert("Error cargando datos. Mira la consola.");
  }
}

function obtenerServiciosHoy(calendarDates) {
  const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return calendarDates
    .filter(cd => cd.date === hoy && cd.exception_type === '1')
    .map(cd => cd.service_id);
}

function iniciarMapa(stops, stopTimes, trips, routes, calendarDates) {
  const map = L.map('map').setView([39.5, -0.4], 9); // Comunitat Valenciana

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const serviciosHoy = obtenerServiciosHoy(calendarDates);

  stops.forEach(stop => {
    const marker = L.marker([stop.stop_lat, stop.stop_lon]).addTo(map);
    marker.bindPopup("Cargando...");

    marker.on('click', () => {
      const horarios = stopTimes
        .filter(st => st.stop_id === stop.stop_id)
        .map(st => {
          const trip = trips.find(t => t.trip_id === st.trip_id);
          if (!trip || !serviciosHoy.includes(trip.service_id)) return null;

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
          `<li><b>Línea ${h.linea}</b>: ${h.hora}</li>`
        ).join('') +
        `</ul>`;

      marker.setPopupContent(html);
    });
  });
}

cargarDatosGTFS();
