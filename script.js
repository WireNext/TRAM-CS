async function cargarDatosGTFS() {
  const baseURL = 'public/gtfs/';

  const [routes, trips, stops, stopTimes] = await Promise.all([
    fetch(baseURL + 'routes.json').then(r => r.json()),
    fetch(baseURL + 'trips.json').then(r => r.json()),
    fetch(baseURL + 'stops.json').then(r => r.json()),
    fetch(baseURL + 'stop_times.json').then(r => r.json())
  ]);

  iniciarInterfaz(routes, trips, stops, stopTimes);
}

function iniciarInterfaz(routes, trips, stops, stopTimes) {
  const selectLineas = document.getElementById('lineas');
  const listaHorarios = document.getElementById('resultados');

  // Rellenar select con rutas
  routes.forEach(route => {
    const option = document.createElement('option');
    option.value = route.route_id;
    option.textContent = `${route.route_short_name} - ${route.route_long_name}`;
    selectLineas.appendChild(option);
  });

  selectLineas.addEventListener('change', () => {
    const routeId = selectLineas.value;

    // Limpiar resultados anteriores
    listaHorarios.innerHTML = '';

    // Buscar los viajes de esa ruta
    const viajes = trips.filter(t => t.route_id === routeId);

    if (viajes.length === 0) {
      listaHorarios.innerHTML = '<li>No hay viajes disponibles para esta ruta.</li>';
      return;
    }

    // Solo usamos el primer viaje (como ejemplo simple)
    const viaje = viajes[0];
    const horarios = stopTimes
      .filter(st => st.trip_id === viaje.trip_id)
      .sort((a, b) => a.stop_sequence - b.stop_sequence);

    horarios.forEach(horario => {
      const parada = stops.find(s => s.stop_id === horario.stop_id);
      const li = document.createElement('li');
      li.textContent = `${parada.stop_name} → ${horario.departure_time}`;
      listaHorarios.appendChild(li);
    });
  });
}

// Iniciar al cargar
cargarDatosGTFS();
