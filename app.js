mapboxgl.accessToken = 'pk.eyJ1IjoicHJlY2lzbyIsImEiOiJjbW1yMnR4Ym0xNXo2MnFvcjF3OWhjeG0xIn0.0kik_HY1s4mLhwZE3W3aRQ';

/* =========================
   CONFIG
========================= */
const SHOP_URL = "https://precisoart.myshopify.com";
const STOREFRONT_TOKEN = "c9a152a9e40b1bbbb9e9be8367dcca4c";
const IMAGE_SIZE = "?width=600&height=600&crop=center";
const FALLBACK_IMAGE = "https://picsum.photos/600";

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
let lastInteraction = 0;

/* =========================
   HELPERS
========================= */
function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getItemId(item) {
  return `${item.title}-${item.lat}-${item.lng}`;
}

function getOptimizedImage(url) {
  if (!url) return FALLBACK_IMAGE;
  return `${url}${IMAGE_SIZE}`;
}

function clearActiveStates() {
  document.querySelectorAll(".card.active").forEach((el) => el.classList.remove("active"));
  document.querySelectorAll(".custom-marker.active").forEach((el) => el.classList.remove("active"));
}

function applyActiveState(item) {
  if (!item) return;

  const itemId = getItemId(item);
  const activeCard = document.querySelector(`.card[data-item-id="${itemId}"]`);
  const activeMarker = document.querySelector(`.custom-marker[data-item-id="${itemId}"]`);

  if (activeCard) {
    activeCard.classList.add("active");
    activeCard.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest"
    });
  }

  if (activeMarker) {
    activeMarker.classList.add("active");
  }
}

function bindPopupClose() {
  const btn = document.querySelector(".popup-close-btn");
  if (!btn) return;

  btn.onclick = (e) => {
    e.stopPropagation();
    resetView();
  };
}
function clearMarkers() {
  markers.forEach((marker) => marker.remove());
  markers = [];
}

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
    const productEdges = json?.data?.products?.edges || [];

    return productEdges
      .map(({ node }) => {
        const lat = parseFloat(node.lat?.value);
        const lng = parseFloat(node.lng?.value);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

        return {
          title: node.title,
          lat,
          lng,
          image: getOptimizedImage(node.images.edges[0]?.node.url),
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
   GOOGLE MAPS STYLE GESTURES
========================= */
map.scrollZoom.disable();

map.getCanvas().addEventListener("wheel", (e) => {
  if (e.ctrlKey || e.metaKey) {
    map.scrollZoom.enable();
  } else {
    map.scrollZoom.disable();
  }
});

map.dragPan.enable();
map.touchZoomRotate.enable();
map.touchZoomRotate.disableRotation();
map.keyboard.enable();
map.doubleClickZoom.disable();


/* =========================
   CAROUSEL
========================= */
function showCarousel() {
  const el = document.getElementById("carousel");
  if (!el) return;
  el.classList.remove("hidden");
}

function hideCarousel() {
  const el = document.getElementById("carousel");
  if (!el) return;
  el.classList.add("hidden");
}

/* =========================
   RESET VIEW
========================= */
function resetView() {
  if (activePopup) {
    activePopup.remove();
    activePopup = null;
  }

  clearActiveStates();
  showCarousel();
  activeItem = null;

  map.flyTo({
    center: HOME_VIEW.center,
    zoom: HOME_VIEW.zoom,
    speed: 0.6
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
      <button class="popup-close-btn" aria-label="Close popup">×</button>
      <div class="popup-image">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy">
      </div>
      <div class="popup-body">
        <div class="popup-moment">${escapeHtml(item.moment)}</div>
        <div class="popup-title">${escapeHtml(item.title)}</div>
        <div class="popup-meta">${escapeHtml(item.location)}</div>
        <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="popup-btn">View Artwork</a>
      </div>
    </div>
  `);
}

/* =========================
   MARKER CLICK
========================= */
function handleMarkerClick(item) {
  lastInteraction = Date.now();
  activeItem = item;

  clearActiveStates();
  applyActiveState(item);
  hideCarousel();

  if (activePopup) {
    activePopup.remove();
    activePopup = null;
  }

  const targetLngLat = [item.lng, item.lat];

  map.flyTo({
    center: targetLngLat,
    zoom: 15.5,
    speed: 0.8,
    curve: 1.4
  });

  map.once("moveend", () => {
    const tempPopup = createPopup(item)
      .setLngLat(targetLngLat)
      .addTo(map);

    const popupEl = document.querySelector(".mapboxgl-popup");
    if (!popupEl) return;

    const rect = popupEl.getBoundingClientRect();
    const popupHeight = rect.height;
    const isDesktop = window.innerWidth > 768;
    const offsetY = isDesktop ? popupHeight * 0.56 : popupHeight * 0.55;

    tempPopup.remove();

    map.easeTo({
      center: targetLngLat,
      offset: [0, offsetY],
      duration: 400
    });

    map.once("moveend", () => {
      const popup = createPopup(item)
        .setLngLat(targetLngLat)
        .addTo(map);

      activePopup = popup;
      bindPopupClose();
      applyActiveState(item);
    });
  });
}

/* =========================
   RENDER
========================= */
function render() {
  const list = document.getElementById("listings");
  if (list) list.innerHTML = "";

  clearMarkers();

  listings.forEach((item) => {
    const itemId = getItemId(item);

    if (list) {
      const card = document.createElement("div");
      card.className = "card";
      card.dataset.itemId = itemId;

      card.innerHTML = `
        <div class="card-image">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy">
        </div>
        <div class="card-body">
          <div class="card-moment">${escapeHtml(item.moment)}</div>
          <div class="card-title">${escapeHtml(item.title)}</div>
          <div class="card-meta">${escapeHtml(item.location)}</div>
        </div>
      `;

      card.onclick = () => handleMarkerClick(item);
      list.appendChild(card);
    }

    const el = document.createElement("div");
    el.className = "custom-marker";
    el.dataset.itemId = itemId;
    el.style.backgroundImage = `url(${item.image})`;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", item.title);

    el.onclick = (e) => {
      e.stopPropagation();
      handleMarkerClick(item);
    };

    const marker = new mapboxgl.Marker(el)
      .setLngLat([item.lng, item.lat])
      .addTo(map);

    markers.push(marker);
  });

  document.getElementById("skeletons")?.remove();
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
  if (Date.now() - lastInteraction < 300) return;
  if (e.originalEvent.target.closest(".mapboxgl-popup")) return;
  resetView();
});