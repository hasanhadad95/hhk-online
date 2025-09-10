const container = document.getElementById("news-container");
const timerElement = document.getElementById("refresh-timer");
let currentCategory = "politique";
let refreshInterval;
let countdownInterval;
const darkModeToggle = document.getElementById("dark-mode-toggle");

// Catégories et flux RSS associés
const rssCategories = {
  politique: [
    "https://www.lemonde.fr/politique/rss_full.xml",
    "https://www.france24.com/fr/rss"
  ],
  sport: [
    "https://www.lequipe.fr/rss/actu_rss.xml",
    "https://www.france24.com/fr/sports/rss"
  ],
  technologie: [
    "https://www.france24.com/fr/high-tech/rss",
    "https://www.lemonde.fr/pixels/rss_full.xml"
  ],
  economie: [
    "https://www.lemonde.fr/economie/rss_full.xml",
    "https://www.france24.com/fr/economie/rss"
  ]
};

// Charger par défaut la catégorie Politique
loadCategory("politique");

// Charger une catégorie
async function loadCategory(category) {
  currentCategory = category;
  container.innerHTML = "<p>Chargement...</p>";

  let feeds = rssCategories[category];
  if (!feeds) {
    container.innerHTML = "<p>Aucune source pour cette catégorie.</p>";
    return;
  }

  try {
    let promises = feeds.map(feed => 
      fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}`).then(r => r.json())
    );

    let results = await Promise.all(promises);

    let allArticles = [];
    results.forEach(res => {
      if (res.items) {
        allArticles = allArticles.concat(res.items);
      }
    });

    allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    container.innerHTML = "";
    allArticles.forEach(article => {
      let div = document.createElement("div");
      div.className = "news";
      div.innerHTML = `
        <img src="${article.enclosure?.link || 'https://via.placeholder.com/400x200'}" alt="image actu">
        <div class="news-content">
          <h2>${article.title}</h2>
          <p>${article.description || ""}</p>
          <div class="article-body">${article.content || ""}</div>
          <small>🕒 ${new Date(article.pubDate).toLocaleString("fr-FR")}</small>
        </div>
      `;
      container.appendChild(div);
    });

    // Réinitialiser les timers
    if (refreshInterval) clearInterval(refreshInterval);
    if (countdownInterval) clearInterval(countdownInterval);

    let refreshTime = 600; // 600 sec = 10 min
    updateTimer(refreshTime);

    countdownInterval = setInterval(() => {
      refreshTime--;
      updateTimer(refreshTime);
      if (refreshTime <= 0) {
        clearInterval(countdownInterval);
      }
    }, 1000);

    refreshInterval = setInterval(() => loadCategory(currentCategory), 600000); // 10 min

  } catch (error) {
    container.innerHTML = "<p>Erreur lors du chargement des actualités.</p>";
    console.error(error);
  }
}

// Mettre à jour le timer
function updateTimer(seconds) {
  let min = Math.floor(seconds / 60);
  let sec = seconds % 60;
  timerElement.textContent = `🔄 Prochaine mise à jour dans ${min}:${sec.toString().padStart(2, "0")}`;
}

// Recherche interne
function searchNews() {
  let query = document.getElementById("search").value.toLowerCase();
  let articles = document.querySelectorAll(".news");
  articles.forEach(article => {
    let text = article.innerText.toLowerCase();
    article.style.display = text.includes(query) ? "flex" : "none";
  });
}

// Rafraîchir manuellement
function refreshNow() {
  loadCategory(currentCategory);
}

// -------------------------
// 🌙 DARK MODE avec mémoire
// -------------------------
function applyDarkMode(saved) {
  if (saved === "true") {
    document.body.classList.add("dark-mode");
    darkModeToggle.textContent = "☀️ Mode clair";
  } else {
    document.body.classList.remove("dark-mode");
    darkModeToggle.textContent = "🌙 Mode sombre";
  }
}

// Charger l’état enregistré
applyDarkMode(localStorage.getItem("darkMode"));

// Toggle Dark Mode
darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  let isDark = document.body.classList.contains("dark-mode");
  localStorage.setItem("darkMode", isDark); // sauvegarde le choix
  applyDarkMode(isDark ? "true" : "false");
});