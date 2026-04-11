mapboxgl.accessToken = "pk.eyJ1IjoicHJlY2lzbyIsImEiOiJjbW1yMnR4Ym0xNXo2MnFvcjF3OWhjeG0xIn0.0kik_HY1s4mLhwZE3W3aRQ";

/* =========================
   CONFIG
========================= */
const SHOP_URL = "https://precisoart.myshopify.com";
const STOREFRONT_TOKEN = "c9a152a9e40b1bbbb9e9be8367dcca4c";
const FALLBACK_IMAGE = "https://picsum.photos/800";

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
let isResetting = false;

/* =========================
   HELPERS
========================= */
function isDesktopSheet() {
  return window.innerWidth >= 980;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getImageUrl(node) {
  return node.images?.edges?.[0]?.node?.url || FALLBACK_IMAGE;
}

function getItemId(item) {
  return `${item.title}|${item.lat}|${item.lng}`;
}

function clearMarkers() {
  markers.forEach((marker) => marker.remove());
  markers = [];
}

function setSheetImage(id, src, alt) {
  const img = document.getElementById(id);
  if (!img) return;
  img.src = src || FALLBACK_IMAGE;
  img.alt = alt || "";
}

function showCarousel() {
  const el = document.getElementById("carousel");
  if (el) el.classList.remove("hidden");
}

function hideCarousel() {
  const el = document.getElementById("carousel");
  if (el) el.classList.add("hidden");
}

function showPlaceSheet(item) {
  const sheet = document.getElementById("place-sheet");
  if (!sheet) return;

  const title = document.getElementById("sheet-title");
  const subtitle = document.getElementById("sheet-subtitle");
  const info = document.getElementById("sheet-info-text");
  const time = document.getElementById("sheet-time");

  if (title) title.textContent = item.title;
  if (subtitle) {
    subtitle.textContent = `${item.location || "Artwork location"} · ${item.moment || "Explore"}`;
  }
  if (info) {
    info.textContent = item.location
      ? `Explore this artwork near ${item.location}. Open directions to continue to the artwork listing.`
      : "Explore this artwork directly from the map.";
  }
  if (time) {
    time.textContent = item.moment || "Any time";
  }

  setSheetImage("sheet-image-main", item.image, item.title);
  setSheetImage("sheet-image-side-1", item.image, item.title);
  setSheetImage("sheet-image-side-2", item.image, item.title);

  sheet.classList.remove("hidden");
}

function hidePlaceSheet() {
  const sheet = document.getElementById("place-sheet");
  if (sheet) sheet.classList.add("hidden");
}

function updateSelectionState() {
  const activeId = activeItem ? getItemId(activeItem) : null;

  document.querySelectorAll(".card").forEach((card) => {
    const isActive = Boolean(activeId && card.dataset.itemId === activeId);
    card.classList.toggle("active", isActive);

    if (isActive) {
      card.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest"
      });
    }
  });

  document.querySelectorAll(".custom-marker").forEach((markerEl) => {
    const isActive = Boolean(activeId && markerEl.dataset.itemId === activeId);
    markerEl.classList.toggle("active", isActive);
  });
}

function bindPopupClose() {
  const btn = document.querySelector(".popup-close-btn");
  if (!btn) return;

  btn.onclick = (e) => {
    e.stopPropagation();
    resetView();
  };
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
    const edges = json?.data?.products?.edges || [];

    return edges
      .map(({ node }) => {
        const lat = Number.parseFloat(node.lat?.value);
        const lng = Number.parseFloat(node.lng?.value);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

        const item = {
          title: node.title,
          lat,
          lng,
          image: getImageUrl(node),
          link: `${SHOP_URL}/products/${node.handle}`,
          location: node.location?.value || "",
          moment: node.moment?.value || "Explore"
        };

        return { ...item, id: getItemId(item) };
      })
      .filter(Boolean);
  } catch (error) {
    console.warn("Fetch error:", error);
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

map.dragPan.enable();
map.touchZoomRotate.enable();
map.touchZoomRotate.disableRotation();
map.keyboard.enable();
map.doubleClickZoom.enable();

/* =========================
   RESET VIEW
========================= */
function resetView() {
  isResetting = true;

  if (activePopup) {
    activePopup.remove();
    activePopup = null;
  }

  activeItem = null;
  hidePlaceSheet();
  showCarousel();
  updateSelectionState();

  map.flyTo({
    center: HOME_VIEW.center,
    zoom: HOME_VIEW.zoom,
    speed: 0.38,
    curve: 1.7,
    essential: true
  });

  window.setTimeout(() => {
    isResetting = false;
  }, 450);
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
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">
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
  activeItem = item;
  updateSelectionState();
  hideCarousel();

  if (activePopup) {
    activePopup.remove();
    activePopup = null;
  }

  const targetLngLat = [item.lng, item.lat];

  if (isDesktopSheet()) {
    showPlaceSheet(item);

    map.flyTo({
      center: targetLngLat,
      zoom: 15,
      offset: [260, 40],
      speed: 0.34,
      curve: 1.85,
      essential: true
    });

    return;
  }

  showPlaceSheet(item);

  map.flyTo({
    center: targetLngLat,
    zoom: 15.5,
    offset: [0, -180],
    speed: 0.34,
    curve: 1.9,
    essential: true
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
    if (list) {
      const card = document.createElement("div");
      card.className = "card";
      card.dataset.itemId = item.id;

      card.innerHTML = `
        <div class="card-image">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">
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
    el.dataset.itemId = item.id;
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
  updateSelectionState();
}

/* =========================
   UI WIRING
========================= */
function wireDesktopUi() {
  document.getElementById("sheet-close")?.addEventListener("click", resetView);
  document.getElementById("gm-reset")?.addEventListener("click", resetView);


  document.getElementById("sheet-directions")?.addEventListener("click", () => {
    if (activeItem?.link) {
      window.open(activeItem.link, "_blank", "noopener,noreferrer");
    }
  });
}

/* =========================
   INIT
========================= */
map.on("load", async () => {
  listings = await fetchProducts();
  render();
  wireDesktopUi();
  hidePlaceSheet();
  setTimeout(showCarousel, 200);
});

window.addEventListener("resize", () => {
  if (!isDesktopSheet()) {
    hidePlaceSheet();
  } else if (activeItem) {
    showPlaceSheet(activeItem);
  }
});

/* =========================
   MAP CLICK
========================= */
map.on("click", (e) => {
  if (isResetting) return;
  if (e.originalEvent.target.closest(".mapboxgl-popup")) return;
  if (e.originalEvent.target.closest("#google-ui")) return;
  resetView();
});