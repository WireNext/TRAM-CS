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

function pintarShapes(map, shapes) {
  // Agrupar puntos por shape_id
  const shapesGrouped = {};

  shapes.forEach(pt => {
    if (!shapesGrouped[pt.shape_id]) {
      shapesGrouped[pt.shape_id] = [];
    }
    shapesGrouped[pt.shape_id].push(pt);
  });

  const allLatLngs = [];

  // Crear una polilínea para cada shape_id
  for (const shape_id in shapesGrouped) {
    const points = shapesGrouped[shape_id];
    points.sort((a, b) => Number(a.shape_pt_sequence) - Number(b.shape_pt_sequence));

    const latlngs = points.map(p => {
      const lat = parseFloat(p.shape_pt_lat);
      const lon = parseFloat(p.shape_pt_lon);
      allLatLngs.push([lat, lon]);
      return [lat, lon];
    });

    L.polyline(latlngs, {
      color: '#007bff',
      weight: 3,
      opacity: 0.7
    }).addTo(map);
  }

  // Ajustar la vista para que se vean todas las shapes
  if (allLatLngs.length > 0) {
    const bounds = L.latLngBounds(allLatLngs);
    map.fitBounds(bounds);
  }
}

function iniciarMapa(stops, stopTimes, trips, routes, shapes) {
  const map = L.map('map').setView([39.985, -0.5], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Pintar las líneas shapes
  pintarShapes(map, shapes);

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
