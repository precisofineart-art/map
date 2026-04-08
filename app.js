

mapboxgl.accessToken = 'pk.eyJ1IjoicHJlY2lzbyIsImEiOiJjbW1yMnR4Ym0xNXo2MnFvcjF3OWhjeG0xIn0.0kik_HY1s4mLhwZE3W3aRQ';


/* =========================
   CONFIG
========================= */
const SHOP_URL = "https://precisoart.myshopify.com";
const STOREFRONT_TOKEN = "c9a152a9e40b1bbbb9e9be8367dcca4c";


/* =========================
   HOME VIEW
========================= */
const HOME_VIEW = {
  center: [-83.04, 42.315],
  zoom: 4
};

/* =========================
   STATE
========================= */
let listings = [];
let markers = [];
let activePopup = null;
let activeItem = null;

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
  center: HOME_VIEW.center,
  zoom: HOME_VIEW.zoom
});

/* =========================
   GESTURES
========================= */
map.scrollZoom.disable();

map.getCanvas().addEventListener("wheel", (e) => {
  if (e.ctrlKey || e.metaKey) {
    map.scrollZoom.enable();
  } else {
    map.scrollZoom.disable();
  }
});

map.touchZoomRotate.enable();
map.touchZoomRotate.disableRotation();
map.doubleClickZoom.disable();

/* =========================
   CAROUSEL
========================= */
function showCarousel() {
  document.getElementById("carousel")?.classList.remove("hidden");
}

function hideCarousel() {
  document.getElementById("carousel")?.classList.add("hidden");
}

/* =========================
   RESET VIEW
========================= */
function resetView() {
  if (activePopup) {
    activePopup.remove();
    activePopup = null;
  }

  showCarousel();

  if (activeItem) {
    map.flyTo({
      center: [activeItem.lng, activeItem.lat],
      zoom: 6,
      speed: 0.5
    });

    activeItem = null;
    return;
  }

  map.flyTo({
    center: HOME_VIEW.center,
    zoom: HOME_VIEW.zoom,
    speed: 0.5
  });
}

/* =========================
   POPUP
========================= */
function createPopup(item) {
  return new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    anchor: "bottom",
    offset: 15
  }).setHTML(`
    <div class="popup-card">
      <button class="popup-close-btn">×</button>
      <div class="popup-image">
        <img src="${item.image}">
      </div>
      <div class="popup-body">
        <div class="popup-moment">${item.moment}</div>
        <div class="popup-title">${item.title}</div>
        <div class="popup-meta">${item.location}</div>
        <a href="${item.link}" target="_blank" class="popup-btn">View Artwork</a>
      </div>
    </div>
  `);
}

/* =========================
   MARKER CLICK
========================= */
function handleMarkerClick(item) {

  activeItem = item;
  hideCarousel();

  if (activePopup) {
    activePopup.remove();
    activePopup = null;
  }

  map.flyTo({
    center: [item.lng, item.lat],
    zoom: 16,
    speed: 0.7,
    curve: 1.6
  });

  map.once("moveend", () => {

    const popup = createPopup(item)
      .setLngLat([item.lng, item.lat])
      .addTo(map);

    activePopup = popup;

    // close button
    setTimeout(() => {
      const btn = document.querySelector(".popup-close-btn");
      if (btn) {
        btn.onclick = (e) => {
          e.stopPropagation();
          resetView();
        };
      }
    }, 50);

    // 🔥 PERFECT CENTERING FIX
    setTimeout(() => {
      const popupEl = document.querySelector(".mapboxgl-popup");
      if (!popupEl) return;

      const mapContainer = map.getContainer();
      const mapRect = mapContainer.getBoundingClientRect();
      const popupRect = popupEl.getBoundingClientRect();

      const mapCenterY = mapRect.top + mapRect.height / 2;
      const popupCenterY = popupRect.top + popupRect.height / 2;

      const deltaY = popupCenterY - mapCenterY;

      map.easeTo({
        center: [item.lng, item.lat],
        offset: [0, -deltaY], // 🔥 dynamic correction
        duration: 600
      });

    }, 200);
  });
}

/* =========================
   RENDER
========================= */
function render() {
  const list = document.getElementById("listings");
  if (list) list.innerHTML = "";

  markers.forEach(m => m.remove());
  markers = [];

  listings.forEach((item) => {

    if (list) {
      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <div class="card-image">
          <img src="${item.image}">
        </div>
        <div class="card-body">
          <div class="card-moment">${item.moment}</div>
          <div class="card-title">${item.title}</div>
          <div class="card-meta">${item.location}</div>
        </div>
      `;

      card.onclick = () => handleMarkerClick(item);
      list.appendChild(card);
    }

    const el = document.createElement("div");
    el.className = "custom-marker";
    el.style.backgroundImage = `url(${item.image})`;

    const marker = new mapboxgl.Marker(el)
      .setLngLat([item.lng, item.lat])
      .addTo(map);

    el.onclick = (e) => {
      e.stopPropagation();
      handleMarkerClick(item);
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
  setTimeout(showCarousel, 200);
});

/* =========================
   MAP CLICK
========================= */
map.on("click", (e) => {
  if (e.originalEvent.target.closest(".mapboxgl-popup")) return;
  resetView();
});