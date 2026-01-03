function go(screenId) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(screenId).classList.add("active");

  // إذا دخلتي QR لا نفتح تلقائي—تفتح بالضغط على المربع
}

function toastNotAvailable(){
  alert("الخدمة غير متوفرة حالياً");
}

document.querySelectorAll("[data-service]").forEach(btn=>{
  btn.addEventListener("click", toastNotAvailable);
});

/* =========================
   طلب الموقع من الخريطة الرئيسية
========================= */
const mapLayer = document.getElementById("mapClickLayer");
if (mapLayer) mapLayer.addEventListener("click", () => requestLocation());

function requestLocation() {
  if (!navigator.geolocation) return;

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
   ✅ دورات المياه (نفس القديم)
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
  if(!menBtn || !womenBtn) return;

  menBtn.classList.remove("active");
  womenBtn.classList.remove("active");

  wc3dImage.classList.add("hidden");
  wc3dImage.src = "";
  wc3dPlaceholder.classList.remove("hidden");

  listWrap.classList.add("hidden");
  restroomList.innerHTML = "";

  navPanel.classList.add("hidden");
  routeImg.src = "";
  selectedRestroomText.textContent = "";
}

function showGender(gender) {
  currentGender = gender;

  menBtn.classList.toggle("active", gender === "men");
  womenBtn.classList.toggle("active", gender === "women");

  wc3dPlaceholder.classList.add("hidden");
  wc3dImage.classList.remove("hidden");

  wc3dImage.src = (gender === "men")
    ? "assets/images/wc-men-3d.png"
    : "assets/images/wc-women-3d.png";

  listWrap.classList.remove("hidden");
  renderRestroomList();

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
  navPanel.classList.remove("hidden");
  selectedRestroomText.textContent = `${restroom.name} • ${restroom.meters}m`;

  routeImg.src = (currentGender === "men")
    ? "assets/images/route-men.png"
    : "assets/images/route-women.png";

  navPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

if (menBtn && womenBtn) {
  resetRestroomsUI();
  menBtn.addEventListener("click", () => showGender("men"));
  womenBtn.addEventListener("click", () => showGender("women"));
}

if (startNavBtn) {
  startNavBtn.addEventListener("click", () => alert("✅ تم بدء التوجيه (محاكاة)"));
}

/* =========================
   ✅ QR Camera (داخل المربع فقط)
========================= */
let qrStream = null;
let videoTrack = null;
let torchOn = false;

const qrBox = document.getElementById("qrBox");
const qrVideo = document.getElementById("qrVideo");
const qrTap = document.getElementById("qrTap");
const flashBtn = document.getElementById("flashBtn");

const qrResult = document.getElementById("qrResult");
const qrResultText = document.getElementById("qrResultText");
const qrClearBtn = document.getElementById("qrClearBtn");

async function startCamera() {
  if (!qrVideo) return;

  try {
    qrStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });

    qrVideo.srcObject = qrStream;
    videoTrack = qrStream.getVideoTracks()[0];

    qrVideo.style.display = "block";
    if (qrTap) qrTap.style.display = "none";

    // فلاش (إذا مدعوم)
    const caps = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
    if (!caps.torch) {
      flashBtn.disabled = true;
      flashBtn.textContent = "⚡ فلاش (غير مدعوم)";
    } else {
      flashBtn.disabled = false;
      flashBtn.textContent = "⚡ فلاش";
    }

  } catch (e) {
    alert("ما قدرنا نفتح الكاميرا. افتحي الرابط من Chrome على الجوال واسمحي للكاميرا.");
  }
}

function stopCamera() {
  if (qrStream) {
    qrStream.getTracks().forEach(t => t.stop());
    qrStream = null;
    videoTrack = null;
    torchOn = false;
  }
  if (qrVideo) {
    qrVideo.srcObject = null;
    qrVideo.style.display = "none";
  }
  if (qrTap) qrTap.style.display = "flex";

  if (flashBtn) {
    flashBtn.classList.remove("active");
    flashBtn.textContent = "⚡ فلاش";
    flashBtn.disabled = false;
  }
}

if (qrBox) {
  qrBox.addEventListener("click", () => {
    if (!qrStream) startCamera();
  });
}

if (flashBtn) {
  flashBtn.addEventListener("click", async () => {
    if (!videoTrack || !videoTrack.applyConstraints) return;

    const caps = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
    if (!caps.torch) return;

    torchOn = !torchOn;
    await videoTrack.applyConstraints({ advanced: [{ torch: torchOn }] });
    flashBtn.classList.toggle("active", torchOn);
  });
}

if (qrClearBtn) {
  qrClearBtn.addEventListener("click", () => {
    // مسح نتيجة + رجّع واجهة نظيفة + اطفئ الكاميرا
    if (qrResult) qrResult.classList.add("hidden");
    if (qrResultText) qrResultText.textContent = "";
    stopCamera();
  });
}

/* محاكاة بسيطة: أول ما تفتح الكاميرا اعتبريه "تم مسح" بعد 2 ثانية */
function fakeScanOnce() {
  if (!qrStream) return;
  setTimeout(() => {
    if (!qrStream) return;
    if (qrResult && qrResultText) {
      qrResultText.textContent = "DEMO-QR-12345";
      qrResult.classList.remove("hidden");
    }
  }, 2000);
}
if (qrBox) {
  qrBox.addEventListener("click", () => {
    setTimeout(fakeScanOnce, 100);
  });
}
