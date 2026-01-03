function go(screenId) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(screenId).classList.add("active");
}

/* طلب الموقع من الخريطة الرئيسية */
const mapLayer = document.getElementById("mapClickLayer");
if (mapLayer) mapLayer.addEventListener("click", () => requestLocation());

function requestLocation() {
  if (!navigator.geolocation) return;

  if (location.protocol === "file:") {
    alert("شغّلي المشروع عبر Live Server أو GitHub Pages عشان الموقع يشتغل.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      mapLayer.style.display = "none";

      const delta = 0.01;
      const left = (lon - delta).toFixed(6);
      const bottom = (lat - delta).toFixed(6);
      const right = (lon + delta).toFixed(6);
      const top = (lat + delta).toFixed(6);

      const frame = document.getElementById("mapFrame");
      if (frame) {
        frame.src = `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lon}`;
      }
    },
    () => alert("تم رفض إذن الموقع أو تعذر تحديده."),
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
  );
}

/* =========================
   ✅ دورات المياه (جديد)
========================= */
const menBtn = document.getElementById("menBtn");
const womenBtn = document.getElementById("womenBtn");

const wc3dImage = document.getElementById("wc3dImage");
const wc3dPlaceholder = document.getElementById("wc3dPlaceholder");

const listWrap = document.getElementById("listWrap");
const restroomList = document.getElementById("restroomList");

const navPanel = document.getElementById("navPanel");
const selectedRestroomText = document.getElementById("selectedRestroomText");
const routeImg = document.getElementById("routeImg");
const startNavBtn = document.getElementById("startNavBtn");

/* بيانات تجريبية (تقدري تغيّريها متى ما تبغين) */
const DATA = {
  men: [
    { id: "M1", name: "دورة مياه (1)", note: "قريبة من المدخل", meters: 2 },
    { id: "M2", name: "دورة مياه (2)", note: "قريبة من الساحة", meters: 18 },
    { id: "M3", name: "دورة مياه (3)", note: "قريبة من الممر", meters: 35 },
    { id: "M4", name: "دورة مياه (4)", note: "جهة المواقف", meters: 60 }
  ],
  women: [
    { id: "W1", name: "دورة مياه (1)", note: "قريبة من المصلى النسائي", meters: 3 },
    { id: "W2", name: "دورة مياه (2)", note: "قريبة من الساحة", meters: 22 },
    { id: "W3", name: "دورة مياه (3)", note: "جهة الممر", meters: 40 },
    { id: "W4", name: "دورة مياه (4)", note: "جهة المواقف", meters: 65 }
  ]
};

let currentGender = null;

function resetRestroomsUI() {
  // أزرار
  menBtn.classList.remove("active");
  womenBtn.classList.remove("active");

  // 3D
  wc3dImage.classList.add("hidden");
  wc3dImage.src = "";
  wc3dPlaceholder.classList.remove("hidden");

  // قائمة
  listWrap.classList.add("hidden");
  restroomList.innerHTML = "";

  // لوحة التوجيه
  navPanel.classList.add("hidden");
  routeImg.src = "";
  selectedRestroomText.textContent = "";
}

function showGender(gender) {
  currentGender = gender;

  // تفعيل الزر
  menBtn.classList.toggle("active", gender === "men");
  womenBtn.classList.toggle("active", gender === "women");

  // إظهار صورة 3D + إخفاء placeholder
  wc3dPlaceholder.classList.add("hidden");
  wc3dImage.classList.remove("hidden");

  if (gender === "men") {
    wc3dImage.src = "assets/images/wc-men-3d.png";
  } else {
    wc3dImage.src = "assets/images/wc-women-3d.png";
  }

  // إظهار القائمة
  listWrap.classList.remove("hidden");
  renderRestroomList();
  
  // أخفي واجهة التوجيه لين تختارين دورة
  navPanel.classList.add("hidden");
  routeImg.src = "";
  selectedRestroomText.textContent = "";
}

function renderRestroomList() {
  restroomList.innerHTML = "";

  const items = DATA[currentGender] || [];
  items.forEach((r) => {
    const btn = document.createElement("button");
    btn.className = "restroom-item";
    btn.type = "button";

    btn.innerHTML = `
      <div class="rr-right">
        <div class="rr-icon">${currentGender === "men" ? "🚹" : "🚺"}</div>
        <div>
          <div class="rr-name">${r.name}</div>
          <div class="rr-sub">${r.note}</div>
        </div>
      </div>
      <div class="rr-distance">${r.meters} متر</div>
    `;

    btn.addEventListener("click", () => openNavigation(r));
    restroomList.appendChild(btn);
  });
}

function openNavigation(restroom) {
  // اظهار لوحة التوجيه
  navPanel.classList.remove("hidden");

  // نص مختصر فوق
  selectedRestroomText.textContent = `${restroom.name} • ${restroom.meters}m`;

  // ✅ هنا نعرض صورة "ابدأ التوجيه" حسب رجال/نساء
  if (currentGender === "men") {
    routeImg.src = "assets/images/route-men.png";
  } else {
    routeImg.src = "assets/images/route-women.png";
  }

  // سكرول تلقائي للوحة التوجيه عشان المستخدم يشوفها
  navPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

if (menBtn && womenBtn) {
  resetRestroomsUI();

  menBtn.addEventListener("click", () => showGender("men"));
  womenBtn.addEventListener("click", () => showGender("women"));
}

if (startNavBtn) {
  startNavBtn.addEventListener("click", () => {
    if (!currentGender) {
      alert("اختاري رجال أو نساء أولاً.");
      return;
    }
    alert("✅ تم بدء التوجيه (محاكاة)");
  });
}
