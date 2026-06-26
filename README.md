# Alkis Picker

A tool for quickly identifying and retrieving building IDs from the Berlin ALKIS database.

**Testen Sie das Tool online**: [afanegas.github.io/alkis-picker/](https://afanegas.github.io/alkis-picker/)

## 🚀 Purpose
Alkis Picker allows users to:
- **Search** for addresses in Berlin.
- **Visualize** building footprints via ALKIS map layers.
- **Extract** detailed building information (ID, use, floors, address) by clicking on the map.
- **Copy** the unique ALKIS building ID (UUID) directly to the clipboard with a single click.

## 🔗 Deep Linking (Direct Address Search via URL)
Alkis Picker supports a URL query parameter, `address`, that lets you jump straight to a search result without typing anything into the app.

Opening a link in the form:

```
https://<your-domain>/?address=<address text>
```

will automatically:
1. Pre-fill the search box with the given address.
2. Run the same address search used when typing manually.
3. Fly the map to the top matching result (at a zoom level that still shows surrounding context).
4. Keep the search results dropdown open, so you can pick a different match if the top result isn't the right one.

This is especially useful when working from a spreadsheet of addresses: you can generate one link per address and click through them to quickly pick the right building and copy its ALKIS ID.

### Example
For **Rathausstraße 15, 10178 Berlin**, the link would be:

```
https://<your-domain>/?address=Rathausstra%C3%9Fe%2015%2C%2010178%20Berlin
```

(Special characters such as spaces, commas, and umlauts must be URL-encoded — see the Excel formula below for an easy way to generate this automatically.)

### Generating links from Excel (German locale)
If you have a column of addresses in Excel and want to generate a clickable link for each one, use `ENCODEURL` together with `VERKETTEN` (or `&`) to build the URL, and wrap it in `HYPERLINK` so it's clickable directly in the cell.

Assuming the address is in cell `A2`:

```excel
=HYPERLINK("https://<your-domain>/?address=" & ENCODEURL(A2); "Auf Karte öffnen")
```

For **Rathausstraße 15, 10178 Berlin** in `A2`, this produces a clickable cell labeled "Auf Karte öffnen" that opens:

```
https://<your-domain>/?address=Rathausstra%C3%9Fe%2015%2C%2010178%20Berlin
```

> Note: In the German version of Excel, the argument separator in formulas is `;` rather than `,`, as used above. `ENCODEURL` is available in Excel 2013 and later (called `URLCODIEREN` in some older German builds — if `ENCODEURL` is not recognized, try `URLCODIEREN`).

## 📡 Data Sources
- **[Nominatim (OpenStreetMap)](https://nominatim.org/)**: For address geocoding and search.
- **[Berlin GDI (Geoportal Berlin)](https://gdi.berlin.de/viewer/main/)**
- **Map Tiles**: [Carto](https://carto.com/) (Standard) and [Esri](https://www.esri.com/) (Satellite Imagery).

## 🛠 Technology Stack
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3.
- **Mapping**: [Leaflet.js](https://leafletjs.com/) for map rendering and spatial interactions.
- **API Integration**: Standard Fetch API for WFS and geocoding queries.
- **Icons & Fonts**: Google Fonts (Outfit).

## 📄 License
This project is licensed under the [MIT License](LICENSE).
