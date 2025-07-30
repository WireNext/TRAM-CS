import zipfile
import requests
import csv
import json
import os
from collections import defaultdict

# 1. Descargar el GTFS
url = "https://gvinterbus.gva.es/estatico/gtfs.zip"
print("📦 Descargando GTFS...")
r = requests.get(url)
with open("gtfs.zip", "wb") as f:
    f.write(r.content)

# 2. Extraer archivos
print("📂 Extrayendo archivos...")
with zipfile.ZipFile("gtfs.zip", 'r') as zip_ref:
    zip_ref.extractall("gtfs")

# 3. Crear carpeta de salida
os.makedirs("public/gtfs", exist_ok=True)

# 4. Filtrar rutas deseadas
rutas_deseadas = {"T1", "T2", "T3", "T4"}
with open("gtfs/routes.txt", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    routes_filtradas = [row for row in reader if row["route_short_name"] in rutas_deseadas]
    route_ids = {row["route_id"] for row in routes_filtradas}

# 5. Filtrar trips por route_id
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

# 6. Filtrar stop_times por trip_id
stop_ids = set()
with open("gtfs/stop_times.txt", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    stop_times_filtrados = []
    for row in reader:
        if row["trip_id"] in trip_ids:
            stop_times_filtrados.append(row)
            stop_ids.add(row["stop_id"])

# 7. Filtrar stops por stop_id
with open("gtfs/stops.txt", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    stops_filtrados = [row for row in reader if row["stop_id"] in stop_ids]

# 8. Filtrar y agrupar shapes por shape_id
with open("gtfs/shapes.txt", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    shapes_filtrados = [row for row in reader if row["shape_id"] in shape_ids]

# Ordenar por secuencia
shapes_filtrados.sort(key=lambda x: (x["shape_id"], int(x["shape_pt_sequence"])))

# Agrupar en JSON plano
shapes_dict = defaultdict(list)
for punto in shapes_filtrados:
    shape_id = punto["shape_id"]
    shapes_dict[shape_id].append({
        "shape_pt_lat": punto["shape_pt_lat"],
        "shape_pt_lon": punto["shape_pt_lon"],
        "shape_pt_sequence": punto["shape_pt_sequence"],
        "shape_dist_traveled": punto["shape_dist_traveled"]
    })

# 9. Guardar archivos
def guardar(nombre, datos):
    with open(f"public/gtfs/{nombre}.json", "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)
    print(f"✅ Guardado {nombre}.json")

guardar("routes", routes_filtradas)
guardar("trips", trips_filtrados)
guardar("stop_times", stop_times_filtrados)
guardar("stops", stops_filtrados)

# Guardar shapes.json
with open("public/gtfs/shapes.json", "w", encoding="utf-8") as f:
    json.dump(shapes_dict, f, ensure_ascii=False, indent=2)
print("✅ Guardado shapes.json")
