const map = L.map("map").setView([39.985, -0.05], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

async function cargarDatosGTFS() {
  try {
    const [routes, stops, stopTimes, trips, shapes] = await Promise.all([
      fetch("gtfs/routes.json").then(res => res.json()),
      fetch("gtfs/stops.json").then(res => res.json()),
      fetch("gtfs/stop_times.json").then(res => res.json()),
      fetch("gtfs/trips.json").then(res => res.json()),
      fetch("gtfs/shapes.json").then(res => res.json())
    ]);
    iniciarMapa(routes, stops, stopTimes, trips, shapes);
  } catch (error) {
    console.error("❌ Error cargando GTFS:", error);
  }
}

function iniciarMapa(routes, stops, stopTimes, trips, shapes) {
  const tripsPorStop = {};
  stopTimes.forEach(st => {
    if (!tripsPorStop[st.stop_id]) tripsPorStop[st.stop_id] = [];
    tripsPorStop[st.stop_id].push(st);
  });

  const tripPorId = Object.fromEntries(trips.map(t => [t.trip_id, t]));
  const routePorId = Object.fromEntries(routes.map(r => [r.route_id, r]));

  // Añadir paradas
  stops.forEach(stop => {
    const lat = parseFloat(stop.stop_lat);
    const lon = parseFloat(stop.stop_lon);
    const marker = L.marker([lat, lon]).addTo(map);

    const stop_id = stop.stop_id;
    const entradas = tripsPorStop[stop_id] || [];

    const ahora = new Date();
    const ahoraSegundos = ahora.getHours() * 3600 + ahora.getMinutes() * 60 + ahora.getSeconds();

    const futuros = entradas
      .map(e => {
        const [h, m, s] = e.arrival_time.split(":").map(Number);
        const t = h * 3600 + m * 60 + s;
        return { ...e, segundos: t };
      })
      .filter(e => e.segundos >= ahoraSegundos)
      .sort((a, b) => a.segundos - b.segundos);

    const siguientes = futuros.slice(0, 5);
    let html = `<b>${stop.stop_name}</b><br>`;
    siguientes.forEach((e, i) => {
      const trip = tripPorId[e.trip_id];
      const route = routePorId[trip.route_id];
      const minutos = Math.floor((e.segundos - ahoraSegundos) / 60);
      const hora = new Date();
      hora.setHours(0, 0, 0, 0);
      hora.setSeconds(e.segundos);
      const horaStr = hora.toTimeString().slice(0, 5);

      if (i < 2) {
        const clase = minutos <= 2 ? "parpadeo" : "";
        html += `<span class="${clase}">En ${minutos} min (${route.route_short_name})</span><br>`;
      } else {
        html += `A las ${horaStr} (${route.route_short_name})<br>`;
      }
    });

    marker.bindPopup(html);
  });

  // Añadir shapes
  Object.entries(shapes).forEach(([shape_id, puntos]) => {
    const coords = puntos.map(p => [parseFloat(p.shape_pt_lat), parseFloat(p.shape_pt_lon)]);
    const polyline = L.polyline(coords, {
      color: "#007bff",
      weight: 3,
      opacity: 0.6
    }).addTo(map);
    polyline.bindPopup(`Shape: ${shape_id}`);
  });
}

// Estilo parpadeo
const style = document.createElement("style");
style.innerHTML = `
.parpadeo {
  animation: parpadear 1s infinite;
  font-weight: bold;
  color: red;
}
@keyframes parpadear {
  0% { opacity: 1; }
  50% { opacity: 0; }
  100% { opacity: 1; }
}`;
document.head.appendChild(style);

// Iniciar
cargarDatosGTFS();
