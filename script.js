async function cargarDatosGTFS() {
  const baseURL = 'public/gtfs/';

  const [routes, trips, stops, stopTimes, calendarDates] = await Promise.all([
    fetch(baseURL + 'routes.json').then(r => r.json()),
    fetch(baseURL + 'trips.json').then(r => r.json()),
    fetch(baseURL + 'stops.json').then(r => r.json()),
    fetch(baseURL + 'stop_times.json').then(r => r.json()),
    fetch(baseURL + 'calendar_dates.json').then(r => r.json())
  ]);

  const serviciosHoy = filtrarServiciosActivosHoy(calendarDates);
  const viajesHoy = trips.filter(t => serviciosHoy.includes(t.service_id));

  iniciarInterfaz(routes, viajesHoy, stops, stopTimes);
}

function filtrarServiciosActivosHoy(calendarDates) {
  const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  return calendarDates
    .filter(cd => cd.date === hoy && cd.exception_type === '1')
    .map(cd => cd.service_id);
}

function iniciarInterfaz(routes, trips, stops, stopTimes) {
  const selectLineas = document.getElementById('lineas');
  const listaHorarios = document.getElementById('resultados');

  const routeIdsDisponibles = [...new Set(trips.map(t => t.route_id))];
  const rutasDisponibles = routes.filter(r => routeIdsDisponibles.includes(r.route_id));

  rutasDisponibles.forEach(route => {
    const option = document.createElement('option');
    option.value = route.route_id;
    option.textContent = `${route.route_short_name} - ${route.route_long_name}`;
    selectLineas.appendChild(option);
  });

  selectLineas.addEventListener('change', () => {
    const routeId = selectLineas.value;
    listaHorarios.innerHTML = '';

    const viajesRuta = trips.filter(t => t.route_id === routeId);
    if (viajesRuta.length === 0) {
      listaHorarios.innerHTML = '<li>No hay viajes activos para hoy.</li>';
      return;
    }

    const trip = viajesRuta[0]; // puedes extenderlo para mostrar todos
    const horarios = stopTimes
      .filter(st => st.trip_id === trip.trip_id)
      .sort((a, b) => a.stop_sequence - b.stop_sequence);

    horarios.forEach(horario => {
      const parada = stops.find(s => s.stop_id === horario.stop_id);
      const li = document.createElement('li');
      li.textContent = `${parada.stop_name} → ${horario.departure_time}`;
      listaHorarios.appendChild(li);
    });
  });
}
