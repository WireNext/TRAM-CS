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
    iniciarMapa(stops, stopTimes, trips, routes, shapes);

  } catch (e) {
    console.error("❌ Error cargando GTFS:", e);
    alert("Error cargando datos. Mira la consola.");
  }
}

function iniciarMapa(stops, stopTimes, trips, routes, shapes) {
  const map = L.map('map').setView([39.985, -0.5], 13); // Vista general Castelló

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Icono personalizado para paradas
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

  // Añadir marcadores de paradas con clustering
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

      function horaAFecha(horaStr) {
        const [hh, mm, ss] = horaStr.split(':').map(Number);
        const fecha = new Date(ahora);
        fecha.setHours(hh, mm, ss, 0);
        return fecha;
      }

      const siguientes = horarios
        .map(h => {
          const fechaSalida = horaAFecha(h.hora);
          let diffMin = (fechaSalida - ahora) / 60000;
          if (diffMin < 0) diffMin += 24 * 60; // Para horarios que cruzan la medianoche
          return { ...h, diffMin };
        })
        .filter(h => h.diffMin >= 0)
        .sort((a, b) => a.diffMin - b.diffMin)
        .slice(0, 2);

      if (siguientes.length === 0) {
        marker.setPopupContent(`<strong>${stop.stop_name}</strong><br>No hay más servicios hoy.`);
        return;
      }

      const html = `<strong>${stop.stop_name}</strong><br><ul>` +
        siguientes.map(h =>
          `<li><b>${h.linea}</b> ${h.nombre}: en ${Math.round(h.diffMin)} min</li>`
        ).join('') +
        `</ul>`;

      marker.setPopupContent(html);
    });

    clusterGroup.addLayer(marker);
  });

  map.addLayer(clusterGroup);

  // Dibujar shapes (líneas de ruta)
  // Agrupar puntos por shape_id y ordenarlos por shape_pt_sequence
  const shapesPorId = {};
  shapes.forEach(pt => {
    if (!shapesPorId[pt.shape_id]) shapesPorId[pt.shape_id] = [];
    shapesPorId[pt.shape_id].push(pt);
  });

  for (const shapeId in shapesPorId) {
    // Ordenar por sequence
    shapesPorId[shapeId].sort((a, b) => parseInt(a.shape_pt_sequence) - parseInt(b.shape_pt_sequence));

    // Crear array de latlngs para la polilínea
    const latlngs = shapesPorId[shapeId].map(pt => [parseFloat(pt.shape_pt_lat), parseFloat(pt.shape_pt_lon)]);

    // Añadir la línea al mapa
    L.polyline(latlngs, {
      color: 'blue',
      weight: 3,
      opacity: 0.7
    }).addTo(map);
  }
}

cargarDatosGTFS();
