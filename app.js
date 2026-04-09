

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
   GOOGLE MAPS STYLE GESTURES
========================= */

// disable scroll zoom (prevents page lock)
map.scrollZoom.disable();

// desktop: zoom only with ctrl/cmd
map.getCanvas().addEventListener("wheel", (e) => {
  if (e.ctrlKey || e.metaKey) {
    map.scrollZoom.enable();
  } else {
    map.scrollZoom.disable();
  }
});

// mobile: enable pinch + two-finger pan
map.touchZoomRotate.enable();
map.touchZoomRotate.disableRotation();

// optional: disable double tap zoom
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

  const targetLngLat = [item.lng, item.lat];

  // 🔥 Step 1: fly WITHOUT offset (true center first)
  map.flyTo({
    center: targetLngLat,
    zoom: 15.5,
    speed: 0.8,
    curve: 1.4
  });

  map.once("moveend", () => {

    // 🔥 Step 2: create popup OFFSCREEN to measure
    const tempPopup = createPopup(item)
      .setLngLat(targetLngLat)
      .addTo(map);

    const popupEl = document.querySelector(".mapboxgl-popup");
    if (!popupEl) return;

    const rect = popupEl.getBoundingClientRect();

    // 🔥 Step 3: calculate EXACT offset based on popup height
    const popupHeight = rect.height;

    // how much to push marker down so popup fits above it
    const isDesktop = window.innerWidth > 768;

// 🔥 smarter offset
const offsetY = isDesktop
  ? popupHeight * 0.56   // push more on desktop
  : popupHeight * 0.55;  // lighter on mobile

    // remove temp popup
    tempPopup.remove();

    // 🔥 Step 4: move map ONCE to correct visual position
    map.easeTo({
      center: targetLngLat,
      offset: [0, offsetY],
      duration: 400
    });

    map.once("moveend", () => {

      // 🔥 Step 5: now add REAL popup (perfectly placed)
      const popup = createPopup(item)
        .setLngLat(targetLngLat)
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

    });

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