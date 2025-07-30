import zipfile
import requests
import csv
import json
import os
from collections import defaultdict

url = "https://gvinterbus.gva.es/estatico/gtfs.zip"

print("📦 Descargando GTFS...")
r = requests.get(url)
with open("gtfs.zip", "wb") as f:
    f.write(r.content)

print("📂 Extrayendo archivos...")
with zipfile.ZipFile("gtfs.zip", 'r') as zip_ref:
    zip_ref.extractall("gtfs")

os.makedirs("public/gtfs", exist_ok=True)

# 1. Filtrar route_id de T1 a T4
rutas_deseadas = {"T1", "T2", "T3", "T4"}
route_ids = set()
with open("gtfs/routes.txt", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    routes_filtradas = [row for row in reader if row["route_short_name"] in rutas_deseadas]
    route_ids = {row["route_id"] for row in routes_filtradas}

# 2. Filtrar trips por route_id
trip_ids = set()
shape_ids = set()
with open("gtfs/trips.txt", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    trips_filtrados = []
    for row in reader:
        if row["route_id"] in route_ids:
            trips_filtrados.append(row)
            trip_ids.add(row["trip_id"])
            shape_ids.add(row["shape_id"])

# 3. Filtrar stop_times por trip_id
stop_ids = set()
with open("gtfs/stop_times.txt", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    stop_times_filtrados = []
    for row in reader:
        if row["trip_id"] in trip_ids:
            stop_times_filtrados.append(row)
            stop_ids.add(row["stop_id"])

# 4. Filtrar stops por stop_id
with open("gtfs/stops.txt", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    stops_filtrados = [row for row in reader if row["stop_id"] in stop_ids]

# 5. Filtrar shapes por shape_id y organizar como JSON
shapes_json = defaultdict(list)
with open("gtfs/shapes.txt", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row["shape_id"] in shape_ids:
            shapes_json[row["shape_id"]].append({
                "shape_pt_lat": row["shape_pt_lat"],
                "shape_pt_lon": row["shape_pt_lon"],
                "shape_pt_sequence": row["shape_pt_sequence"],
                "shape_dist_traveled": row["shape_dist_traveled"]
            })

# Ordenar por secuencia
for puntos in shapes_json.values():
    puntos.sort(key=lambda p: int(p["shape_pt_sequence"]))

# 6. Guardar resultados
def guardar(nombre, datos):
    with open(f"public/gtfs/{nombre}.json", "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)
    print(f"✅ Guardado {nombre}.json")

guardar("routes", routes_filtradas)
guardar("trips", trips_filtrados)
guardar("stop_times", stop_times_filtrados)
guardar("stops", stops_filtrados)
guardar("shapes", shapes_json)
