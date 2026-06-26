/**
 * Alkis Picker - Main Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const CONFIG = {
        center: [52.5200, 13.4050], // Berlin
        zoom: 13,
        wmsUrl: 'https://gdi.berlin.de/services/wms/alkis_gebaeude',
        wfsUrl: 'https://gdi.berlin.de/services/wfs/alkis_gebaeude',
        wfsTypeName: 'alkis_gebaeude:gebaeude',
        deepLinkZoom: 19
    };

    // State
    let activeLayers = {
        satellite: false,
        alkis: true
    };

    let selectedBuildingLayer = null;

    // Initialize Map
    const map = L.map('map-container', {
        center: CONFIG.center,
        zoom: CONFIG.zoom,
        maxZoom: 22,
        zoomControl: false,
        attributionControl: false
    });


    // Custom Attribution Control to include "Über Alkis-Picker" link
    L.control.attribution({
        prefix: '<a href="about.html">Über Alkis-Picker</a> | <a href="https://leafletjs.com" title="A JavaScript library for interactive maps" target="_blank">Leaflet</a>'
    }).addTo(map);

    // Custom Zoom Control position
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Create a dedicated pane for ALKIS to ensure it stays on top
    map.createPane('alkisPane');
    map.getPane('alkisPane').style.zIndex = 450;
    map.getPane('alkisPane').style.pointerEvents = 'none';

    // basemap.de Web Raster (Standard base map) — official German federal/state map service (BKG/ZSGT)
    // Note tile path order is {z}/{y}/{x}, unlike most XYZ services.
    const osmLayer = L.tileLayer('https://sgx.geodatenzentrum.de/wmts_basemapde/tile/1.0.0/de_basemapde_web_raster_farbe/default/GLOBAL_WEBMERCATOR/{z}/{y}/{x}.png', {
        attribution: '&copy; <a href="https://basemap.de/" target="_blank">basemap.de</a> - GeoBasis-DE / BKG (' + new Date().getFullYear() + ') CC BY 4.0',
        maxZoom: 22,
        maxNativeZoom: 19
    }).addTo(map);


    // Satellite Layer (Geoportal Berlin / DOP20RGBI 2026 via codefor.de) - OFF by default
    const satelliteLayer = L.tileLayer('https://tiles.codefor.de/berlin/geoportal/luftbilder/2026-dop20rgb/{z}/{x}/{y}.png', {
        attribution: 'Luftbild &copy; <a href="https://daten.berlin.de/datensaetze/digitale-farbige-trueorthophotos-2026-dop20rgbi-9ff3159b" target="_blank" rel="noopener noreferrer">Geoportal Berlin / DOP20RGBI 2026</a>',
        maxZoom: 22,
        maxNativeZoom: 20
    });


    // ALKIS WMS Layer (Visual)
    const alkisWmsLayer = L.tileLayer.wms(CONFIG.wmsUrl, {
        layers: 'gebaeude',
        format: 'image/png',
        transparent: true,
        pane: 'alkisPane',
        maxZoom: 22,
        attribution: '<a href="https://daten.berlin.de/datensaetze/alkis-berlin-gebaude-wfs-728b368a" target="_blank" rel="noopener noreferrer">Geoportal Berlin / ALKIS Gebäude</a>'
    }).addTo(map);


    // --- Search Logic ---
    const searchInput = document.getElementById('address-search');
    const searchResults = document.getElementById('search-results');
    let searchTimeout;
    const ID_REGEX = /^(gebaeude\.)?DE[A-Z0-9]{14}$/i;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        if (query.length < 3) {
            searchResults.classList.add('hidden');
            return;
        }

        searchTimeout = setTimeout(() => performSearch(query), 300);
    });

    // Enter key press in search input
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query.length >= 3) {
                performSearch(query, { flyToTop: true });
                searchResults.classList.add('hidden');
            }
        }
    });

    // Search button click
    const searchButton = document.getElementById('search-button');
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query.length >= 3) {
                performSearch(query, { flyToTop: true });
                searchResults.classList.add('hidden');
            }
        });
    }

    async function performSearch(query, { flyToTop = false } = {}) {
        // Check if query looks like building ID
        if (ID_REGEX.test(query)) {
            try {
                let uuid = query;
                if (uuid.toLowerCase().startsWith('gebaeude.')) {
                    uuid = uuid.substring(9);
                }
                const building = await fetchBuildingById(uuid);
                if (building) {
                    displayResults([{
                        isBuildingId: true,
                        display_name: `Gebäude-ID: ${uuid}`,
                        building: building
                    }]);

                    if (flyToTop) {
                        selectBuilding(building, true);
                        searchResults.classList.add('hidden');
                    }
                    return;
                }
            } catch (error) {
                console.error('ID search error:', error);
            }
        }

        // Normal OSM search
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Berlin')}&limit=5`;
            const response = await fetch(url, {
                headers: { 'Accept-Language': 'en,de' }
            });
            const data = await response.json();

            displayResults(data);

            // Deep-link convenience: jump straight to the best match,
            // while leaving the dropdown open in case it's the wrong one.
            if (flyToTop && data.length > 0) {
                const top = data[0];
                const lat = parseFloat(top.lat);
                const lon = parseFloat(top.lon);
                map.flyTo([lat, lon], CONFIG.deepLinkZoom);
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    /**
     * Deep-link support: ?address=<text> or ?id=<alkis-id> in the URL.
     * Pre-fills search, runs query, and zooms to top result or building.
     */
    async function initDeepLink() {
        const params = new URLSearchParams(window.location.search);
        
        // Support ALKIS-ID URL parameters (id, uuid, alkis-id, alkis_id)
        const id = params.get('id') || params.get('uuid') || params.get('alkis-id') || params.get('alkis_id');
        if (id && id.trim()) {
            const trimmedId = id.trim();
            searchInput.value = trimmedId;
            try {
                let uuid = trimmedId;
                if (uuid.toLowerCase().startsWith('gebaeude.')) {
                    uuid = uuid.substring(9);
                }
                const building = await fetchBuildingById(uuid);
                if (building) {
                    selectBuilding(building, true);
                } else {
                    showToast('Gebäude mit dieser ID wurde nicht gefunden.', 4000);
                }
            } catch (error) {
                console.error('Deep link ID loading error:', error);
                showToast('Fehler beim Laden des Gebäudes per ID.', 3000);
            }
            return;
        }

        // Fallback to address deep link
        const address = params.get('address');
        if (address && address.trim()) {
            searchInput.value = address;
            performSearch(address.trim(), { flyToTop: true });
        }
    }

    function displayResults(data) {
        searchResults.innerHTML = '';
        if (data.length === 0) {
            searchResults.classList.add('hidden');
            return;
        }

        data.forEach(result => {
            const div = document.createElement('div');
            div.textContent = result.display_name;
            div.addEventListener('click', () => {
                if (result.isBuildingId) {
                    selectBuilding(result.building, true);
                } else {
                    const lat = parseFloat(result.lat);
                    const lon = parseFloat(result.lon);
                    map.flyTo([lat, lon], 20);
                    searchInput.value = result.display_name;
                }
                searchResults.classList.add('hidden');
            });
            searchResults.appendChild(div);
        });

        searchResults.classList.remove('hidden');
    }

    // --- Layer Toggling ---
    document.querySelectorAll('.layer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const layerType = btn.dataset.layer;
            activeLayers[layerType] = !activeLayers[layerType];
            
            if (layerType === 'satellite') {
                if (activeLayers.satellite) {
                    satelliteLayer.addTo(map);
                    map.removeLayer(osmLayer);
                } else {
                    map.removeLayer(satelliteLayer);
                    osmLayer.addTo(map);
                }
            } else {
                if (activeLayers.alkis) alkisWmsLayer.addTo(map);
                else map.removeLayer(alkisWmsLayer);
            }

            btn.classList.toggle('active');
        });
    });

    // --- Building Info Window Logic ---
    const infoWindow = document.getElementById('building-info-window');
    const infoContent = document.getElementById('info-content');
    const minimizeBtn = document.getElementById('minimize-info');
    const minimizeIcon = document.getElementById('minimize-icon');
    const expandIcon = document.getElementById('expand-icon');

    minimizeBtn.addEventListener('click', toggleInfoWindow);
    document.querySelector('.info-header').addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        toggleInfoWindow();
    });

    function toggleInfoWindow() {
        infoWindow.classList.toggle('minimized');
        minimizeIcon.classList.toggle('hidden');
        expandIcon.classList.toggle('hidden');
    }

    function updateInfoWindow(properties) {
        infoWindow.classList.remove('hidden');
        // Ensure it's expanded when new data arrives
        infoWindow.classList.remove('minimized');
        minimizeIcon.classList.remove('hidden');
        expandIcon.classList.add('hidden');

        infoContent.innerHTML = '';
        
        const displayData = [];

        // 1. Address
        let address = properties.bezeichnung || properties.BEZEICHNUNG || properties.lage || properties.LAGE;
        if (!address && properties.strasse) {
            address = properties.strasse + (properties.hausnummer ? ' ' + properties.hausnummer : '');
        }
        if (address) displayData.push({ label: 'Adresse', value: address });

        // 2. Use
        let use = properties.gebaeudefunktion || properties.GEBAEUDEFUNKTION;
        if (use) displayData.push({ label: 'Gebäudenutzung', value: use });

        // 3. ID
        let id = properties.uuid || properties.UUID || properties.gml_id;
        if (id) displayData.push({ label: 'ALKIS-ID', value: id });

        // 4. Name
        let name = properties.name || properties.NAME;
        if (name) displayData.push({ label: 'Gebäudename', value: name });

        // 5. Floors
        let floors = properties.anzahl_der_oberirdischen_geschosse || properties.ANZAHL_DER_OBERIRDISCHEN_GESCHOSSE;
        if (floors) displayData.push({ label: 'Stockwerke', value: floors });

        // 6. Roof
        let roof = properties.dachform || properties.DACHFORM;
        if (roof) displayData.push({ label: 'Dachtyp', value: roof });

        if (displayData.length > 0) {
            displayData.forEach(item => {
                const div = document.createElement('div');
                div.className = 'info-item';
                div.innerHTML = `
                    <span class="info-label">${item.label}</span>
                    <span class="info-value">${item.value}</span>
                `;
                infoContent.appendChild(div);
            });
        }

        // Show any remaining properties that weren't in the priority list
        const usedKeys = new Set(['bezeichnung', 'BEZEICHNUNG', 'lage', 'LAGE', 'strasse', 'hausnummer', 'gebaeudefunktion', 'GEBAEUDEFUNKTION', 'uuid', 'UUID', 'gml_id', 'name', 'NAME', 'anzahl_der_oberirdischen_geschosse', 'ANZAHL_DER_OBERIRDISCHEN_GESCHOSSE', 'dachform', 'DACHFORM']);
        
        let hasRemaining = false;
        Object.entries(properties).forEach(([key, value]) => {
            if (value && !usedKeys.has(key) && typeof value !== 'object') {
                hasRemaining = true;
                const div = document.createElement('div');
                div.className = 'info-item';
                div.innerHTML = `
                    <span class="info-label">${key}</span>
                    <span class="info-value">${value}</span>
                `;
                infoContent.appendChild(div);
            }
        });

        if (displayData.length === 0 && !hasRemaining) {
            infoContent.innerHTML = '<p class="placeholder-text">Keine detaillierten Informationen für dieses Gebäude verfügbar.</p>';
        }
    }





    /**
     * Highlights the building, shows details in info window, copies ID, and optionally zooms.
     */
    function selectBuilding(feature, shouldZoom = false) {
        const props = feature.properties;
        
        // Populate Info Window
        updateInfoWindow({ ...props });

        // Highlight selected building in red
        if (selectedBuildingLayer) {
            map.removeLayer(selectedBuildingLayer);
        }
        
        selectedBuildingLayer = L.geoJSON(feature, {
            style: {
                color: '#ff0000',
                weight: 3,
                opacity: 0.8,
                fillColor: '#ff0000',
                fillOpacity: 0.3
            }
        }).addTo(map);

        if (shouldZoom) {
            // Zoom/pan map to match the building boundaries
            map.fitBounds(selectedBuildingLayer.getBounds(), { maxZoom: CONFIG.deepLinkZoom });
        }

        // Copy UUID to clipboard
        const uuid = props.uuid || props.UUID || props.gml_id;
        if (uuid) {
            copyToClipboard(uuid);
        } else {
            showToast('Gebäude gefunden, aber keine ID verfügbar.', 3000);
        }
    }

    /**
     * Fetches building details from WFS service by building/ALKIS ID (UUID).
     */
    async function fetchBuildingById(uuid) {
        const featureID = `gebaeude.${uuid}`;
        const wfsParams = new URLSearchParams({
            service: 'WFS',
            version: '1.1.0',
            request: 'GetFeature',
            typeName: CONFIG.wfsTypeName,
            outputFormat: 'application/json',
            srsName: 'EPSG:4326',
            featureID: featureID
        });

        const url = `${CONFIG.wfsUrl}?${wfsParams.toString()}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            const text = await response.text();
            console.error('WFS ID Lookup Error Response:', text);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.features && data.features.length > 0) {
            return data.features[0];
        }
        return null;
    }

    // --- WFS Click Handling ---
    map.on('click', async (e) => {
        if (!activeLayers.alkis) return;

        const { lat, lng } = e.latlng;
        
        // Create a small BBOX for the query
        const buffer = 0.0001; // Approx 10m
        const bbox = `${lng - buffer},${lat - buffer},${lng + buffer},${lat + buffer}`;

        // Construct WFS GetFeature request
        // Switched to 1.1.0 as it's more reliable with Lon/Lat in 4326 for this server
        const wfsParams = new URLSearchParams({
            service: 'WFS',
            version: '1.1.0',
            request: 'GetFeature',
            typeName: CONFIG.wfsTypeName,
            outputFormat: 'application/json',
            srsName: 'EPSG:4326',
            bbox: `${bbox},EPSG:4326`,
            maxFeatures: 10
        });

        const url = `${CONFIG.wfsUrl}?${wfsParams.toString()}`;

        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                const text = await response.text();
                console.error('WFS Error Response:', text);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.features && data.features.length > 0) {
                // Filter features to only include AX_Gebaeude, ignoring AX_Bauteil
                const buildings = data.features.filter(f => {
                    const id = (f.id || "").toLowerCase();
                    // Check all properties for the presence of "bauteil"
                    const hasBauteilInProps = Object.values(f.properties).some(val => 
                        val && typeof val === 'string' && val.toLowerCase().includes('bauteil')
                    );
                    
                    // Must be a building and NOT a part
                    const isBuilding = id.includes('gebaeude');
                    const isPart = id.includes('bauteil') || hasBauteilInProps;
                    
                    return isBuilding && !isPart;
                });

                if (buildings.length > 0) {
                    // Precision improvement: Find which building actually contains the click point
                    let selectedBuilding = buildings.find(feature => isPointInPolygon(e.latlng, feature));
                    
                    // Fallback to first building if point-in-polygon fails (e.g. clicked slightly outside)
                    if (!selectedBuilding) {
                        selectedBuilding = buildings[0];
                    }

                    // Highlight and show building info without zooming
                    selectBuilding(selectedBuilding, false);
                } else {
                    showToast('Hier wurden nur Gebäudeteile gefunden. Bitte klicken Sie auf das Hauptgebäude.', 3000);
                }
            } else {
                showToast('An diesem Standort wurde kein Gebäude gefunden.', 2000);
            }
        } catch (error) {
            console.error('WFS request failed:', error);
            showToast('Fehler beim Abrufen der Gebäudedaten.', 3000);
        }
    });

    // --- Clipboard & UI Helpers ---
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(`ID kopiert: ${text}`, 4000);
            // Visual feedback on the map could go here (e.g. temporary highlight)
        }).catch(err => {
            console.error('Could not copy text: ', err);
            showToast('Kopieren in die Zwischenablage fehlgeschlagen.', 3000);
        });
    }

    function showToast(message, duration = 3000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Helper to check if a Leaflet LatLng point is inside a GeoJSON feature's polygon(s)
     */
    function isPointInPolygon(latlng, feature) {
        if (!feature.geometry) return false;
        
        const type = feature.geometry.type;
        const coords = feature.geometry.coordinates;
        const pt = [latlng.lng, latlng.lat];

        const isInsideRing = (p, ring) => {
            let inside = false;
            for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                const xi = ring[i][0], yi = ring[i][1];
                const xj = ring[j][0], yj = ring[j][1];
                const intersect = ((yi > p[1]) !== (yj > p[1])) && 
                                  (p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        };

        if (type === 'Polygon') {
            // Check exterior ring then holes
            if (isInsideRing(pt, coords[0])) {
                for (let i = 1; i < coords.length; i++) {
                    if (isInsideRing(pt, coords[i])) return false; // Inside a hole
                }
                return true;
            }
        } else if (type === 'MultiPolygon') {
            for (const polygon of coords) {
                if (isInsideRing(pt, polygon[0])) {
                    let inHole = false;
                    for (let i = 1; i < polygon.length; i++) {
                        if (isInsideRing(pt, polygon[i])) {
                            inHole = true;
                            break;
                        }
                    }
                    if (!inHole) return true;
                }
            }
        }
        return false;
    }

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });

    // Run any ?address= deep link now that everything is wired up
    initDeepLink();
});
