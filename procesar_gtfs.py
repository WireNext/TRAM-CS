import zipfile
import requests
import csv
import json
import os

# URL del GTFS
url = "https://gvinterbus.gva.es/estatico/gtfs.zip"

# Descargar el archivo ZIP
print("Descargando GTFS...")
r = requests.get(url)
with open("gtfs.zip", "wb") as f:
    f.write(r.content)

# Extraer el ZIP
print("Extrayendo archivos...")
with zipfile.ZipFile("gtfs.zip", 'r') as zip_ref:
    zip_ref.extractall("gtfs")

# Crear carpeta de salida
os.makedirs("public/gtfs", exist_ok=True)

# Archivos que vamos a procesar
archivos = [
    "routes.txt",
    "trips.txt",
    "stops.txt",
    "stop_times.txt",
    "calendar_dates.txt"
]

# Convertir a JSON
for archivo in archivos:
    ruta = os.path.join("gtfs", archivo)

    if not os.path.exists(ruta):
        print(f"⚠️ No se encontró {archivo}, se omite.")
        continue

    with open(ruta, newline='', encoding="utf-8") as f:
        reader = csv.DictReader(f)
        datos = list(reader)

        salida = archivo.replace(".txt", ".json")
        salida_path = os.path.join("public/gtfs", salida)

        with open(salida_path, "w", encoding="utf-8") as out:
            json.dump(datos, out, ensure_ascii=False, indent=2)

        print(f"✅ Procesado: {archivo} → {salida_path}")
