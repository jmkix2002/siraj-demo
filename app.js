/* =========================
   Navigation
========================= */
function go(screenId) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const el = document.getElementById(screenId);
  if (el) el.classList.add("active");

  if (screenId !== "qr") stopCamera();

  updateUIForScreen(screenId);
  setActiveNav(screenId);

  // ✅ عشان الوضوء يرجع نظيف كل مرة زي دورات المياه
  if (screenId === "wudu") resetWuduUI();
  if (screenId === "restrooms") resetRestroomsUI();

  // ✅ تشغيل القبلة تلقائي عند فتح الشاشة
  if (screenId === "qibla") {
    startQiblaAuto();
  } else {
    stopQibla(); // وقف المستمعات إذا خرجنا من صفحة القبلة
  }
}

/* =========================
   Helpers
========================= */
function toastNotAvailable(){
  alert("الخدمة غير متوفرة حالياً");
}

document.querySelectorAll("[data-service]").forEach(btn=>{
  btn.addEventListener("click", toastNotAvailable);
});

/* =========================
   Bottom nav active state
========================= */
const navHome = document.getElementById("navHome");
const navQr   = document.getElementById("navQr");
const navMenu = document.getElementById("navMenu");

function clearNavActive(){
  [navHome, navQr, navMenu].forEach(b => b && b.classList.remove("active"));
}
function setActiveNav(screenId){
  clearNavActive();

  if (!isLoggedIn()) return;

  if (screenId === "qr"){
    if (navQr) navQr.classList.add("active");
  }else if (screenId === "home" || screenId === "restrooms" || screenId === "wudu" || screenId === "qibla"){
    if (navHome) navHome.classList.add("active");
  }
}

/* =========================
   Welcome text
========================= */
const welcomeText = document.getElementById("welcomeText");
function setWelcome(){
  const session = getSession();
  const name = (session?.name && session.name.trim()) ? session.name.trim() : "ضيف";
  if (welcomeText) welcomeText.textContent = `مرحباً ${name}`;
}

/* =========================
   Auth (LocalStorage)
========================= */
const bottomNav = document.getElementById("bottomNav");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

function getUsers(){
  try { return JSON.parse(localStorage.getItem("siraj_users") || "[]"); }
  catch { return []; }
}
function saveUsers(users){
  localStorage.setItem("siraj_users", JSON.stringify(users));
}
function setSession(user){
  localStorage.setItem("siraj_session", JSON.stringify(user));
}
function getSession(){
  try { return JSON.parse(localStorage.getItem("siraj_session") || "null"); }
  catch { return null; }
}
function isLoggedIn(){
  return !!getSession();
}
function setNavVisible(visible){
  if (!bottomNav) return;
  bottomNav.classList.toggle("is-hidden", !visible);
}
function updateUIForScreen(screenId){
  const showNavScreens = [
    "home",
    "restrooms",
    "wudu",
    "qibla",
    "qr",
    "routes",      // المسارات (صورة الخريطة)
    "duas",        // الأدعية
    "duaView",     // عرض الدعاء
    "paths",       // مسار ذوي الاحتياجات الخاصة
    "medical",     // الخدمات الطبية (إذا عندك شاشة لها)
    "mosques" ,     // المساجد
    "parking",
  ];

  setNavVisible(showNavScreens.includes(screenId) && isLoggedIn());
}


/* Guest */
const guestBtn = document.getElementById("guestBtn");
if (guestBtn){
  guestBtn.addEventListener("click", () => {
    setSession({ type:"guest", name:"ضيف" });
    setNavVisible(true);
    go("home");
    setWelcome();
    loadPrayerTimes();
  });
}

/* Login */
if (loginForm){
  loginForm.addEventListener("submit", (e)=>{
    e.preventDefault();

    const email = loginForm.querySelector('input[type="email"]').value.trim().toLowerCase();
    const pass  = loginForm.querySelector('input[type="password"]').value;

    const users = getUsers();
    const found = users.find(u => u.email === email && u.password === pass);

    if (!found){
      alert("❌ بيانات الدخول غير صحيحة أو الحساب غير موجود");
      return;
    }

    setSession({ type:"user", email: found.email, name: found.name });
    setNavVisible(true);
    go("home");
    setWelcome();
    loadPrayerTimes();
  });
}

/* Register */
if (registerForm){
  registerForm.addEventListener("submit", (e)=>{
    e.preventDefault();

    const inputs = registerForm.querySelectorAll(".input");
    const name  = inputs[0].value.trim();
    const phone = inputs[1].value.trim();
    const email = inputs[2].value.trim().toLowerCase();
    const pass1 = inputs[3].value;
    const pass2 = inputs[4].value;

    if (pass1 !== pass2){
      alert("❌ كلمة المرور وتأكيدها غير متطابقين");
      return;
    }

    const users = getUsers();
    if (users.some(u => u.email === email)){
      alert("❌ هذا البريد مسجل مسبقًا");
      return;
    }

    users.push({ name, phone, email, password: pass1 });
    saveUsers(users);

    setSession({ type:"user", email, name });
    setNavVisible(true);
    go("home");
    setWelcome();
    loadPrayerTimes();
  });
}

/* Splash boot */
document.addEventListener("DOMContentLoaded", () => {
  setNavVisible(false);

  const session = getSession();
  if (session){
    setNavVisible(true);
    go("home");
    setWelcome();
    loadPrayerTimes();
    return;
  }

  setTimeout(() => go("auth"), 1600);
});

/* تسجيل خروج */
function logout(){
  if (!confirm("هل أنت متأكد من تسجيل الخروج؟")) return;

  localStorage.removeItem("siraj_session");
  setNavVisible(false);

  go("splash");
  setTimeout(() => go("auth"), 1600);
}

/* =========================
   Prayer times (Al Madinah) - API
========================= */
let prayerTimer = null;
let prayerData = null;

async function loadPrayerTimes(){
  try{
    const url = "https://api.aladhan.com/v1/timingsByCity?city=Al%20Madinah%20Al%20Munawwarah&country=Saudi%20Arabia&method=4";
    const res = await fetch(url);
    const json = await res.json();

    prayerData = json?.data;
    if (!prayerData) throw new Error("No data");

    const t = prayerData.timings;

    setText("tFajr",    cleanTime(t.Fajr));
    setText("tSunrise", cleanTime(t.Sunrise));
    setText("tDhuhr",   cleanTime(t.Dhuhr));
    setText("tAsr",     cleanTime(t.Asr));
    setText("tMaghrib", cleanTime(t.Maghrib));
    setText("tIsha",    cleanTime(t.Isha));

    const hijri = prayerData.date?.hijri;
    const greg  = prayerData.date?.gregorian;
    const dateText = `${hijri?.weekday?.ar || ""} ${hijri?.date || ""}هـ • ${greg?.date || ""}`;
    setText("prayerDate", dateText.trim() || "—");

    startPrayerCountdown();
  }catch(e){
    setText("prayerDate", "تعذر جلب مواقيت الصلاة (تأكدي أنك متصلة بالنت)");
    setText("prayerRemaining", "—");
  }
}

function setText(id, txt){
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}
function cleanTime(x){
  return String(x || "").split(" ")[0];
}
function startPrayerCountdown(){
  if (prayerTimer) clearInterval(prayerTimer);
  prayerTimer = setInterval(updateCountdown, 1000);
  updateCountdown();
}
function updateCountdown(){
  if (!prayerData) return;

  const t = prayerData.timings;
  const schedule = [
    { name:"الفجر",    time: cleanTime(t.Fajr) },
    { name:"الظهر",    time: cleanTime(t.Dhuhr) },
    { name:"العصر",    time: cleanTime(t.Asr) },
    { name:"المغرب",   time: cleanTime(t.Maghrib) },
    { name:"العشاء",   time: cleanTime(t.Isha) },
  ];

  const now = new Date();

  function toDate(hm){
    const [hh, mm] = hm.split(":").map(Number);
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    return d;
  }

  let next = null;
  for (const p of schedule){
    const d = toDate(p.time);
    if (d > now){ next = { ...p, d }; break; }
  }
  if (!next){
    next = { name:"الفجر", time: cleanTime(t.Fajr), d: toDate(cleanTime(t.Fajr)) };
    next.d.setDate(next.d.getDate() + 1);
  }

  const diff = next.d - now;
  const hh = String(Math.floor(diff / 3600000)).padStart(2,"0");
  const mm = String(Math.floor((diff % 3600000) / 60000)).padStart(2,"0");
  const ss = String(Math.floor((diff % 60000) / 1000)).padStart(2,"0");

  setText("prayerRemaining", `المتبقي على صلاة ${next.name} - ${hh}:${mm}:${ss}`);
}

/* =========================
   Restrooms
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

function resetRestroomsUI(){
  if(!menBtn || !womenBtn) return;

  currentGender = null;

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

function showGender(gender){
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

function renderRestroomList(){
  restroomList.innerHTML = "";
  const items = DATA[currentGender] || [];

  items.forEach((r)=>{
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

    btn.addEventListener("click", ()=> openNavigation(r));
    restroomList.appendChild(btn);
  });
}

function openNavigation(restroom){
  navPanel.classList.remove("hidden");
  selectedRestroomText.textContent = `${restroom.name} • ${restroom.meters}m`;

  routeImg.src = (currentGender === "men")
    ? "assets/images/route-men.png"
    : "assets/images/route-women.png";

  navPanel.scrollIntoView({ behavior:"smooth", block:"start" });
}

if (menBtn && womenBtn){
  resetRestroomsUI();
  menBtn.addEventListener("click", ()=> showGender("men"));
  womenBtn.addEventListener("click", ()=> showGender("women"));
}

if (startNavBtn){
  startNavBtn.addEventListener("click", ()=> alert("✅ تم بدء التوجيه (محاكاة)"));
}

/* =========================
   WUDU (FIXED — SAME AS RESTROOMS)
========================= */
const wMenBtn = document.getElementById("wMenBtn");
const wWomenBtn = document.getElementById("wWomenBtn");
const wudu3dImage = document.getElementById("wudu3dImage");
const wudu3dPlaceholder = document.getElementById("wudu3dPlaceholder");
const wuduListWrap = document.getElementById("wuduListWrap");
const wuduList = document.getElementById("wuduList");
const wuduNavPanel = document.getElementById("wuduNavPanel");
const wuduSelectedText = document.getElementById("wuduSelectedText");
const wuduRouteImg = document.getElementById("wuduRouteImg");
const wuduStartNavBtn = document.getElementById("wuduStartNavBtn");

const WUDU_DATA = {
  men: [
    { id:"WM1", name:"مرفق وضوء (1)", note:"قريب من المدخل", meters: 5 },
    { id:"WM2", name:"مرفق وضوء (2)", note:"قريب من الساحة", meters: 20 },
    { id:"WM3", name:"مرفق وضوء (3)", note:"جهة الممر", meters: 38 },
    { id:"WM4", name:"جهة المواقف", meters: 62 },
  ],
  women: [
    { id:"WW1", name:"مرفق وضوء (1)", note:"قريب من المصلى النسائي", meters: 6 },
    { id:"WW2", name:"مرفق وضوء (2)", note:"قريب من الساحة", meters: 24 },
    { id:"WW3", name:"مرفق وضوء (3)", note:"جهة الممر", meters: 42 },
    { id:"WW4", name:"جهة المواقف", meters: 70 },
  ]
};

let currentWuduGender = null;

function resetWuduUI(){
  if(!wMenBtn || !wWomenBtn) return;

  currentWuduGender = null;

  wMenBtn.classList.remove("active");
  wWomenBtn.classList.remove("active");

  wudu3dImage.classList.add("hidden");
  wudu3dImage.src = "";
  wudu3dPlaceholder.classList.remove("hidden");

  wuduListWrap.classList.add("hidden");
  wuduList.innerHTML = "";

  wuduNavPanel.classList.add("hidden");
  wuduRouteImg.src = "";
  wuduSelectedText.textContent = "";
}

function showWuduGender(gender){
  currentWuduGender = gender;

  wMenBtn.classList.toggle("active", gender === "men");
  wWomenBtn.classList.toggle("active", gender === "women");

  wudu3dPlaceholder.classList.add("hidden");
  wudu3dImage.classList.remove("hidden");

  wudu3dImage.src = (gender === "men")
    ? "assets/images/wudu-men-3d.png"
    : "assets/images/wudu-women-3d.png";

  wuduListWrap.classList.remove("hidden");
  renderWuduList();

  wuduNavPanel.classList.add("hidden");
  wuduRouteImg.src = "";
  wuduSelectedText.textContent = "";
}

function renderWuduList(){
  wuduList.innerHTML = "";
  const items = WUDU_DATA[currentWuduGender] || [];

  items.forEach((r)=>{
    const btn = document.createElement("button");
    btn.className = "restroom-item";
    btn.type = "button";

    btn.innerHTML = `
      <div class="rr-right">
        <div class="rr-icon">${currentWuduGender === "men" ? "🚹" : "🚺"}</div>
        <div>
          <div class="rr-name">${r.name}</div>
          <div class="rr-sub">${r.note || ""}</div>
        </div>
      </div>
      <div class="rr-distance">${r.meters} متر</div>
    `;

    btn.addEventListener("click", ()=> openWuduNavigation(r));
    wuduList.appendChild(btn);
  });
}

function openWuduNavigation(place){
  wuduNavPanel.classList.remove("hidden");
  wuduSelectedText.textContent = `${place.name} • ${place.meters}m`;

  wuduRouteImg.src = (currentWuduGender === "men")
    ? "assets/images/route-wudu-men.png"
    : "assets/images/route-wudu-women.png";

  wuduNavPanel.scrollIntoView({ behavior:"smooth", block:"start" });
}

if (wMenBtn && wWomenBtn){
  resetWuduUI();
  wMenBtn.addEventListener("click", ()=> showWuduGender("men"));
  wWomenBtn.addEventListener("click", ()=> showWuduGender("women"));
}

if (wuduStartNavBtn){
  wuduStartNavBtn.addEventListener("click", ()=> alert("✅ تم بدء التوجيه (محاكاة)"));
}

/* =========================
   PATHS (Dropdown + options)
========================= */
const pathsDdBtn  = document.getElementById("pathsDdBtn");
const pathsDdMenu = document.getElementById("pathsDdMenu");
const pathsDdText = document.getElementById("pathsDdText");

function closePathsMenu(){
  if (pathsDdMenu) pathsDdMenu.classList.add("hidden");
}

if (pathsDdBtn && pathsDdMenu){
  pathsDdBtn.addEventListener("click", ()=>{
    pathsDdMenu.classList.toggle("hidden");
  });

  // إغلاق القائمة إذا ضغطنا خارجها
  document.addEventListener("click", (e)=>{
    const inside = pathsDdBtn.contains(e.target) || pathsDdMenu.contains(e.target);
    if (!inside) closePathsMenu();
  });

  // اختيار عنصر
  pathsDdMenu.querySelectorAll(".paths-item").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const label = btn.textContent.trim();
      if (pathsDdText) pathsDdText.textContent = label;
      closePathsMenu();

      // اختياري: هنا تغيرين الصورة حسب المسار
      // مثال:
      // const img = document.querySelector("#paths .paths-map-img");
      // const key = btn.getAttribute("data-path");
      // if (img && key === "special_parking") img.src = "assets/images/paths-parking.png";
    });
  });
}


/* =========================
   QR Camera
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

async function startCamera(){
  if (!qrVideo) return;

  try{
    qrStream = await navigator.mediaDevices.getUserMedia({
      video:{ facingMode:"environment" },
      audio:false
    });

    qrVideo.srcObject = qrStream;
    videoTrack = qrStream.getVideoTracks()[0];

    qrVideo.style.display = "block";
    if (qrTap) qrTap.style.display = "none";
  }catch(e){
    alert("ما قدرنا نفتح الكاميرا. افتحي الرابط من Chrome على الجوال واسمحي للكاميرا.");
  }
}

function stopCamera(){
  if (qrStream){
    qrStream.getTracks().forEach(t => t.stop());
    qrStream = null;
    videoTrack = null;
    torchOn = false;
  }
  if (qrVideo){
    qrVideo.srcObject = null;
    qrVideo.style.display = "none";
  }
  if (qrTap) qrTap.style.display = "flex";

  if (flashBtn){
    flashBtn.classList.remove("active");
    flashBtn.textContent = "⚡ فلاش";
    flashBtn.disabled = false;
  }
}

if (qrBox){
  qrBox.addEventListener("click", ()=>{
    if (!qrStream) startCamera();
    setTimeout(fakeScanOnce, 120);
  });
}

if (flashBtn){
  flashBtn.addEventListener("click", async ()=>{
    if (!videoTrack || !videoTrack.applyConstraints) return;

    const caps = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
    if (!caps.torch) return;

    torchOn = !torchOn;
    await videoTrack.applyConstraints({ advanced:[{ torch: torchOn }] });
    flashBtn.classList.toggle("active", torchOn);
  });
}

if (qrClearBtn){
  qrClearBtn.addEventListener("click", ()=>{
    if (qrResult) qrResult.classList.add("hidden");
    if (qrResultText) qrResultText.textContent = "";
    stopCamera();
  });
}

function fakeScanOnce(){
  if (!qrStream) return;
  setTimeout(()=>{
    if (!qrStream) return;
    if (qrResult && qrResultText){
      qrResultText.textContent = "DEMO-QR-12345";
      qrResult.classList.remove("hidden");
    }
  }, 2000);
}

/* =========================
   QIBLA (FIXED — STABLE + NO DOUBLE + NO SPLIT TEXT)
========================= */
const qiblaEnableBtn = document.getElementById("qiblaEnableBtn");
const qiblaNeedle    = document.getElementById("qiblaNeedle");
const qiblaDeg       = document.getElementById("qiblaDeg");
const qiblaHint      = document.getElementById("qiblaHint");
const qiblaDegNum    = document.getElementById("qiblaDegNum");

// إحداثيات الكعبة
const KAABA = { lat: 21.422487, lon: 39.826206 };

let qiblaBearing = null;   // 0..360
let heading = null;        // 0..360 (بعد الفلترة)
let didBuzz = false;
let qiblaListening = false;

// الوصول للقبلة ±7 درجات (أكثر ثبات)
const DEG_THRESHOLD = 7;

// تثبيت/فلترة القراءة
let smoothHeading = null;
const SMOOTH_ALPHA = 0.06;  // أثبت
const JITTER_DEG = 3.0;     // تجاهل تغيّر أقل من 3 درجات

// ثبات الاهتزاز: لازم يثبت داخل العتبة 1 ثانية
let inRangeSince = null;
const BUZZ_HOLD_MS = 1000;
const RESET_EXTRA_DEG = 3;

// تقليل عدد التحديثات (Throttle)
let lastUpdateTs = 0;
const ORIENT_THROTTLE_MS = 80;

function toRad(d){ return d * Math.PI / 180; }
function toDeg(r){ return r * 180 / Math.PI; }
function norm360(a){
  a = a % 360;
  if (a < 0) a += 360;
  return a;
}
function angleDiff(a, b){
  let d = norm360(a) - norm360(b);
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}
function smallAngleDelta(a, b){
  return Math.abs(angleDiff(a, b));
}
function smoothAngle(prev, next, alpha){
  if (prev == null) return next;
  const d = angleDiff(next, prev);
  return norm360(prev + d * alpha);
}

function calcBearing(lat1, lon1, lat2, lon2){
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);

  return norm360(toDeg(Math.atan2(y, x)));
}

function updateQiblaUI(){
  if (!qiblaNeedle) return;

  if (qiblaBearing == null || heading == null){
    if (qiblaDegNum) qiblaDegNum.textContent = "--";
    return;
  }

  const rotate = angleDiff(qiblaBearing, heading);

  // ✅ مهم: transform كامل عشان ما ينكسر translate
  qiblaNeedle.style.transform = `translate(-50%,-50%) rotate(${rotate}deg)`;

  const err = Math.abs(rotate);

  // ✅ عرض رقم واحد فقط (بدون انقسام RTL)
  if (qiblaDegNum) qiblaDegNum.textContent = String(Math.round(err));

  // اهتزاز مضبوط: بعد ثبات 1 ثانية + لا يعيد الاهتزاز إلا إذا خرج بعيد
  const nowTs = Date.now();

  if (err <= DEG_THRESHOLD){
    if (inRangeSince == null) inRangeSince = nowTs;

    if (!didBuzz && (nowTs - inRangeSince) >= BUZZ_HOLD_MS){
      didBuzz = true;
      if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
      if (qiblaHint) qiblaHint.textContent = "✅ تم ضبط اتجاه القبلة";
    }
  } else {
    inRangeSince = null;

    if (didBuzz && err > (DEG_THRESHOLD + RESET_EXTRA_DEG)){
      didBuzz = false;
    }
    if (qiblaHint) qiblaHint.textContent = "حرّكي الجوال حتى تقل الزاوية";
  }
}

function requestLocationForQibla(){
  return new Promise((resolve, reject)=>{
    if (!navigator.geolocation) return reject(new Error("NO_GEO"));

    navigator.geolocation.getCurrentPosition(
      (pos)=>{
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        qiblaBearing = calcBearing(lat, lon, KAABA.lat, KAABA.lon);
        resolve(true);
      },
      ()=>reject(new Error("GEO_DENIED")),
      { enableHighAccuracy:true, timeout: 12000, maximumAge:0 }
    );
  });
}

function getHeadingFromEvent(evt){
  // iOS Safari
  if (typeof evt.webkitCompassHeading === "number" && !Number.isNaN(evt.webkitCompassHeading)){
    return norm360(evt.webkitCompassHeading);
  }

  // Android/Chrome
  if (typeof evt.alpha === "number" && !Number.isNaN(evt.alpha)){
    return norm360(360 - evt.alpha);
  }

  return null;
}

function onOrientation(evt){
  const raw = getHeadingFromEvent(evt);
  if (raw == null) return;

  const now = performance.now();
  if (now - lastUpdateTs < ORIENT_THROTTLE_MS) return;
  lastUpdateTs = now;

  if (heading != null && smallAngleDelta(raw, heading) < JITTER_DEG) return;

  smoothHeading = smoothAngle(smoothHeading, raw, SMOOTH_ALPHA);
  heading = smoothHeading;

  updateQiblaUI();
}

function startQiblaListeners(){
  if (qiblaListening) return;

  window.addEventListener("deviceorientationabsolute", onOrientation, true);

  // fallback إذا ما أعطى absolute قراءة
  setTimeout(() => {
    if (!qiblaListening) return;
    if (heading == null){
      window.removeEventListener("deviceorientationabsolute", onOrientation, true);
      window.addEventListener("deviceorientation", onOrientation, true);
    }
  }, 1200);

  qiblaListening = true;
}

function stopQibla(){
  if (qiblaListening){
    window.removeEventListener("deviceorientationabsolute", onOrientation, true);
    window.removeEventListener("deviceorientation", onOrientation, true);
    qiblaListening = false;
  }
  heading = null;
  smoothHeading = null;
  didBuzz = false;
  inRangeSince = null;
  updateQiblaUI();
}

async function enableQiblaByButton(){
  try{
    didBuzz = false;
    heading = null;
    smoothHeading = null;
    inRangeSince = null;

    if (!window.isSecureContext){
      if (qiblaHint) qiblaHint.textContent = "❌ لازم HTTPS أو localhost عشان البوصلة تشتغل";
      return;
    }

    if (qiblaHint) qiblaHint.textContent = "جاري طلب إذن الموقع...";

    await requestLocationForQibla();

    // iOS: لازم إذن Motion من زر
    if (typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"){
      if (qiblaHint) qiblaHint.textContent = "جاري طلب إذن البوصلة...";
      const res = await DeviceOrientationEvent.requestPermission();
      if (res !== "granted"){
        if (qiblaHint) qiblaHint.textContent = "❌ تم رفض إذن البوصلة";
        return;
      }
    }

    startQiblaListeners();

    if (qiblaHint) qiblaHint.textContent = "✅ تم التفعيل، حرّكي الجوال";
    updateQiblaUI();
  } catch(e){
    if (qiblaHint){
      if (String(e?.message).includes("GEO_DENIED")){
        qiblaHint.textContent = "❌ تم رفض إذن الموقع";
      } else if (String(e?.message).includes("NO_GEO")){
        qiblaHint.textContent = "❌ جهازك لا يدعم تحديد الموقع";
      } else {
        qiblaHint.textContent = "❌ تعذر التفعيل، جرّبي Safari/Chrome على الجوال";
      }
    }
  }
}

if (qiblaEnableBtn){
  qiblaEnableBtn.addEventListener("click", enableQiblaByButton);
}

function startQiblaAuto(){
  stopQibla();
  qiblaBearing = null;
  heading = null;
  smoothHeading = null;
  didBuzz = false;
  inRangeSince = null;

  if (qiblaHint) qiblaHint.textContent = "اضغطي تفعيل واسمحي بالأذونات";
  updateQiblaUI();
}
/* =========================
   DUAS (List + View)
========================= */
const DUA_DATA = [
  {
    title: "أدعية من القرآن",
    duas: [
      "رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا...\nوَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا\nأَنتَ مَوْلَانَا فَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ",
      "رَبِّ اشْرَحْ لِي صَدْرِي * وَيَسِّرْ لِي أَمْرِي",
      "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ"
    ]
  },
  {
    title: "من دعاء الرسول",
    duas: [
      "اللهم إني أسألك العفوَ والعافيةَ في الدنيا والآخرة",
      "اللهم آتنا في الدنيا حسنةً وفي الآخرة حسنةً وقِنا عذاب النار",
      "اللهم إني أعوذ بك من الهمّ والحَزَن، والعجزِ والكسل..."
    ]
  },
  {
    title: "دعاء الكرب",
    duas: [
      "لا إله إلا الله العظيم الحليم، لا إله إلا الله رب العرش العظيم...",
      "حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم"
    ]
  },
  {
    title: "أدعية للرزق والبركة",
    duas: [
      "اللهم اكفني بحلالك عن حرامك وأغنني بفضلك عمّن سواك",
      "اللهم بارك لي فيما رزقتني وزدني من فضلك"
    ]
  },
  {
    title: "أدعية الطواف",
    duas: [
      "ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار",
      "اللهم اجعلها عمرةً مقبولةً وسعياً مشكوراً وذنباً مغفوراً"
    ]
  },
  {
    title: "دعاء الوقوف على الصفا والمروة",
    duas: [
      "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير",
      "اللهم إني أسألك الهدى والتقى والعفاف والغنى"
    ]
  },
  {
    title: "أفضل الذكر",
    duas: [
      "سبحان الله وبحمده، سبحان الله العظيم",
      "لا إله إلا الله وحده لا شريك له..."
    ]
  },
  {
    title: "دعاء الحمد والثناء",
    duas: [
      "اللهم لك الحمد كما ينبغي لجلال وجهك وعظيم سلطانك",
      "الحمد لله حمداً كثيراً طيباً مباركاً فيه"
    ]
  },
  {
    title: "الذكر عند المشعر الحرام",
    duas: [
      "الله أكبر الله أكبر لا إله إلا الله، والله أكبر ولله الحمد",
      "اللهم اهدِ قلبي وسدد لساني"
    ]
  },
  {
    title: "الاستغفار والتوبة",
    duas: [
      "أستغفر الله العظيم وأتوب إليه",
      "رب اغفر لي وتب علي إنك أنت التواب الرحيم"
    ]
  },
  {
    title: "أدعية يوم عرفة",
    duas: [
      "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير",
      "اللهم اجعلني من عتقائك من النار واغفر لي ولوالدي"
    ]
  },
  {
    title: "أدعية عامة",
    duas: [
      "اللهم أصلح لي ديني الذي هو عصمة أمري، وأصلح لي دنياي...",
      "اللهم اجعلني لك شكاراً لك ذكاراً لك رهّاباً"
    ]
  }
];

const duaGrid = document.getElementById("duaGrid");
const duaViewTitle = document.getElementById("duaViewTitle");
const duaText = document.getElementById("duaText");
const duaNextBtn = document.getElementById("duaNextBtn");

let currentDuaCategoryIndex = 0;
let currentDuaIndex = 0;

function renderDuaGrid(){
  if (!duaGrid) return;
  duaGrid.innerHTML = "";

  DUA_DATA.forEach((cat, idx)=>{
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dua-btn";
    btn.textContent = cat.title;

    btn.addEventListener("click", ()=>{
      currentDuaCategoryIndex = idx;
      currentDuaIndex = 0;
      openDuaView();
    });

    duaGrid.appendChild(btn);
  });
}

function openDuaView(){
  const cat = DUA_DATA[currentDuaCategoryIndex];
  if (duaViewTitle) duaViewTitle.textContent = cat.title;

  showCurrentDua();
  go("duaView");
}

function showCurrentDua(){
  const cat = DUA_DATA[currentDuaCategoryIndex];
  const list = cat.duas || [];
  if (!list.length){
    if (duaText) duaText.textContent = "لا يوجد أدعية حالياً";
    return;
  }
  const txt = list[currentDuaIndex] || "—";
  if (duaText) duaText.textContent = txt;
}

if (duaNextBtn){
  duaNextBtn.addEventListener("click", ()=>{
    const cat = DUA_DATA[currentDuaCategoryIndex];
    const list = cat.duas || [];
    if (!list.length) return;

    currentDuaIndex = (currentDuaIndex + 1) % list.length;
    showCurrentDua();
  });
}

/* تشغيل بناء القائمة عند تحميل الصفحة */
document.addEventListener("DOMContentLoaded", ()=>{
  renderDuaGrid();
});
 /* =========================
   MEDICAL (Hospitals UI)
========================= */
const hospitalList = document.getElementById("hospitalList");
const hospitalSearch = document.getElementById("hospitalSearch");

const HOSPITALS = [
  {
    id: "h1",
    name: "مدينة الملك سلمان بن عبدالعزيز الطبية",
    sub: "شارع عبدالحميد بن عبدالله بن أبي أويس, Mahzur, Madinah 42316",
    img: "./assets/images/h1.jpg"
  },
  {
    id: "h2",
    name: "مستشفى الحياة الوطني - المدينة المنورة",
    sub: "Al Hijrah Rd, Al Jumuah, Madinah 42316",
    img: "./assets/images/h2.png"
  },
  {
    id: "h3",
    name: "مستشفى الدكتور سليمان فقيه",
    sub: "King Abdullah Branch Rd, King Abdullah bin Abdulaziz Rd, Madinah 42312",
    img: "./assets/images/h3.jpg"
  },
  {
    id: "h4",
    name:"مستشفى االدينة الوطني ",
    sub: "الحزام سابقا, Prince Abdulmajeed Ibn Abdulaziz, Ash Shuraybat, Madinah 42316",
    img: "./assets/images/h4.jpg"
  },
  {
    id: "h5",
    name: "مستشفى أحد الأنصار الجديد",
    sub: "DMWD4461، 6579 عمران ابن ابي عطاء القصاب، حي الرانوناء، 4461, Madinah 42392",
    img: "./assets/images/h5.png"
  }
];

function renderHospitals(list){
  if (!hospitalList) return;
  hospitalList.innerHTML = "";

  list.forEach(h => {
    const card = document.createElement("div");
    card.className = "hospital-card";

    card.innerHTML = `
      <button class="hospital-arrow" type="button" aria-label="تفاصيل">‹</button>

      <div class="hospital-info">
        <h3 class="hospital-name">${h.name}</h3>
        <p class="hospital-sub">${h.sub}</p>
      </div>

      <img class="hospital-img" src="${h.img}" alt="${h.name}">
    `;

    // لو تبين عند الضغط يفتح صفحة تفاصيل أو خريطة:
    card.querySelector(".hospital-arrow").addEventListener("click", ()=>{
      alert("✅ تفاصيل المستشفى (محاكاة): " + h.name);
      // هنا تقدرين تسوين go('hospitalDetails') أو تفتحين Google Maps
    });

    hospitalList.appendChild(card);
  });
}

function filterHospitals(){
  const q = (hospitalSearch?.value || "").trim().toLowerCase();
  const filtered = HOSPITALS.filter(h =>
    h.name.toLowerCase().includes(q) || h.sub.toLowerCase().includes(q)
  );
  renderHospitals(filtered);
}

if (hospitalSearch){
  hospitalSearch.addEventListener("input", filterHospitals);
}

// تشغيل أولي
document.addEventListener("DOMContentLoaded", ()=>{
  renderHospitals(HOSPITALS);
});
 
/* =========================
   MOSQUES (Same as Hospitals)
========================= */
const mosqueList   = document.getElementById("mosqueList");
const mosqueSearch = document.getElementById("mosqueSearch");

const MOSQUES = [
  {
    id: "m1",
    name: "مسجد الجمعة",
    sub: "Al Jummah, Madinah 42316",
    img: "assets/images/m1.jpg"
  },
  {
    id: "m2",
    name: "مسجد الغمامة",
    sub: "Quba Rd, Madinah 42316",
    img: "assets/images/m2.jpg"
  },
  {
    id: "m3",
    name: "السبعة المساجد",
    sub: "Sayed Al Shohada, Madinah 42321",
    img: "assets/images/m3.jpg"
  },
  {
    id: "m4",
    name: "مسجد سيد الشهداء",
    sub: "Uhud Area, Madinah 42321",
    img: "assets/images/m4.jpg"
  },
  {
    id: "m5",
    name: "مسجد الميقات",
    sub: "Abyar Ali, Madinah",
    img: "assets/images/m5.jpg"
  }
];

function renderMosques(list){
  if (!mosqueList) return;
  mosqueList.innerHTML = "";

  list.forEach(m => {
    const card = document.createElement("div");
    card.className = "hospital-card"; // نفس كرت المستشفى

    card.innerHTML = `
      <button class="hospital-arrow" type="button">↰</button>

      <div class="hospital-info">
        <h3 class="hospital-name">${m.name}</h3>
        <p class="hospital-sub">${m.sub}</p>
      </div>

      <img class="hospital-img" src="${m.img}" alt="${m.name}">
    `;

    card.querySelector(".hospital-arrow").addEventListener("click", ()=>{
      alert("🕌 فتح تفاصيل المسجد (محاكاة)");
    });

    mosqueList.appendChild(card);
  });
}

function filterMosques(){
  const q = (mosqueSearch?.value || "").toLowerCase();
  const filtered = MOSQUES.filter(m =>
    m.name.toLowerCase().includes(q) ||
    m.sub.toLowerCase().includes(q)
  );
  renderMosques(filtered);
}

if (mosqueSearch){
  mosqueSearch.addEventListener("input", filterMosques);
}

document.addEventListener("DOMContentLoaded", ()=>{
  renderMosques(MOSQUES);
});
