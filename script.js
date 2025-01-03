let map;
let marker;
let mapInitialized = false;
let selectedPark = null;
let routeLayer = null;
let timerInterval;
let timerStartTime = null;


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
document.getElementById('central-start').addEventListener('click', () => {
    const startOverlay = document.getElementById('start-overlay');
    startOverlay.style.display = 'none'; // Ukryj przycisk centralny
    initializeMap(); // Zainicjuj mapę
});

document.getElementById('toggle-timer').addEventListener('click', toggleTimer);

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

    parkList.innerHTML = '';
    selectedPark = null;

    const sortedParks = parks.sort((a, b) => a.name.localeCompare(b.name));

    sortedParks.forEach(park => {
        const li = document.createElement('li');
        li.textContent = park.name;
        li.addEventListener('click', () => {
            selectedPark = park;
            highlightSelectedPark(li);
            map.setView([park.lat, park.lng], 15);
            L.marker([park.lat, park.lng]).addTo(map)
                .bindPopup(`Park: ${park.name}`)
                .openPopup();
        });
        parkList.appendChild(li);
    });

    parkListContainer.style.display = 'block';
}


function highlightSelectedPark(selectedElement) {
    const allListItems = document.querySelectorAll('#parks li');
    allListItems.forEach(item => {
        item.style.backgroundColor = '#e0e0e0';
    });
    selectedElement.style.backgroundColor = '#c0c0ff';
}

function showPosition(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    if (!mapInitialized) {
        map = L.map('map').setView([lat, lng], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Dodanie kropeczki jako markera
        marker = L.circleMarker([lat, lng], {
            color: '#1E90FF', // Kolor obramowania kropeczki
            fillColor: '#1E90FF', // Kolor wypełnienia kropeczki
            fillOpacity: 1, // Pełne wypełnienie
            radius: 6 // Promień kropeczki
        }).addTo(map)
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
        const routeCoords = await fetchRunningRoute(park, length); 
        showRouteOnMap(routeCoords); 
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
            radius: 10000,
            type: ['park']
        };

        service.nearbySearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                resolve(results.slice(0, 10).map(park => ({
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
        instructions: false, 
        calc_points: true, 
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
            lat: coord[1],
            lng: coord[0],
        }));
        return points;
    } else {
        throw new Error("Brak trasy w odpowiedzi API.");
    }
}

function showRouteOnMap(routeCoords) {
    if (routeLayer) {
        map.removeLayer(routeLayer);
    }

    routeLayer = L.polyline(routeCoords, { color: 'blue', weight: 4 }).addTo(map);

    map.fitBounds(routeLayer.getBounds());
}
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

function startTimer() {
    timerStartTime = Date.now();
    timerInterval = setInterval(() => {
        const elapsedTime = Date.now() - timerStartTime;
        document.getElementById('timer-display').textContent = formatTime(elapsedTime);
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;

    const elapsedTime = Date.now() - timerStartTime;
    const formattedTime = formatTime(elapsedTime);

    const saveTime = confirm(`Otrzymany czas: ${formattedTime}. Czy chcesz go zapisać?`);
    if (saveTime) {
        if (!selectedPark) {
            alert("Nie wybrano parku. Nie można zapisać danych.");
            return;
        }

        const routeLength = document.getElementById('route-length').value;
        const parkName = selectedPark.name;

        const savedData = {
            time: formattedTime,
            routeLength: `${routeLength} km`,
            parkName: parkName,
        };

        console.log("Zapisane dane:", savedData);
        localStorage.setItem("lastSavedTimeData", JSON.stringify(savedData));

        alert(`Dane zapisane:\nCzas: ${formattedTime}\nDługość trasy: ${routeLength} km\nPark: ${parkName}`);
    }
}


function toggleTimer() {
    const toggleButton = document.getElementById('toggle-timer');

    if (!timerInterval) {
        // Start Timer
        startTimer();
        toggleButton.textContent = "Stop Timer";
        toggleButton.classList.remove("green-button");
        toggleButton.classList.add("red-button");
    } else {
        // Stop Timer
        stopTimer();
        toggleButton.textContent = "Start Timer";
        toggleButton.classList.remove("red-button");
        toggleButton.classList.add("green-button");
    }
}
