import React from "react";
import "./Navbar.css";

export default function Navbar({
  pendingQuery,
  setPendingQuery,
  onSearchSubmit,
  onToggleFilters,
  onShowMyList,
  showMyList,
}) {
  return (
    <nav className="cw-nav" role="navigation" aria-label="Main navigation">
      <div className="cw-left">
        <div className="logo-box" aria-hidden>🎥</div>
        <div className="brand">
          <span className="brand-main">Cinematic</span>
          <span className="brand-accent">World</span>
        </div>
      </div>

      <div className="cw-center">
        {/* Using a form helps mobile keyboards behave; submit triggers onSearchSubmit */}
        <form
          className="center-search"
          onSubmit={(e) => { e.preventDefault(); onSearchSubmit(); }}
          role="search"
        >
          <input
            value={pendingQuery}
            onChange={(e) => setPendingQuery(e.target.value)}
            placeholder="Search movies (e.g. Inception)"
            aria-label="Search movies"
          />
          <button className="search-btn" type="submit" aria-label="Search">Search</button>
        </form>
      </div>

      <div className="cw-right">
        <button className="cw-btn" onClick={onShowMyList}>{showMyList ? "Home" : "My List"}</button>
        <button className="cw-icon" title="Filters" onClick={onToggleFilters} aria-label="Open filters">☰</button>
      </div>
    </nav>
  );
}
