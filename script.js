/* script.js - site d'actualités
   - Multi-langues (fr/en/sw/ar)
   - Plusieurs flux par catégorie/langue (voir RSS_SOURCES_BY_LANG)
   - Scroll infini jusqu'à 1000 articles
   - Mode sombre, sélecteur langue, notifications
   - Sauvegarde articles en localStorage pour detail.html
*/

// Avant :
const RSS2JSON = url => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
/* ---------------------------
   Sources RSS par langue / catégorie
   Ajoute / remplace les flux selon besoins.
   Certains flux peuvent être limités par CORS ou abonnement.
----------------------------*/
const RSS_SOURCES_BY_LANG = {
  fr: {
    actualites: [
      "https://www.france24.com/fr/rss",
      "https://www.france24.com/fr/france/rss",
      "https://www.rfi.fr/fr/rss",
      "https://www.lemonde.fr/rss/une.xml",
      "https://www.bfmtv.com/rss/fil-info/",
      "https://www.lepoint.fr/rss.xml",
      "https://www.liberation.fr/rss",
      "https://www.jeuneafrique.com/rss/",
      "https://afrique.latribune.fr/rss/flux.xml"
    ],
    activites: [ // business / économie / activités
      "https://www.bloomberg.com/feed/podcast/etf.xml",
      "https://www.ft.com/?format=rss",
      "https://www.lesechos.fr/rss/rss_une.xml",
      "https://www.latribune.fr/rss/edition/une.xml",
      "https://www.boursorama.com/rss/actualites-economiques.xml"
    ],
    politique: [
      "https://www.lemonde.fr/politique/rss_full.xml",
      "https://www.france24.com/fr/politique/rss",
      "https://www.rfi.fr/fr/politique/rss"
    ],
    sport: [
      "https://www.lequipe.fr/rss/actu_rss.xml",
      "https://www.france24.com/fr/sports/rss",
      "https://www.bfmtv.com/rss/sports/"
    ],
    economie: [
      "https://www.lemonde.fr/economie/rss_full.xml",
      "https://www.lesechos.fr/rss/rss_une.xml",
      "https://www.bloomberg.com/feed/podcast/etf.xml"
    ],
    technologie: [
      "https://www.lemonde.fr/pixels/rss_full.xml",
      "https://www.france24.com/fr/high-tech/rss",
      "https://www.futura-sciences.com/rss/actualites.xml"
    ],
    islamique: [
      "https://www.aljazeera.com/xml/rss/all.xml",
      "https://www.aa.com.tr/en/rss/default?cat=10"
    ]
  },
  en: {
    actualites: [
      "https://feeds.bbci.co.uk/news/rss.xml",
      "https://feeds.bbci.co.uk/news/world/rss.xml",
      "http://rss.cnn.com/rss/edition.rss",
      "https://www.aljazeera.com/xml/rss/all.xml",
      "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
      "https://www.reuters.com/tools/rss"
    ],
    activites: [
      "https://www.reuters.com/rssFeed/businessNews",
      "https://www.ft.com/?format=rss",
      "https://www.bloomberg.com/feed/podcast/etf.xml"
    ],
    politique: [
      "https://feeds.bbci.co.uk/news/politics/rss.xml",
      "https://www.theguardian.com/politics/rss"
    ],
    sport: [
      "https://www.espn.com/espn/rss/news",
      "https://feeds.bbci.co.uk/sport/rss.xml"
    ],
    economie: [
      "https://feeds.bbci.co.uk/news/business/rss.xml",
      "https://www.reuters.com/rssFeed/businessNews",
      "https://www.ft.com/?format=rss"
    ],
    technologie: [
      "https://www.theverge.com/rss/index.xml",
      "https://www.wired.com/feed/rss"
    ],
    islamique: [
      "https://www.aljazeera.com/xml/rss/all.xml"
    ]
  },
  sw: {
    actualites: [
      "https://www.bbc.co.uk/swahili/index.xml",
      "https://www.voaswahili.com/api/epidx" // parfois API change — garder comme piste
    ],
    activites: [
      "https://www.bbc.co.uk/swahili/business.xml" // si dispo
    ]
  },
  ar: {
    actualites: [
      "https://www.aljazeera.net/aljazeerarss/ar",
      "https://arabic.cnn.com/rss",
      "https://www.bbc.com/arabic/index.xml"
    ],
    activites: [
      "https://www.aljazeera.net/aljazeerarss/ebusiness"
    ],
    islamique: [
      "https://www.aljazeera.net/aljazeerarss/ar"
    ]
  }
};

/* ---------------------------
   UI elements & état
----------------------------*/
const newsContainer = document.getElementById("news-container");
const refreshTimerEl = document.getElementById("refresh-timer");
const langSelect = document.getElementById("lang-select");
const refreshNowBtn = document.getElementById("refresh-now");
const alertBox = document.getElementById("new-articles-alert");

let articles = [];
let articlesMap = {};
let pageSize = 20;          // nombre initial à afficher
const PAGE_INCREMENT = 20;  // charge 20 de plus à chaque scroll
const PAGE_MAX = 1000;      // maximum à charger
let refreshIntervalId = null;
let countdownId = null;
let refreshSeconds = 600;   // 10 minutes
let currentCategory = getQueryParam("category") || "actualites";
let LANG = localStorage.getItem('siteLang') || 'fr';
let lastSavedTitles = [];

/* ---------------------------
   Helpers
----------------------------*/
function uidFromString(s){
  try { return btoa(unescape(encodeURIComponent(s))).replace(/=/g,'').slice(0,32); }
  catch(e){ return (Date.now().toString(36) + Math.random().toString(36).slice(2,8)); }
}
function getQueryParam(name){ return new URLSearchParams(window.location.search).get(name); }
function formatDate(d){
  if(!d) return '';
  const dd = new Date(d);
  if(isNaN(dd)) return d;
  const locales = {fr:'fr-FR', en:'en-US', sw:'sw-KE', ar:'ar-SA'};
  return dd.toLocaleString(locales[LANG] || 'fr-FR', {dateStyle:'medium', timeStyle:'short'});
}
function escapeHtml(s){ return s ? s.replaceAll('<','&lt;').replaceAll('>','&gt;') : ''; }
function stripHtml(s){ return s ? s.replace(/<\/?[^>]+(>|$)/g, "") : ''; }
function truncate(s,n){ return s ? (s.length>n? s.slice(0,n-1)+'…' : s) : ''; }

/* ---------------------------
   Dark mode toggle (persistant)
----------------------------*/
const darkToggle = document.getElementById("dark-mode-toggle");
(function initDarkMode(){
  try {
    const saved = localStorage.getItem("darkMode");
    if(saved === "true") document.body.classList.add("dark-mode");
    if(darkToggle){
      darkToggle.addEventListener('click', ()=>{
        document.body.classList.toggle("dark-mode");
        const isDark = document.body.classList.contains("dark-mode");
        localStorage.setItem("darkMode", isDark);
        darkToggle.textContent = isDark ? "☀️ Mode clair" : "🌙 Mode sombre";
      });
      darkToggle.textContent = document.body.classList.contains("dark-mode") ? "☀️ Mode clair" : "🌙 Mode sombre";
    }
  } catch(e){}
})();

/* ---------------------------
   Lang selector init
----------------------------*/
(function initLangSelect(){
  if(!langSelect) return;
  if(langSelect.options.length === 0){
    const opts = [{v:'fr',t:'Français'},{v:'en',t:'English'},{v:'sw',t:'Kiswahili'},{v:'ar',t:'العربية'}];
    opts.forEach(o => { const opt = document.createElement('option'); opt.value = o.v; opt.textContent = o.t; langSelect.appendChild(opt); });
  }
  langSelect.value = LANG;
  langSelect.addEventListener('change', ()=>{
    LANG = langSelect.value;
    localStorage.setItem('siteLang', LANG);
    manualRefresh();
  });
})();

/* ---------------------------
   Fetch & parsing
----------------------------*/
async function fetchCategory(category){
  const sources = (RSS_SOURCES_BY_LANG[LANG] && RSS_SOURCES_BY_LANG[LANG][category]) || [];
  if(sources.length === 0) return [];
  // map each feed through rss2json; catch to avoid breaking on single failure
  const fetches = sources.map(src => fetch(RSS2JSON(src)).then(r => r.json()).catch(e => ({items:[]})));
  const results = await Promise.all(fetches);
  let combined = [];
  results.forEach(res => {
    if(res && Array.isArray(res.items)){
      res.items.forEach(item => {
        const rawContent = item.content || item.description || '';
        const thumbnail = (item.thumbnail) || (item.enclosure && item.enclosure.link) || '';
        combined.push({
          title: item.title || '',
          description: item.description || '',
          content: rawContent,
          image: thumbnail,
          link: item.link || '',
          pubDate: item.pubDate || '',
          source: (res.feed && res.feed.title) || '',
          category
        });
      });
    }
  });
  // sort by date (desc)
  combined.sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate));
  return combined;
}

/* ---------------------------
   Load articles & dedupe
----------------------------*/
async function loadArticlesForCategory(category, silent=false){
  try{
    const combined = await fetchCategory(category);
    // dedupe by link or title
    const seen = new Set();
    const unique = [];
    combined.forEach((a, i) => {
      const key = (a.link || a.title || '').trim();
      if(!seen.has(key)){
        seen.add(key);
        a.id = uidFromString(key || a.title + i);
        unique.push(a);
      }
    });
    articles = unique;
    articlesMap = {};
    articles.forEach(a => { articlesMap[a.id] = a; });
    try{ localStorage.setItem("articlesMap", JSON.stringify(articlesMap)); }catch(e){}
    // silent check: show in-page alert if new articles
    if(silent){
      const currentTitles = articles.map(x=>x.title);
      const newOne = currentTitles.find(t => !lastSavedTitles.includes(t));
      if(newOne){
        showInPageAlert();
        const art = articles.find(x => x.title === newOne);
        if(art) sendBrowserNotification("📰 Nouvelle actualité", art.title, art.image || '/icons/icon-192.png', window.location.origin + '/detail.html?id=' + art.id);
      }
      lastSavedTitles = currentTitles.slice(0,50);
      return;
    }
    // normal load -> render
    renderPage();
    resetAutoRefresh();
    lastSavedTitles = articles.map(a=>a.title).slice(0,50);
  }catch(err){
    console.error("Erreur loadArticlesForCategory:", err);
    if(newsContainer) newsContainer.innerHTML = '<p>Erreur de chargement des actualités.</p>';
  }
}

/* ---------------------------
   Render (affiche jusqu'à pageSize)
----------------------------*/
function renderPage(){
  if(!newsContainer) return;
  newsContainer.innerHTML = '';

  // clamp pageSize <= PAGE_MAX and <= articles.length
  const maxToShow = Math.min(pageSize, PAGE_MAX, articles.length);
  const pageArticles = articles.slice(0, maxToShow);

  if(pageArticles.length === 0){
    newsContainer.innerHTML = '<p>Aucune actualité trouvée.</p>';
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'grid';

  pageArticles.forEach(a => {
    const card = document.createElement('article');
    card.className = 'card';
    const imgSrc = a.image || `https://via.placeholder.com/400x200?text=No+Image`;
    const safeTitle = escapeHtml(a.title);
    card.innerHTML = `
      <div class="card-top">
        <img loading="lazy" src="${imgSrc}" alt="${safeTitle}">
      </div>
      <div class="card-body">
        <h3><a href="${buildDetailLink(a)}">${safeTitle}</a></h3>
        <p>${truncate(stripHtml(a.description || a.content), 320)}</p>
        <div class="card-meta">
          <span class="source">${a.source || ''}</span>
          <span class="date">${formatDate(a.pubDate)}</span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  newsContainer.appendChild(grid);
}

/* ---------------------------
   Build detail link (fallback via params)
----------------------------*/
function buildDetailLink(article){
  const u = new URL(window.location.origin + '/detail.html');
  u.searchParams.set('id', article.id);
  u.searchParams.set('title', article.title);
  u.searchParams.set('desc', article.content || article.description || '');
  u.searchParams.set('img', article.image || '');
  u.searchParams.set('date', article.pubDate || '');
  u.searchParams.set('source', article.source || '');
  u.searchParams.set('origlink', article.link || '');
  u.searchParams.set('lang', LANG);
  u.searchParams.set('category', article.category || '');
  return u.toString();
}

/* ---------------------------
   Scroll infini automatique
   -> quand proche du bas, charge +20 jusqu'à PAGE_MAX
----------------------------*/
let scrollThrottle = false;
window.addEventListener('scroll', () => {
  if(scrollThrottle) return;
  if(window.innerHeight + window.scrollY >= document.body.offsetHeight - 300){
    scrollThrottle = true;
    setTimeout(()=>{ scrollThrottle = false; }, 300); // throttle
    if(pageSize < PAGE_MAX && pageSize < articles.length){
      pageSize = Math.min(pageSize + PAGE_INCREMENT, PAGE_MAX);
      renderPage();
    }
  }
});

/* ---------------------------
   Auto-refresh timer
----------------------------*/
function resetAutoRefresh(){
  if(refreshIntervalId) clearInterval(refreshIntervalId);
  if(countdownId) clearInterval(countdownId);
  let seconds = refreshSeconds;
  updateTimerDisplay(seconds);
  countdownId = setInterval(()=>{ seconds--; updateTimerDisplay(seconds); if(seconds<=0) clearInterval(countdownId); }, 1000);
  refreshIntervalId = setInterval(()=>{ loadArticlesForCategory(currentCategory, true); }, refreshSeconds * 1000);
}
function updateTimerDisplay(seconds){
  if(!refreshTimerEl) return;
  const m = Math.floor(seconds/60), s = seconds % 60;
  refreshTimerEl.textContent = `🔄 Prochaine mise à jour dans ${m}:${String(s).padStart(2,'0')}`;
}
function manualRefresh(){ loadArticlesForCategory(currentCategory, false); }

/* ---------------------------
   In-page alert & browser notifications
----------------------------*/
function showInPageAlert(){
  if(!alertBox) return;
  alertBox.style.display = 'block';
}
function hideInPageAlert(){
  if(!alertBox) return;
  alertBox.style.display = 'none';
}
if("Notification" in window && Notification.permission !== "granted"){
  Notification.requestPermission().catch(()=>{});
}
function sendBrowserNotification(title, body, icon, link){
  if("Notification" in window && Notification.permission === "granted"){
    try{
      const n = new Notification(title, { body, icon });
      if(link) n.onclick = ()=> window.open(link, '_blank');
    } catch(e){}
  }
}

/* ---------------------------
   Load page content based on path or category param
----------------------------*/
async function loadPageContent(){
  const path = window.location.pathname.split('/').pop().toLowerCase();
  // home or index -> actualites
  if(path === "" || path === "index.html"){ currentCategory = 'actualites'; await loadArticlesForCategory(currentCategory); return; }
  // any actualites page (actualites.html or actualites-...) -> use category param or currentCategory
  if(path.startsWith("actualites")){ await loadArticlesForCategory(currentCategory); return; }
  // detail page -> do nothing (detail has its own script)
  if(path === "detail.html"){ return; }
  // default: if category provided in URL
  const qcat = getQueryParam('category');
  if(qcat){ currentCategory = qcat; await loadArticlesForCategory(currentCategory); return; }
}

/* ---------------------------
   Init
----------------------------*/
(async function init(){
  const qlang = getQueryParam('lang');
  if(qlang){ LANG = qlang; localStorage.setItem('siteLang', qlang); if(langSelect) langSelect.value = qlang; }
  // bind refresh now and alert button if present
  if(refreshNowBtn) refreshNowBtn.addEventListener('click', manualRefresh);
  const seeBtn = document.getElementById('new-articles-see');
  if(seeBtn){ seeBtn.addEventListener('click', ()=>{ hideInPageAlert(); manualRefresh(); }); }
  // hide alert by default
  if(alertBox) alertBox.style.display = 'none';
  // start
  await loadPageContent();
})();

/* ---------------------------
   Expose for debugging if needed
----------------------------*/
window.siteApp = {
  reload: ()=> loadPageContent(),
  setLang: (l)=> { LANG = l; localStorage.setItem('siteLang', l); loadPageContent(); }
};