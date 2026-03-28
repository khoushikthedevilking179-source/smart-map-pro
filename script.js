let map = L.map('map').setView([17.385044, 78.486671], 13);
let marker, routeLayer;

let markers = [];
let cluster = L.markerClusterGroup();
map.addLayer(cluster);

// Map layers
let light = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
let dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');

light.addTo(map);

// Add Marker
function addMarker(lat, lon, text) {
    const m = L.marker([lat, lon]).bindPopup(text);
    cluster.addLayer(m);
    markers.push(m);
    marker = m;
}

// Current Location
function getLocation() {
    navigator.geolocation.getCurrentPosition(pos => {
        addMarker(pos.coords.latitude, pos.coords.longitude, "You are here");
        map.setView([pos.coords.latitude, pos.coords.longitude], 13);
    });
}

// Live Tracking
function startTracking() {
    navigator.geolocation.watchPosition(pos => {
        addMarker(pos.coords.latitude, pos.coords.longitude, "Tracking...");
        map.setView([pos.coords.latitude, pos.coords.longitude]);
    });
}

// Search
function searchPlace() {
    const query = document.getElementById("search").value;

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`)
        .then(res => res.json())
        .then(data => {
            if (!data.length) return;

            const p = data[0];
            addMarker(p.lat, p.lon, p.display_name);
            map.setView([p.lat, p.lon], 13);
        });
}

// Single Route
function getRoute() {

    if (!marker) {
        alert("Select destination first");
        return;
    }

    navigator.geolocation.getCurrentPosition(pos => {

        const start = `${pos.coords.longitude},${pos.coords.latitude}`;
        const end = `${marker.getLatLng().lng},${marker.getLatLng().lat}`;

        fetch(`https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`)
            .then(res => res.json())
            .then(data => {

                const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);

                if (routeLayer) map.removeLayer(routeLayer);

                routeLayer = L.polyline(coords, {weight: 5}).addTo(map);

                let d = (data.routes[0].distance / 1000).toFixed(2);
                let t = (data.routes[0].duration / 60).toFixed(1);

                document.getElementById("info").innerHTML =
                    `Distance: ${d} km <br> Time: ${t} min`;
            });
    });
}

// Multi Route
function multiRoute() {

    const stops = document.getElementById("stops").value.split(",");

    let coords = [];

    Promise.all(stops.map(s =>
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${s}`)
            .then(r => r.json())
            .then(d => {
                if (d.length) coords.push([d[0].lon, d[0].lat]);
            })
    )).then(() => {

        const str = coords.map(c => c.join(",")).join(";");

        fetch(`https://router.project-osrm.org/route/v1/driving/${str}?overview=full&geometries=geojson`)
            .then(r => r.json())
            .then(data => {

                const route = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);

                if (routeLayer) map.removeLayer(routeLayer);

                routeLayer = L.polyline(route, {weight: 5}).addTo(map);
            });
    });
}

// Nearby
function findNearby(type) {

    if (!type) return;

    const c = map.getCenter();

    fetch(`https://overpass-api.de/api/interpreter?data=[out:json];node["amenity"="${type}"](around:2000,${c.lat},${c.lng});out;`)
        .then(r => r.json())
        .then(data => {
            data.elements.forEach(p => {
                addMarker(p.lat, p.lon, p.tags.name || type);
            });
        });
}

// Save
function savePlace() {
    if (!marker) return;

    let saved = JSON.parse(localStorage.getItem("places")) || [];
    saved.push(marker.getLatLng());

    localStorage.setItem("places", JSON.stringify(saved));
    alert("Saved!");
}

// Load
function loadSaved() {
    let saved = JSON.parse(localStorage.getItem("places")) || [];

    saved.forEach(loc => {
        addMarker(loc.lat, loc.lng, "Saved");
    });
}

// Dark Mode
function toggleDarkMode() {
    if (map.hasLayer(dark)) {
        map.removeLayer(dark);
        light.addTo(map);
    } else {
        map.removeLayer(light);
        dark.addTo(map);
    }
}

// Clear Map
function clearMap() {
    cluster.clearLayers();

    if (routeLayer) map.removeLayer(routeLayer);
}