from fastapi import FastAPI
import os
import exifread
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS-Middleware hinzufügen
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"],  # Frontend-URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Image-Ordner als statische Dateien bereitstellen
IMAGE_FOLDER = "images/"
app.mount("/static", StaticFiles(directory=IMAGE_FOLDER), name="static")

def get_gps_data(image_path):
    """Liest die GPS-Koordinaten aus den EXIF-Daten eines Bildes"""
    with open(image_path, "rb") as image_file:
        tags = exifread.process_file(image_file)
        if 'GPS GPSLatitude' in tags and 'GPS GPSLongitude' in tags:
            lat = tags['GPS GPSLatitude'].values
            lon = tags['GPS GPSLongitude'].values
            return {
                "latitude": float(lat[0]) + float(lat[1]) / 60 + float(lat[2]) / 3600,
                "longitude": float(lon[0]) + float(lon[1]) / 60 + float(lon[2]) / 3600,
                "image_url": f"/static/{Path(image_path).name}"
            }
    return None

@app.get("/photos")
def get_photos():
    """Liest alle Fotos aus dem Ordner und gibt deren GPS-Daten zurück"""
    photos = []
    for filename in os.listdir(IMAGE_FOLDER):
        if filename.lower().endswith((".jpg", ".jpeg", ".png")):
            photo_path = os.path.join(IMAGE_FOLDER, filename)
            gps_data = get_gps_data(photo_path)
            if gps_data:
                photos.append(gps_data)
    return photos 