# Alkis Picker

A specialized tool for quickly identifying and retrieving building IDs from the Berlin ALKIS (Official House Coordinate and Building System) database.

## 🚀 Purpose
Alkis Picker allows users to:
- **Search** for addresses in Berlin.
- **Visualize** official building footprints via ALKIS map layers.
- **Extract** detailed building information (ID, use, floors, address) by clicking on the map.
- **Copy** the unique ALKIS building ID (UUID) directly to the clipboard with a single click.

## 📡 Data Sources
- **[Nominatim (OpenStreetMap)](https://nominatim.org/)**: For address geocoding and search.
- **[Berlin GDI (Geoportal Berlin)](https://fbinter.stadt-berlin.de/)**: 
    - **WMS**: For visual building footprint layers (`alkis_gebaeude`).
    - **WFS**: For querying detailed building attributes (`AX_Gebäude`).
- **Map Tiles**: [Carto](https://carto.com/) (Standard) and [Esri](https://www.esri.com/) (Satellite Imagery).

## 🛠 Technology Stack
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3.
- **Mapping**: [Leaflet.js](https://leafletjs.com/) for map rendering and spatial interactions.
- **API Integration**: Standard Fetch API for WFS and geocoding queries.
- **Icons & Fonts**: Google Fonts (Outfit).

---
*Built for efficiency in urban data collection and real estate analysis.*
