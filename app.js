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
  if (screenId === "wudu") {
    resetWuduUI();
  }
  if (screenId === "restrooms") {
    resetRestroomsUI();
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
  }else if (screenId === "home" || screenId === "restrooms" || screenId === "wudu"){
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
  const showNavScreens = ["home", "restrooms", "wudu", "qr"];
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
   Map geolocation (works on Live Server)
========================= */
const mapLayer = document.getElementById("mapClickLayer");
if (mapLayer) mapLayer.addEventListener("click", () => requestLocation());

function requestLocation() {
  if (!navigator.geolocation){
    alert("المتصفح لا يدعم تحديد الموقع");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      const delta = 0.01;
      const left = (lon - delta).toFixed(6);
      const bottom = (lat - delta).toFixed(6);
      const right = (lon + delta).toFixed(6);
      const top = (lat + delta).toFixed(6);

      const frame = document.getElementById("mapFrame");
      if (frame) {
        frame.src =
          `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}` +
          `&layer=mapnik&marker=${lat}%2C${lon}`;
      }
    },
    () => alert("تم رفض إذن الموقع أو تعذر تحديده.\nملاحظة: لازم تفتحيه عبر Live Server."),
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
  );
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
    { id:"WM4", name:"مرفق وضوء (4)", note:"جهة المواقف", meters: 62 },
  ],
  women: [
    { id:"WW1", name:"مرفق وضوء (1)", note:"قريب من المصلى النسائي", meters: 6 },
    { id:"WW2", name:"مرفق وضوء (2)", note:"قريب من الساحة", meters: 24 },
    { id:"WW3", name:"مرفق وضوء (3)", note:"جهة الممر", meters: 42 },
    { id:"WW4", name:"مرفق وضوء (4)", note:"جهة المواقف", meters: 70 },
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
          <div class="rr-sub">${r.note}</div>
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
   QIBLA (Real Direction)
========================= */
const qiblaEnableBtn = document.getElementById("qiblaEnableBtn");
const qiblaNeedle = document.getElementById("qiblaNeedle");
const qiblaDeg = document.getElementById("qiblaDeg");
const qiblaHint = document.getElementById("qiblaHint");

// إحداثيات الكعبة
const KAABA = { lat: 21.422487, lon: 39.826206 };

let userPos = null;
let qiblaBearing = null;     // زاوية القبلة من الشمال الحقيقي
let currentHeading = null;   // اتجاه الجهاز

function toRad(d){ return d * Math.PI / 180; }
function toDeg(r){ return r * 180 / Math.PI; }
function norm360(a){
  a = a % 360;
  if (a < 0) a += 360;
  return a;
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

  if (qiblaBearing == null || currentHeading == null){
    qiblaDeg && (qiblaDeg.textContent = "--°");
    return;
  }

  // كم نلف السهم؟ = bearing القبلة - heading الجهاز
  const diff = norm360(qiblaBearing - currentHeading);

  qiblaNeedle.style.transform = `translate(-50%,-50%) rotate(${diff}deg)`;
  qiblaDeg && (qiblaDeg.textContent = `${Math.round(qiblaBearing)}°`);
}

function requestLocationForQibla(){
  return new Promise((resolve, reject)=>{
    if (!navigator.geolocation) return reject("المتصفح لا يدعم تحديد الموقع");

    navigator.geolocation.getCurrentPosition(
      (pos)=>{
        userPos = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        qiblaBearing = calcBearing(userPos.lat, userPos.lon, KAABA.lat, KAABA.lon);
        resolve(true);
      },
      ()=>reject("تم رفض إذن الموقع أو تعذر تحديده"),
      { enableHighAccuracy:true, timeout: 10000, maximumAge:0 }
    );
  });
}

function handleOrientation(evt){
  // iOS يعطي webkitCompassHeading
  if (typeof evt.webkitCompassHeading === "number"){
    currentHeading = norm360(evt.webkitCompassHeading);
  } else if (typeof evt.alpha === "number"){
    // alpha: 0 = شمال (لكن تختلف حسب الجهاز/المتصفح)
    currentHeading = norm360(360 - evt.alpha);
  } else {
    return;
  }
  updateQiblaUI();
}

async function enableQibla(){
  try{
    qiblaHint && (qiblaHint.textContent = "جاري التفعيل...");

    await requestLocationForQibla();

    // طلب إذن البوصلة في iOS
    if (typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"){
      const res = await DeviceOrientationEvent.requestPermission();
      if (res !== "granted") throw new Error("تم رفض إذن البوصلة");
    }

    window.addEventListener("deviceorientation", handleOrientation, true);

    qiblaHint && (qiblaHint.textContent = "حرّكي الجوال شوي لين تثبت البوصلة ✅");
    updateQiblaUI();
  }catch(e){
    qiblaHint && (qiblaHint.textContent = "ما اشتغل: " + (e?.message || e));
  }
}

if (qiblaEnableBtn){
  qiblaEnableBtn.addEventListener("click", enableQibla);
}
