import zipfile
import requests
import csv
import json
import os

url = "https://gvinterbus.gva.es/estatico/gtfs.zip"
r = requests.get(url)
with open("gtfs.zip", "wb") as f:
    f.write(r.content)

with zipfile.ZipFile("gtfs.zip", 'r') as zip_ref:
    zip_ref.extractall("gtfs")

os.makedirs("public/gtfs", exist_ok=True)

archivos = [
    "routes.txt",
    "trips.txt",
    "stops.txt",
    "stop_times.txt",
    "calendar.txt"
]

for archivo in archivos:
    ruta = os.path.join("gtfs", archivo)
    with open(ruta, newline='', encoding="utf-8") as f:
        reader = csv.DictReader(f)
        datos = list(reader)
        salida = archivo.replace(".txt", ".json")
        with open(f"public/gtfs/{salida}", "w", encoding="utf-8") as out:
            json.dump(datos, out, ensure_ascii=False, indent=2)
