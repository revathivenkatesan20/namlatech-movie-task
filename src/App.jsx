import React, { useEffect, useMemo, useState } from "react";
import Navbar from "./components/Navbar";
import "./App.css";

const OMDB_KEY = import.meta.env.VITE_OMDB_API_KEY;
const OMDB_BASE = "https://www.omdbapi.com/";

/* Mock fallback collection */
const mockCollection = {
  name: "Local Mock Collection",
  overview: "Local mock movies used while API is unreachable or Force Mock is ON.",
  parts: Array.from({ length: 12 }, (_, i) => ({
    id: `m${i + 1}`,
    title: `Mock Movie ${i + 1}`,
    poster_path: null,
    overview: `This is local mock movie #${i + 1}.`,
    release_date: `${2016 + (i % 10)}-01-01`,
    raw: {},
  })),
};

const SEED_2025_TITLES = [
  "A Minecraft Movie",
  "Wicked: For Good",
  "Lilo & Stitch",
  "Jurassic World: Rebirth",
  "Superman",
  "Mission: Impossible - The Final Reckoning",
  "Ne Zha 2",
  "F1: The Movie",
];

const _memoryCache = new Map();
function cacheSet(key, value, ttlMs = 24 * 60 * 60 * 1000) {
  const rec = { value, expiry: Date.now() + ttlMs };
  try { localStorage.setItem(key, JSON.stringify(rec)); } catch {}
  _memoryCache.set(key, rec);
}
function cacheGet(key) {
  const m = _memoryCache.get(key);
  if (m && m.expiry > Date.now()) return m.value;
  if (m) _memoryCache.delete(key);
  try {
    const s = localStorage.getItem(key);
    if (!s) return null;
    const parsed = JSON.parse(s);
    if (parsed.expiry > Date.now()) { _memoryCache.set(key, parsed); return parsed.value; }
    localStorage.removeItem(key);
  } catch {}
  return null;
}

/* fetch helpers */
async function safeOmdbFetch(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    throw err;
  }
}
async function omdbSearch(title) {
  if (!OMDB_KEY) return [];
  const url = `${OMDB_BASE}?apikey=${OMDB_KEY}&s=${encodeURIComponent(title)}&type=movie`;
  const data = await safeOmdbFetch(url);
  if (!data || data.Response === "False") return [];
  return data.Search || [];
}
async function omdbGetById(imdbID) {
  if (!OMDB_KEY) return null;
  const url = `${OMDB_BASE}?apikey=${OMDB_KEY}&i=${encodeURIComponent(imdbID)}&plot=full`;
  return safeOmdbFetch(url);
}
function mapOmdbToMovie(detail) {
  if (!detail) return null;
  return {
    id: detail.imdbID || Math.random().toString(36).slice(2),
    title: detail.Title || detail.title || "Untitled",
    poster_path: detail.Poster && detail.Poster !== "N/A" ? detail.Poster : null,
    overview: detail.Plot && detail.Plot !== "N/A" ? detail.Plot : detail.overview || "No overview available.",
    release_date: detail.Released || (detail.Year ? `${detail.Year}-01-01` : ""),
    rating: detail.imdbRating || "N/A",
    runtime: detail.Runtime || "",
    director: detail.Director || "",
    actors: detail.Actors || "",
    genre: detail.Genre || "",
    raw: detail,
  };
}

/* placeholder fallback */
function placeholderUrl(title) {
  const txt = encodeURIComponent(title || "No+Poster");
  return `https://placehold.co/300x450?text=${txt}&bg=7b3fe4&fg=ffffff`;
}
const fallbackDataUri = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="100%" height="100%" fill="#7b3fe4"/><text x="50%" y="50%" font-family="Arial" font-size="20" fill="#fff" text-anchor="middle" alignment-baseline="middle">No Poster</text></svg>`
);

export default function App() {
  // UI state
  const [pendingQuery, setPendingQuery] = useState("");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [yearFilter, setYearFilter] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [forceMock, setForceMock] = useState(false);
  const [showMyList, setShowMyList] = useState(false);

  // data
  const [collection, setCollection] = useState(null);
  const [recommended, setRecommended] = useState(mockCollection.parts.slice(0, 6));
  const [releases2025, setReleases2025] = useState([]);
  const [recentSearches, setRecentSearches] = useState(() => { try { return JSON.parse(localStorage.getItem("cw:recent") || "[]"); } catch { return []; }});
  const [recentMovies, setRecentMovies] = useState([]);
  const [favorites, setFavorites] = useState(() => { try { return JSON.parse(localStorage.getItem("cw:favs") || "[]"); } catch { return []; }});
  const [activeMovie, setActiveMovie] = useState(null);

  const PAGE_SIZE = 8;
  const [page, setPage] = useState(1);

  useEffect(() => { document.documentElement.setAttribute("data-theme","purple"); }, []);

  const posterFor = (p, title) => (p ? p : placeholderUrl(title));

  function pushRecentSearch(term) {
    try {
      if (!term) return;
      const normalized = term.trim();
      if (!normalized) return;
      const arr = [normalized, ...recentSearches.filter((t) => t.toLowerCase() !== normalized.toLowerCase())].slice(0, 8);
      setRecentSearches(arr); localStorage.setItem("cw:recent", JSON.stringify(arr));
    } catch {}
  }

  function toggleFavorite(movie) {
    try {
      const exists = favorites.find((f) => f.id === movie.id);
      const next = exists ? favorites.filter((f) => f.id !== movie.id) : [movie, ...favorites].slice(0, 100);
      setFavorites(next); localStorage.setItem("cw:favs", JSON.stringify(next));
    } catch {}
  }

  // Fetch full details before opening modal (so modal includes genre/director/runtime/etc)
  async function openCardFetch(item) {
    // if item already has raw details with Plot/full info, use it
    if (item.raw && (item.raw.Plot || item.raw.Genre || item.raw.Director)) {
      setActiveMovie(mapOmdbToMovie(item.raw.imdbID ? item.raw : item));
      // add to recently viewed
      try {
        pushRecentSearch(item.title || item.id);
      } catch {}
      return;
    }
    // try cache first
    const dkey = `omdb:detail:${item.id}`;
    const h = cacheGet(dkey);
    if (h) {
      const mapped = mapOmdbToMovie(h);
      setActiveMovie(mapped);
      pushRecentSearch(mapped.title || mapped.id);
      return;
    }
    // otherwise try fetching detail
    try {
      if (OMDB_KEY && !forceMock) {
        const det = await omdbGetById(item.id);
        if (det && det.Response !== "False") {
          cacheSet(dkey, det, 7*24*3600*1000);
          const mapped = mapOmdbToMovie(det);
          setActiveMovie(mapped);
          pushRecentSearch(mapped.title || mapped.id);
          return;
        }
      }
    } catch (e) {
      // ignore and fall back to item
    }
    // fallback
    setActiveMovie(item);
    pushRecentSearch(item.title || item.id);
  }

  // Build 2025 row (runs once)
  useEffect(() => {
    let mounted = true;
    async function build2025() {
      const cacheKey = "cw:releases2025";
      const cached = cacheGet(cacheKey);
      if (cached) { if (mounted) setReleases2025(cached); return; }
      const out = [];
      for (let i = 0; i < SEED_2025_TITLES.length && out.length < 8; i++) {
        const t = SEED_2025_TITLES[i];
        try {
          if (!OMDB_KEY) continue;
          const hits = await omdbSearch(t);
          if (hits && hits.length) {
            const candidate = hits.find((r) => r.Year && r.Year.startsWith("2025")) || hits[0];
            const mv = { id: candidate.imdbID, title: candidate.Title, poster_path: candidate.Poster && candidate.Poster !== "N/A" ? candidate.Poster : null, overview: "Click for details.", release_date: candidate.Year ? `${candidate.Year}-01-01` : "", raw: candidate };
            cacheSet(`omdb:seed:${t.toLowerCase()}`, mv);
            out.push(mv);
          }
        } catch {}
      }
      if (out.length === 0) out.push(...(mockCollection.parts || []).slice(0, 8));
      if (mounted) { setReleases2025(out.slice(0, 8)); cacheSet(cacheKey, out, 24*3600*1000); }
    }
    build2025();
    return () => (mounted = false);
  }, []);

  // Build recentMovies from recentSearches
  useEffect(() => {
    let mounted = true;
    async function buildRecentMovies() {
      if (!recentSearches || recentSearches.length === 0) { if (mounted) setRecentMovies([]); return; }
      const mapped = [];
      for (let i = 0; i < recentSearches.length && mapped.length < 6; i++) {
        const term = recentSearches[i];
        try {
          const hits = await omdbSearch(term);
          if (hits && hits.length) {
            const top = hits[0];
            mapped.push({ id: top.imdbID, title: top.Title, poster_path: top.Poster && top.Poster !== "N/A" ? top.Poster : null, overview: "Click for details.", release_date: top.Year ? `${top.Year}-01-01` : "", raw: top });
          }
        } catch {}
      }
      if (mounted) setRecentMovies(mapped.slice(0, 6));
    }
    buildRecentMovies();
    return () => (mounted = false);
  }, [recentSearches]);

  // Main search effect (on submit)
  useEffect(() => {
    let mounted = true;
    async function load() {
      setCollection(null);
      if (forceMock || !OMDB_KEY) {
        if (mounted) { setCollection(mockCollection); return; }
      }
      if (!query || query.trim().length < 1) {
        if (mounted) { setCollection({ name: "No search yet", overview: "Type a movie title and click Search or press Enter.", parts: [] }); return; }
      }
      try {
        const cacheKey = `omdb:search:${query.toLowerCase()}`;
        const hit = cacheGet(cacheKey);
        let searchResults;
        if (hit) { searchResults = hit; }
        else { searchResults = await omdbSearch(query.trim()); cacheSet(cacheKey, searchResults); }
        if (!mounted) return;

        const limited = searchResults.slice(0, PAGE_SIZE);
        const details = await Promise.all(limited.map(async (s) => {
          const id = s.imdbID; const dkey = `omdb:detail:${id}`; const h = cacheGet(dkey); if (h) return h;
          try { const det = await omdbGetById(id); if (det && det.Response !== "False") { cacheSet(dkey, det, 7*24*3600*1000); return det; } return null; } catch { return null; }
        }));
        const topParts = details.filter(Boolean).map(mapOmdbToMovie);
        const restParts = searchResults.slice(PAGE_SIZE).map((s) => ({ id: s.imdbID, title: s.Title, poster_path: s.Poster && s.Poster !== "N/A" ? s.Poster : null, overview: "Click for details.", release_date: s.Year ? `${s.Year}-01-01` : "", raw: s }));
        if (mounted) {
          setCollection({ name: `OMDb results for "${query}"`, overview: `Showing ${topParts.length + restParts.length} results (OMDb)`, parts: [...topParts, ...restParts] });
          pushRecentSearch(query);
          (async function backgroundRecommended() {
            try {
              const rkey = `omdb:recommend:${query.toLowerCase()}`; const rhit = cacheGet(rkey);
              if (rhit) { setRecommended(rhit.slice(0,6).map((d) => (d.id ? d : mapOmdbToMovie(d)))); return; }
              const rsearch = await omdbSearch(query); const ids = rsearch.slice(0,6).map((s) => s.imdbID);
              const dets = await Promise.all(ids.map((id) => cacheGet(`omdb:detail:${id}`) || omdbGetById(id).catch(() => null)));
              const movies = dets.filter(Boolean).map(mapOmdbToMovie); if (movies.length) { cacheSet(rkey, movies); setRecommended(movies.slice(0,6)); }
            } catch {}
          })();
        }
      } catch (err) {
        if (mounted) { setCollection(mockCollection); }
      } finally { if (mounted) setPage(1); }
    }
    load();
    return () => (mounted = false);
  }, [query, forceMock]);

  // derived
  const items = useMemo(() => (collection?.parts ? collection.parts : []), [collection]);
  const years = useMemo(() => { const s = new Set(); items.forEach((it) => { if (it.release_date) s.add((it.release_date || "").slice(0,4)); }); return Array.from(s).filter(Boolean).sort((a,b) => b-a); }, [items]);
  const visibleAll = useMemo(() => {
    let arr = items.slice();
    if (yearFilter !== "all") arr = arr.filter((m) => (m.release_date || "").startsWith(yearFilter));
    if (sortBy === "newest") arr.sort((a,b) => (b.release_date || "").localeCompare(a.release_date || ""));
    if (sortBy === "oldest") arr.sort((a,b) => (a.release_date || "").localeCompare(b.release_date || ""));
    if (sortBy === "title") arr.sort((a,b) => (a.title || "").localeCompare(b.title || ""));
    return arr;
  }, [items, yearFilter, sortBy]);
  const visiblePaged = useMemo(() => visibleAll.slice(0, page * PAGE_SIZE), [visibleAll, page]);

  // tilt effect
  function handleTiltMove(e) {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width/2);
    const dy = e.clientY - (rect.top + rect.height/2);
    const rx = (-dy / rect.height) * 8; const ry = (dx / rect.width) * 8;
    el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
    el.style.transition = "transform 0s";
  }
  function handleTiltLeave(e) { const el = e.currentTarget; el.style.transform = ""; el.style.transition = "transform 220ms cubic-bezier(.2,.9,.25,1)"; }

  // navbar handlers
  function onSearchSubmit() { const val = pendingQuery.trim(); if (val) setQuery(val); }
  function onToggleFilters() { setFiltersOpen((s) => !s); }
  function onShowMyList() { setShowMyList((s) => !s); }

  return (
    <div className="wrap">
      <Navbar onSearchSubmit={onSearchSubmit} pendingQuery={pendingQuery} setPendingQuery={setPendingQuery} onToggleFilters={onToggleFilters} onShowMyList={onShowMyList} showMyList={showMyList} />

      {/* Filters drawer */}
      <div className={`filters-drawer ${filtersOpen ? "open" : ""}`} role="dialog" aria-modal="true" aria-hidden={!filtersOpen}>
        <div className="drawer-header"><h3>Filters</h3><button className="drawer-close" onClick={() => setFiltersOpen(false)}>×</button></div>
        <div className="drawer-body">
          <label>Year:
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}><option value="all">All years</option>{years.map((y) => (<option key={y} value={y}>{y}</option>))}</select>
          </label>
          <label>Sort:
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="default">Default</option><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="title">Title (A→Z)</option></select>
          </label>
          <label style={{display:"flex",gap:8,alignItems:"center",marginTop:8}}><input type="checkbox" checked={forceMock} onChange={() => setForceMock((p) => !p)} /> Force mock</label>
          <div style={{marginTop:12,display:"flex",gap:8}}><button className="btn-ghost" onClick={() => { setYearFilter("all"); setSortBy("default"); setForceMock(false); }}>Clear</button><button className="btn-primary" onClick={() => setFiltersOpen(false)}>Apply</button></div>
        </div>
      </div>

      {/* 2025 Releases */}
      {releases2025 && releases2025.length > 0 && (
        <section className="releases-2025-section">
          <div className="section-head"><div className="section-title">2025 Releases</div><div className="section-sub">Top picks</div></div>
          <div className="recommended-list">
            {releases2025.map((m) => (
              <div key={m.id} className="rec-card" onClick={() => openCardFetch(m)} role="button" tabIndex={0}>
                <img src={posterFor(m.poster_path, m.title)} alt={m.title} loading="lazy" onError={(e) => { e.currentTarget.onerror=null; e.currentTarget.src=fallbackDataUri; }} />
                <div className="rec-title">{m.title}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recently viewed */}
      {recentMovies && recentMovies.length > 0 && (
        <section className="recent-row">
          <div className="section-head"><div className="section-title">Recently viewed</div><div className="section-sub">{recentMovies.length} items</div></div>
          <div className="recommended-list">
            {recentMovies.map((m) => (
              <div key={m.id} className="rec-card" onClick={() => openCardFetch(m)} role="button" tabIndex={0}>
                <img src={posterFor(m.poster_path, m.title)} alt={m.title} loading="lazy" onError={(e) => { e.currentTarget.onerror=null; e.currentTarget.src=fallbackDataUri; }} />
                <div className="rec-title">{m.title}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recommended */}
      {recommended && recommended.length > 0 && (
        <section className="recommended-section">
          <div className="section-head"><div className="section-title">Recommended</div><div className="section-sub">Suggestions</div></div>
          <div className="recommended-list">
            {recommended.map((m) => (
              <div key={m.id} className="rec-card" onClick={() => openCardFetch(m)} role="button" tabIndex={0}>
                <img src={posterFor(m.poster_path, m.title)} alt={m.title} loading="lazy" onError={(e) => { e.currentTarget.onerror=null; e.currentTarget.src=fallbackDataUri; }} />
                <div className="rec-title">{m.title}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <header className="header">
        <div className="head-meta">
          <h1>{collection?.name ?? "Cinematic World"}</h1>
          <p className="tagline">{collection?.overview ?? "Search movies with OMDb (add VITE_OMDB_API_KEY in .env)"}</p>
        </div>
      </header>

      {/* My List view OR Main movie grid */}
      {showMyList ? (
        <section className="list-section">
          <h2>Favorites ({favorites.length})</h2>
          {favorites.length === 0 ? (
            <div style={{ padding: 18, color: "#dcd0ff" }}>No favorites yet — click ♥ on a movie card to save it.</div>
          ) : (
            <div className="movie-list">
              {favorites.map((item, idx) => (
                <div key={item.id || idx} className="card" onMouseMove={handleTiltMove} onMouseLeave={handleTiltLeave} role="button" tabIndex={0}>
                  <img src={posterFor(item.poster_path, item.title)} alt={item.title} className="thumb" loading="lazy" onError={(e) => { e.currentTarget.onerror=null; e.currentTarget.src=fallbackDataUri; }} />
                  <div className="meta">
                    <div className="title-row">
                      <div className="title">{item.title} <span className="date">({(item.release_date || "").slice(0,4) || "N/A"})</span></div>
                      <div className="actions">
                        <button onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }} aria-label="Remove favorite" title="Remove favorite" className={`fav-btn fav`}>♥</button>
                      </div>
                    </div>
                    <div className="overview">{item.overview}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="list-section">
          <h2>Movies ({visibleAll.length})</h2>

          {visiblePaged.length === 0 ? (
            <div style={{ padding: 18, color: "#dcd0ff" }}>No results — try another search term.</div>
          ) : (
            <>
              <div className="movie-list" role="list" aria-label="movies">
                {visiblePaged.map((item, idx) => {
                  const posterSrc = posterFor(item.poster_path, item.title);
                  const isFav = favorites.some((f) => f.id === item.id);
                  return (
                    <div key={item.id || idx} className="row reveal" style={{ animationDelay: `${idx * 30}ms` }}>
                      <div className="card" onMouseMove={handleTiltMove} onMouseLeave={handleTiltLeave} onClick={() => openCardFetch(item)} tabIndex={0} role="button" aria-label={`Open details for ${item.title}`}>
                        <img src={posterSrc} alt={item.title} className="thumb" loading="lazy" onError={(e) => { e.currentTarget.onerror=null; e.currentTarget.src=fallbackDataUri; }} />
                        <div className="meta">
                          <div className="title-row">
                            <div className="title">{item.title} <span className="date">({(item.release_date || "").slice(0,4) || "N/A"})</span></div>
                            <div className="actions">
                              <button onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }} aria-label={isFav ? "Remove favorite" : "Add favorite"} title={isFav ? "Remove favorite" : "Add favorite"} className={`fav-btn ${isFav ? "fav" : ""}`}>{isFav ? "♥" : "♡"}</button>
                            </div>
                          </div>
                          <div className="overview">{item.overview}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {visibleAll.length > visiblePaged.length && (
                <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                  <button className="btn-primary" onClick={() => setPage((p) => p + 1)} style={{ padding: "10px 16px" }}>Load more</button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      <footer className="footer">Cinematic World · Built with OMDb</footer>

      {/* Modal description */}
      {activeMovie && (
        <div className="modal-backdrop" onClick={() => setActiveMovie(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setActiveMovie(null)} aria-label="Close details">×</button>

            <div className="modal-body">
              <img className="modal-poster" src={posterFor(activeMovie.poster_path, activeMovie.title)} alt={activeMovie.title} onError={(e) => { e.currentTarget.onerror=null; e.currentTarget.src=fallbackDataUri; }} />
              <div className="modal-info">
                <h2 className="modal-title">{activeMovie.title}</h2>
                <div className="meta-row">
                  <span className="muted">{(activeMovie.release_date||"").slice(0,4) || "N/A"}</span>
                  <span className="dot">•</span>
                  <span className="muted">{activeMovie.runtime || ""}</span>
                  <span className="dot">•</span>
                  <span className="muted">IMDB: {activeMovie.rating || "N/A"}</span>
                </div>

                <p className="modal-overview">{activeMovie.overview}</p>

                {activeMovie.genre && <p className="muted small"><strong>Genre:</strong> {activeMovie.genre}</p>}
                {activeMovie.director && <p className="muted small"><strong>Director:</strong> {activeMovie.director}</p>}
                {activeMovie.actors && <p className="muted small"><strong>Actors:</strong> {activeMovie.actors}</p>}

                <div style={{marginTop:12, display:"flex", gap:8, alignItems:"center"}}>
                  <button className="btn-primary" onClick={() => { toggleFavorite(activeMovie); }}>
                    {favorites.some(f => f.id === activeMovie.id) ? "Remove from favorites" : "Add to favorites"}
                  </button>
                  {favorites.some(f => f.id === activeMovie.id) && (
                    <button className="btn-ghost" onClick={() => { toggleFavorite(activeMovie); setActiveMovie(null); }}>
                      Remove & Close
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
