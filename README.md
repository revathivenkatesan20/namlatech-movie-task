# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Live demo link
check it out here:
[cinematic-world-fdgz94z6s-revathi-venkatesans-projects.vercel.app]

# Cinematic World

A React + Vite web application for browsing movies with professional glossy purple UI, featuring 2025 releases, recently viewed movies, and favorites. Includes responsive cards, detailed descriptions, and fallback mock movies if the OMDb API is unavailable.



# Features

2025 Movie Releases: Top picks are fetched automatically from the OMDb API.

Recently Viewed Movies: Tracks movies the user has opened.

Favorites: Users can add/remove movies to/from favorites. Heart icon has a smooth popping animation.

Movie Details: Click any card to see a modal with movie overview, release year, genre, and IMDB rating. Includes a close button.

Responsive Design: Cards, navbar, and modals are adaptive across desktop, tablet, and mobile.

# Technology Stack

React (Functional Components + Hooks)

Vite (Fast development and build)

OMDb API for movie data

LocalStorage caching for recent searches and favorites

CSS (custom glossy purple theme)




# API Usage & Quota Protection

The app uses OMDb API (up to 1000 requests/day).

Search is performed only on Enter or Search click, avoiding unnecessary API calls.

Search results cached in-memory + localStorage for 24 hours.

Only top 4 results fetch full movie details immediately; other results are fetched when a card is opened.

If API fails or rate limit is reached, the UI falls back to mock movie data.

Originally, TMDb API was requested, but OMDb is used because TMDb API requires authentication keys and has more limited free access.

# Project Structure

/cinematic-world
├─ /public
│   ├─ index.html
│   └─ favicon.ico (website logo)
├─ /src
│   ├─ App.jsx
│   ├─ App.css
│   ├─ /components
│   │   └─ Navbar.jsx
│   │   └─ Navbar.css
├─ .env (VITE_OMDB_API_KEY=YOUR_API_KEY)
├─ package.json
└─ README.md


# Getting Started

1. Clone the repository:



git clone https://github.com/yourusername/cinematic-world.git
cd cinematic-world

2. Install dependencies:



npm install

3. Add your OMDb API key in .env:



VITE_OMDB_API_KEY=your_api_key_here

4. Start the development server:



npm run dev

5. Open the app in your browser at http://localhost:5173



# Usage Notes

Add a movie to favorites by clicking the heart icon. Remove by clicking again.

Click a movie card to view details in a modal.

Use filters and sorting to organize movies.

If OMDb API fails, the app will show mock movie cards automatically.


