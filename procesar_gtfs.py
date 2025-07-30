import zipfile
import requests
import csv
import json
import os
from datetime import datetime

url = "https://gvinterbus.gva.es/estatico/gtfs.zip"

print("Descargando GTFS...")
r = requests.get(url)
with open("gtfs.zip", "wb") as f:
    f.write(r.content)

print("Extrayendo archivos...")
with zipfile.ZipFile("gtfs.zip", 'r') as zip_ref:
    zip_ref.extractall("gtfs")

os.makedirs("public/gtfs", exist_ok=True)

archivos = [
    "routes.txt",
    "trips.txt",
    "stops.txt",
    "stop_times.txt",
    "calendar_dates.txt",
    "shapes.txt"
]

# Cargar datos de trips y calendar_dates antes de convertir a JSON
trips = []
calendar_dates = []

for archivo in archivos:
    ruta = os.path.join("gtfs", archivo)

    if not os.path.exists(ruta):
        print(f"⚠️ No se encontró {archivo}, se omite.")
        continue

    with open(ruta, newline='', encoding="utf-8") as f:
        reader = csv.DictReader(f)
        datos = list(reader)

        if archivo == "trips.txt":
            trips = datos
        elif archivo == "calendar_dates.txt":
            calendar_dates = datos

# Fecha actual para filtrar servicios activos
hoy = datetime.now().strftime("%Y%m%d")

# Obtener servicios activos hoy (exception_type == '1' indica activo)
servicios_activos = {cd['service_id'] for cd in calendar_dates if cd['date'] == hoy and cd['exception_type'] == '1'}
print(f"Servicios activos hoy: {len(servicios_activos)}")

# Filtrar trips activos
trips_activos = [trip for trip in trips if trip['service_id'] in servicios_activos]
print(f"Trips activos hoy: {len(trips_activos)}")

# Obtener shape_ids usados en trips activos
shape_ids_usados = {trip['shape_id'] for trip in trips_activos if trip['shape_id']}
print(f"Shapes usados en trips activos: {len(shape_ids_usados)}")

# Ahora procesar todos los archivos y guardarlos, pero shapes.txt filtrado
for archivo in archivos:
    ruta = os.path.join("gtfs", archivo)

    if not os.path.exists(ruta):
        continue

    with open(ruta, newline='', encoding="utf-8") as f:
        reader = csv.DictReader(f)
        datos = list(reader)

        if archivo == "shapes.txt":
            # Ordenar por shape_id y shape_pt_sequence
            datos.sort(key=lambda x: (x['shape_id'], int(x['shape_pt_sequence'])))
            # Filtrar solo shapes usados
            datos = [d for d in datos if d['shape_id'] in shape_ids_usados]

        salida = archivo.replace(".txt", ".json")
        salida_path = os.path.join("public/gtfs", salida)

        with open(salida_path, "w", encoding="utf-8") as out:
            json.dump(datos, out, ensure_ascii=False, indent=2)

        print(f"✅ Procesado: {archivo} → {salida_path}")
