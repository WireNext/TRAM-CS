async function cargarDatosGTFS() {
  const baseURL = 'public/gtfs/';

  const [routes, trips, stops, stopTimes] = await Promise.all([
    fetch(baseURL + 'routes.json').then(r => r.json()),
    fetch(baseURL + 'trips.json').then(r => r.json()),
    fetch(baseURL + 'stops.json').then(r => r.json()),
    fetch(baseURL + 'stop_times.json').then(r => r.json())
  ]);

  iniciarBusquedaPorParada(routes, trips, stops, stopTimes);
}

function iniciarBusquedaPorParada(routes, trips, stops, stopTimes) {
  const selectParadas = document.getElementById('paradas');
  const lista = document.getElementById('resultados');

  // Ordenar alfabéticamente por nombre de parada
  stops.sort((a, b) => a.stop_name.localeCompare(b.stop_name));

  stops.forEach(stop => {
    const option = document.createElement('option');
    option.value = stop.stop_id;
    option.textContent = stop.stop_name;
    selectParadas.appendChild(option);
  });

  selectParadas.addEventListener('change', () => {
    const stopId = selectParadas.value;
    lista.innerHTML = '';

    // Buscar todas las entradas de stop_times para esta parada
    const horarios = stopTimes.filter(st => st.stop_id === stopId);

    if (horarios.length === 0) {
      lista.innerHTML = '<li>No hay horarios para esta parada.</li>';
      return;
    }

    horarios.sort((a, b) => a.departure_time.localeCompare(b.departure_time));

    horarios.forEach(horario => {
      const trip = trips.find(t => t.trip_id === horario.trip_id);
      if (!trip) return;

      const ruta = routes.find(r => r.route_id === trip.route_id);
      if (!ruta) return;

      const texto = `${horario.departure_time} - Línea ${ruta.route_short_name || ''} ${ruta.route_long_name || ''}`;
      const li = document.createElement('li');
      li.textContent = texto;
      lista.appendChild(li);
    });
  });
}

cargarDatosGTFS();
