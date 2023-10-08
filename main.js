const map = L.map("map");
const searchInput = document.getElementById("search");
const searchForm = document.getElementById("search-form");

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const markers = L.layerGroup();

const BusIconBase = L.Icon.extend({
  options: {
    iconSize: [25, 25],
    shadowSize: [0, 0],
    iconAnchor: [25 / 2, 25 / 2],
    popupAnchor: [0, -10],
  },
});

const BusIcon = new BusIconBase({
  iconUrl: "bus.svg",
});

map.on("click", (e) => {
  console.info(e);
});

map.on("load", async () => {
  console.info("Map loaded");
  const searchInputValue = searchInput.value;
  await renderBusses(searchInputValue);

  map.addLayer(markers);
});

map.setView([60.37, 5.294], 11);

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  console.debug("Search button clicked", searchInput.value);
  renderBusses(searchInput.value);
});

/**
 * Check out entur API for more info
 * https://api.entur.io/graphql-explorer/vehicles?query=%7B%0A%20%20vehicles%28codespaceId%3A%20%22SKY%22%29%20%7B%0A%20%20%20%20line%20%7B%0A%20%20%20%20%20%20lineRef%0A%20%20%20%20%20%20lineName%0A%20%20%20%20%20%20publicCode%0A%20%20%20%20%7D%0A%20%20%20%20lastUpdated%0A%20%20%20%20location%20%7B%0A%20%20%20%20%20%20latitude%0A%20%20%20%20%20%20longitude%0A%20%20%20%20%7D%0A%20%20%20%20codespace%20%7B%0A%20%20%20%20%20%20codespaceId%0A%20%20%20%20%7D%0A%20%20%20%20delay%0A%20%20%20%20originName%0A%20%20%20%20vehicleId%0A%20%20%20%20destinationName%0A%20%20%20%20bearing%0A%20%20%7D%0A%7D%0A
 */
async function renderBusses(lineRef = "SKY:Line:445") {
  const jsonData = await fetchBusData(lineRef);
  const busses = jsonData.data.vehicles;

  markers.clearLayers();

  busses.forEach((bus) => {
    const marker = L.marker([bus.location.latitude, bus.location.longitude], {
      rotationAngle: bus.bearing + 90,
      icon: BusIcon,
    });
    marker.bindPopup(`
      <div class="popup">
        <h2>${bus.line.lineRef} (${getTimeSinceLastUpdateInMinutes(
      bus.lastUpdated
    )}m ago)</h2>
        <pre>
${JSON.stringify(bus, null, 2)}
        </pre>
      </div>
      `);
    markers.addLayer(marker);
  });
}

/**
 *
 * @param {string} lineRef
 * @returns {Promise<Busses>}
 */
async function fetchBusData(lineRef) {
  const data = await fetch(
    "https://api.entur.io/realtime/v1/vehicles/graphql",
    {
      method: "POST",
      body: JSON.stringify({
        query: `
{
  vehicles(codespaceId: "SKY"${
    lineRef ? ', lineRef : "' + lineRef + '"' : ""
  }) {
    line {
      lineRef
      lineName
      publicCode
    }
    lastUpdated
    location {
      latitude
      longitude
    }
    codespace {
      codespaceId
    }
    delay
    originName
    vehicleId
    destinationName
    bearing
  }
}`,
        variables: null,
      }),
    }
  );
  return data.json();
}

/**
 *
 * @param {Date | string} lastUpdated
 * @returns {number}
 */
function getTimeSinceLastUpdateInMinutes(lastUpdated) {
  const now = new Date();
  const lastUpdatedDate = new Date(lastUpdated);
  const diff = now.getTime() - lastUpdatedDate.getTime();
  return Math.round(diff / 1000 / 60);
}

/**
 * @typedef {object} Busses
 * @property {object} data
 * @property {Bus[]} data.vehicles
 */

/**
 * @typedef {object} Bus
 * @property {object} line
 * @property {string} line.lineRef
 * @property {string} line.lineName
 * @property {string} line.publicCode
 * @property {string | Date} lastUpdated
 * @property {object} location
 * @property {number} location.latitude
 * @property {number} location.longitude
 * @property {object} codespace
 * @property {string} codespace.codespaceId
 * @property {number} delay
 * @property {string} originName
 * @property {string} vehicleId
 * @property {string} destinationName
 * @property {number} bearing
 */
