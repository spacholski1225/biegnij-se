let map;
let marker;
let mapInitialized = false;
let selectedPark = null;
let routeLayer = null; // Globalna zmienna dla warstwy trasy


document.getElementById('start').addEventListener('click', initializeMap);
document.getElementById('stop').addEventListener('click', stopTracking);
document.getElementById('search').addEventListener('click', () => {
    const length = parseFloat(document.getElementById('route-length').value);
    if (!selectedPark) {
        alert("Najpierw wybierz park z listy!");
        return;
    }
    if (!isNaN(length)) {
        findRunningRoute(selectedPark, length);
    } else {
        alert("Wybierz długość trasy!");
    }
});

function initializeMap() {
    if (!mapInitialized) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                showPosition(position);
                console.log(position.coords.latitude);
                console.log(position.coords.longitude);
                findNearbyPark({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                }).then(parks => displayParkList(parks));
            }, handleError);
        } else {
            alert("Geolokalizacja nie jest wspierana przez tę przeglądarkę.");
        }
    } else {
        alert("Mapa jest już zainicjalizowana.");
    }
}

function displayParkList(parks) {
    const parkListContainer = document.getElementById('park-list');
    const parkList = document.getElementById('parks');

    parkList.innerHTML = ''; // Czyść listę przed dodaniem nowych elementów
    selectedPark = null; // Resetuj wybrany park

    parks.forEach(park => {
        const li = document.createElement('li');
        li.textContent = park.name;
        li.addEventListener('click', () => {
            selectedPark = park; // Ustaw wybrany park
            highlightSelectedPark(li); // Podświetl kliknięty element
            map.setView([park.lat, park.lng], 15);
            L.marker([park.lat, park.lng]).addTo(map)
                .bindPopup(`Park: ${park.name}`)
                .openPopup();
        });
        parkList.appendChild(li);
    });

    parkListContainer.style.display = 'block'; // Wyświetl kontener listy parków
}

function highlightSelectedPark(selectedElement) {
    const allListItems = document.querySelectorAll('#parks li');
    allListItems.forEach(item => {
        item.style.backgroundColor = '#e0e0e0'; // Domyślny kolor
    });
    selectedElement.style.backgroundColor = '#c0c0ff'; // Kolor dla wybranego
}


function showPosition(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    if (!mapInitialized) {
        map = L.map('map').setView([lat, lng], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        marker = L.marker([lat, lng]).addTo(map)
            .bindPopup('Jesteś tutaj.')
            .openPopup();

        mapInitialized = true;
    }
}

function stopTracking() {
    if (mapInitialized) {
        map.remove();
        document.getElementById('map').innerHTML = '';
        mapInitialized = false;
    }
}

function handleError(error) {
    console.error(`Błąd geolokalizacji: ${error.message}`);
}

async function findRunningRoute(park, length) {
    try {
        const routeCoords = await fetchRunningRoute(park, length); // Pobierz współrzędne trasy
        showRouteOnMap(routeCoords); // Wyświetl trasę na mapie
    } catch (error) {
        console.error("Błąd podczas wyszukiwania trasy:", error.message);
        alert("Nie udało się wygenerować trasy.");
    }
}


function findNearbyPark(position) {
    return new Promise((resolve, reject) => {
        const { lat, lng } = position;
        const location = new google.maps.LatLng(lat, lng);
        const service = new google.maps.places.PlacesService(document.createElement('div'));

        const request = {
            location: location,
            radius: 15000,
            type: ['park']
        };

        service.nearbySearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                resolve(results.slice(0, 5).map(park => ({
                    name: park.name,
                    lat: park.geometry.location.lat(),
                    lng: park.geometry.location.lng()
                })));
            } else {
                reject('Błąd podczas wyszukiwania parków.');
            }
        });
    });
}



async function fetchRunningRoute(startCoords, length) {
    const lengthInKm = length * 1000;
    const requestData = {
        points: [[startCoords.lng, startCoords.lat]],
        snap_preventions: ["motorway", "ferry", "tunnel"],
        details: ["road_class", "surface"],
        profile: "foot",
        locale: "en",
        instructions: false, // Wyłącz instrukcje
        calc_points: true,  // Włącz punkty pośrednie
        points_encoded: false,
        algorithm: "round_trip",
        "round_trip.distance": lengthInKm,
    };

    const apiKey = '93a3b274-79b8-4135-b194-ffa540553b68';
    const url = `https://graphhopper.com/api/1/route?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
    });

    if (!response.ok) {
        throw new Error("Błąd podczas pobierania trasy.");
    }

    const data = await response.json();

    if (data.paths && data.paths.length > 0) {
        const points = data.paths[0].points.coordinates.map(coord => ({
            lat: coord[1], // Zamień kolejność współrzędnych z [lng, lat] na [lat, lng]
            lng: coord[0],
        }));
        return points; // Zwróć współrzędne trasy
    } else {
        throw new Error("Brak trasy w odpowiedzi API.");
    }
}


function showRouteOnMap(routeCoords) {
    // Usuń poprzednią warstwę trasy, jeśli istnieje
    if (routeLayer) {
        map.removeLayer(routeLayer);
    }

    // Narysuj linię trasy na mapie
    routeLayer = L.polyline(routeCoords, { color: 'blue', weight: 4 }).addTo(map);

    // Dopasuj widok mapy do trasy
    map.fitBounds(routeLayer.getBounds());
}

