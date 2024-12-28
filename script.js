let map;
let marker;
let mapInitialized = false;

document.getElementById('start').addEventListener('click', initializeMap);
document.getElementById('stop').addEventListener('click', stopTracking);
document.getElementById('search').addEventListener('click', () => { // {{ edit_1 }}
    const destination = prompt("Podaj miejsce docelowe:"); // Prompt for destination
    if (destination) {
        searchRoute(destination); // Call searchRoute with the provided destination
    }
});

function initializeMap() {
    if (!mapInitialized) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(showPosition, handleError);
        } else {
            alert("Geolokalizacja nie jest wspierana przez tę przeglądarkę.");
        }
    }
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

function searchRoute(destination) {
    if (mapInitialized) {
        const destinationCoords = getDestinationCoordinates(destination);
        
        if (destinationCoords) {
            const routeControl = L.Routing.control({
                waypoints: [
                    L.latLng(marker.getLatLng().lat, marker.getLatLng().lng), // Start point
                    L.latLng(destinationCoords.lat, destinationCoords.lng) // Destination point
                ],
                routeWhileDragging: true
            }).addTo(map);
        } else {
            alert("Nie można znaleźć podanego miejsca.");
        }
    } else {
        alert("Najpierw zainicjalizuj mapę.");
    }
}

// Function to get destination coordinates (this is a placeholder)
function getDestinationCoordinates(destination) {
    // Implement logic to convert destination name to coordinates
    // For example, using a geocoding API
    return { lat: 52.2297, lng: 21.0122 }; // Example coordinates for demonstration
}