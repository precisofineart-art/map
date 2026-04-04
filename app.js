

mapboxgl.accessToken = 'pk.eyJ1IjoicHJlY2lzbyIsImEiOiJjbW1yMnR4Ym0xNXo2MnFvcjF3OWhjeG0xIn0.0kik_HY1s4mLhwZE3W3aRQ';


/* =========================
   CONFIG
========================= */
const SHOP_URL = "https://precisoart.myshopify.com";
const STOREFRONT_TOKEN = "c9a152a9e40b1bbbb9e9be8367dcca4c";

/* =========================
   STATE
========================= */
let listings = [];
let markers = [];

let expandedMarkerIndex = null;
let previousView = null;
let activePopup = null;

/* =========================
   FETCH PRODUCTS
========================= */
async function fetchProducts() {
  try {
    const res = await fetch(`${SHOP_URL}/api/2023-07/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN
      },
      body: JSON.stringify({
        query: `
        {
          products(first: 50) {
            edges {
              node {
                title
                handle
                images(first: 1) {
                  edges { node { url } }
                }
                lat: metafield(namespace: "custom", key: "lat") { value }
                lng: metafield(namespace: "custom", key: "lng") { value }
                location: metafield(namespace: "custom", key: "location") { value }
                time: metafield(namespace: "custom", key: "time") { value }
                moment: metafield(namespace: "custom", key: "moment") { value }
              }
            }
          }
        }
        `
      })
    });

    const json = await res.json();

    return json.data.products.edges
      .map(({ node }) => {
        const lat = parseFloat(node.lat?.value);
        const lng = parseFloat(node.lng?.value);
        if (isNaN(lat) || isNaN(lng)) return null;

        return {
          title: node.title,
          lat,
          lng,
          image: node.images.edges[0]?.node.url || "https://picsum.photos/400",
          link: `${SHOP_URL}/products/${node.handle}`,
          location: node.location?.value || "",
          time: node.time?.value || "",
          moment: node.moment?.value || "Explore"
        };
      })
      .filter(Boolean);

  } catch (err) {
    console.warn("Fetch error:", err);
    return [];
  }
}

/* =========================
   MAP
========================= */
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/satellite-streets-v12",
  center: [-83.04, 42.315],
  zoom: 4
});

/* =========================
   CAROUSEL CONTROL
========================= */
function showCarousel() {
  document.getElementById("carousel")?.classList.remove("hidden");
}

function hideCarousel() {
  document.getElementById("carousel")?.classList.add("hidden");
}

/* =========================
   MAP MOVEMENT
========================= */
function flyToLocation(lng, lat) {
  hideCarousel();

  map.flyTo({
    center: [lng, lat],
    zoom: 12,
    speed: 0.6
  });

  map.once("moveend", () => {
    setTimeout(showCarousel, 150);
  });
}

/* MARKER ZOOM (carousel stays hidden) */
function zoomToMarker(item) {
  hideCarousel();

  previousView = {
    center: map.getCenter(),
    zoom: map.getZoom()
  };

  const mapHeight = map.getContainer().offsetHeight;

  map.flyTo({
    center: [item.lng, item.lat],
    zoom: 16,
    offset: [0, mapHeight * -0.1],
    speed: 0.6,
    curve: 1.6
  });
}

/* =========================
   RESET VIEW
========================= */
function resetView() {
  if (!previousView) return;

  map.flyTo({
    center: previousView.center,
    zoom: previousView.zoom,
    speed: 0.6,
    curve: 1.6
  });

  expandedMarkerIndex = null;

  setTimeout(showCarousel, 150);
}

/* =========================
   POPUP (ORIGINAL STYLE)
========================= */
function createPopup(item) {
  return new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: [70, 0],
    anchor: "left"
  }).setHTML(`
    <div class="popup-card">

      <div class="popup-image">
        <img src="${item.image}">
      </div>

      <div class="popup-body">
        <div class="popup-moment">${item.moment}</div>
        <div class="popup-title">${item.title}</div>

        <div class="popup-meta">
          ${item.location}${item.time ? " • " + item.time : ""}
        </div>

        <a href="${item.link}" target="_blank" rel="noopener" class="popup-btn">
          Buy Now
        </a>
      </div>

    </div>
  `);
}

/* =========================
   RENDER
========================= */
function render() {
  const list = document.getElementById("listings");
  list.innerHTML = "";

  markers.forEach(m => m.remove());
  markers = [];

  listings.forEach((item, i) => {

    /* CARD */
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="card-image">
        <img src="${item.image}" loading="lazy">
      </div>
      <div class="card-body">
        <div class="card-moment">${item.moment}</div>
        <div class="card-title">${item.title}</div>
        <div class="card-meta">${item.location}</div>
      </div>
    `;

    card.onclick = () => {
      if (activePopup) {
        activePopup.remove();
        activePopup = null;
      }

      expandedMarkerIndex = null;
      flyToLocation(item.lng, item.lat);
    };

    list.appendChild(card);

    /* MARKER */
    const el = document.createElement("div");
    el.className = "custom-marker";
    el.style.backgroundImage = `url(${item.image})`;

    const marker = new mapboxgl.Marker(el)
      .setLngLat([item.lng, item.lat])
      .addTo(map);

    el.onclick = (e) => {
      e.stopPropagation();

      const isSame = expandedMarkerIndex === i;

      if (activePopup) {
        activePopup.remove();
        activePopup = null;
      }

      if (isSame) {
        resetView();
        return;
      }

      expandedMarkerIndex = i;

      zoomToMarker(item);

      const popup = createPopup(item);
      popup.setLngLat([item.lng, item.lat]).addTo(map);

      activePopup = popup;
    };

    markers.push(marker);
  });
}

/* =========================
   INIT
========================= */
map.on("load", async () => {
  listings = await fetchProducts();
  render();

  setTimeout(showCarousel, 300);
});

/* =========================
   MAP CLICK
========================= */
map.on("click", () => {
  if (activePopup) {
    activePopup.remove();
    activePopup = null;
  }

  resetView();
});