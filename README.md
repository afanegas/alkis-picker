# Alkis Picker

A tool for quickly identifying and retrieving building IDs from the Berlin ALKIS database.

## 🚀 Purpose
Alkis Picker allows users to:
- **Search** for addresses in Berlin.
- **Visualize** building footprints via ALKIS map layers.
- **Extract** detailed building information (ID, use, floors, address) by clicking on the map.
- **Copy** the unique ALKIS building ID (UUID) directly to the clipboard with a single click.

## 📡 Data Sources
- **[Nominatim (OpenStreetMap)](https://nominatim.org/)**: For address geocoding and search.
- **[Berlin GDI (Geoportal Berlin)](https://gdi.berlin.de/viewer/main/)**
- **Map Tiles**: [Carto](https://carto.com/) (Standard) and [Esri](https://www.esri.com/) (Satellite Imagery).

## 🛠 Technology Stack
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3.
- **Mapping**: [Leaflet.js](https://leafletjs.com/) for map rendering and spatial interactions.
- **API Integration**: Standard Fetch API for WFS and geocoding queries.
- **Icons & Fonts**: Google Fonts (Outfit).