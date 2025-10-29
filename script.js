// --- Configuration Constants ---
const apiKey = 'ec562c11';
const apiUrl = 'https://www.omdbapi.com/';

// --- DOM Elements ---
const filterBtn = document.getElementById('filterBtn');
const movieList = document.getElementById('movieList');
const languageSelect = document.getElementById('languageSelect');
const ratingOrderSelect = document.getElementById('ratingOrderSelect');
const topicInput = document.getElementById('topicInput');

// Modal elements (UI for movie details)
const modal = document.getElementById('movieModal');
const closeModal = document.getElementById('closeModal');
const modalTitle = document.getElementById('modalTitle');
const modalPoster = document.getElementById('modalPoster');
const modalGenre = document.getElementById('modalGenre');
const modalLanguage = document.getElementById('modalLanguage');
const modalRuntime = document.getElementById('modalRuntime');
const modalRating = document.getElementById('modalRating');
const modalPlot = document.getElementById('modalPlot');


// --- Challenge & Efficiency Constants ---

// STRATEGY 1: NEW - Focused search terms for low-budget 80s/90s cinema
const searchTerms = ['killer', 'mutant', 'revenge', 'zombie', 'space', 'blood', 'death', 'alien'];

// STRATEGY 2: Increased pages to collect more IDs initially
const MAX_PAGES_PER_TERM = 10;
const MAX_DETAILS_TO_FETCH = 500; // Limit the expensive detail fetches
const CACHE_KEY = 'challengeMovieCache';

const MIN_YEAR = 1980;
const MAX_YEAR = 1999;
// STRATEGY 3: NEW - Lowered maximum IMDB rating to 5.0 to find worse movies
const MAX_IMDB_RATING = 5.0;


// --- Loading Messages (Omitted for brevity, use your existing list) ---
const loadingMessages = [
    "😬 HOLD ON! WE'RE SCRAPING THE BOTTOM OF THE CINEMATIC BARREL.",
    "🎭 PATIENCE. FINDING THE WORLD'S MOST WOODEN PERFORMANCES TAKES TIME.",
    "🤯 WARNING: WE'RE ANALYZING 1,000 PLOTS THAT MAKE ZERO SENSE.",
    "📼 BUFFERING THE VHS TAPE... BE KIND, REWIND!",
    "📉 JUST VERIFYING THESE FILMS SCORED UNDER A 5.0. IT'S A TOUGH JOB.",
    "🏆 PREPARING YOUR NEXT MOVIE CHALLENGE. ARE YOU TRULY READY?",
    "🍿 SEARCHING FOR THAT PERFECT BLEND OF BAD ACTING AND CHEAP EFFECTS...",
    "🕰️ DIAL-UP NOISE ENGAGED. FETCHING 1980S CINEMA HORRORS NOW.",
];

function getRandomLoadingMessage() {
    const index = Math.floor(Math.random() * loadingMessages.length);
    return loadingMessages[index];
}


// --- API Fetching Functions ---

/**
 * Action Step 2: Fetch Broad Movie List
 * Why: This function sends initial, broad search requests to the OMDB API
 * to gather a large pool of movie IDs efficiently. It uses 'fetch' with
 * 'async/await' to handle the multiple requests sequentially across pages.
 */
async function fetchBroadMovies() {
    let movies = [];
    let totalRequests = 0;

    for (const term of searchTerms) {
        let currentPage = 1;
        let hasMore = true;

        while (hasMore && currentPage <= MAX_PAGES_PER_TERM) {
            totalRequests++;
            const url = `${apiUrl}?s=${term}&type=movie&page=${currentPage}&apikey=${apiKey}`;

            try {
                const response = await fetch(url);
                // JSON Interaction: Parse the response body into a JavaScript object (JSON)
                const data = await response.json();

                if (data.Response === "True" && data.Search) {
                    // Core Array Method: .push(...data.Search) adds the new search results to the 'movies' array.
                    movies.push(...data.Search);

                    if (data.Search.length < 10) {
                        hasMore = false;
                    } else {
                        currentPage++;
                    }
                } else if (data.Response === "False") {
                    console.error(`OMDB API FAILED for search term '${term}' on page ${currentPage}: ${data.Error}`);
                    hasMore = false;
                } else {
                    hasMore = false;
                }
            } catch (err) {
                console.error(`Network or Unknown Error for term '${term}':`, err);
                hasMore = false;
            }
        }
    }

    // Filter out duplicates using a simple JavaScript object (JSON-like structure)
    const seen = {};
    // Core Array Method: .filter() ensures only unique movie IDs are kept.
    const uniqueMovies = movies.filter(m => {
        if (seen[m.imdbID]) return false;
        seen[m.imdbID] = true;
        return true;
    });

    console.log(`Total unique movie IDs found: ${uniqueMovies.length}`);

    // Returns an array of JavaScript objects (movie IDs, titles, years)
    return uniqueMovies;
}

/**
 * Action Step 3: Fetch Detailed Movie Information
 * Why: The broad search only gives basic info. This function fetches the plot,
 * genre, and full rating details needed for the challenge criteria and modal.
 * @param {string} imdbID The unique identifier for the movie.
 * @returns {Promise<Object | null>} A promise resolving to the full movie object or null.
 */
async function fetchMovieDetails(imdbID) {
    const url = `${apiUrl}?i=${imdbID}&plot=full&apikey=${apiKey}`;
    try {
        const response = await fetch(url);
        // JSON Interaction: Parse the detailed JSON response
        const data = await response.json();
        return data.Response === "True" ? data : null;
    } catch {
        // Return null on network error
        return null;
    }
}

// --- Process & Caching Functions ---

/**
 * Action Step 4: Apply the Core Challenge Filters
 * Why: This function applies the specific criteria (1980-1999 AND IMDB rating <= 5.0)
 * to the massive dataset collected from the API.
 * @param {Array<Object>} details - Array of full movie detail objects.
 * @returns {Array<Object>} Array of movies meeting the "worst movies" challenge criteria.
 */
function processChallengeMovies(details) {
    // Core Array Method: .filter() removes any movies that failed to fetch details (null entries)
    let filtered = details.filter(m => m !== null);

    // Core Array Method: .filter() applies the year and rating logic
    const challengeMovies = filtered.filter(m => {
        const year = parseInt(m.Year);
        const rating = parseFloat(m.imdbRating);

        const yearMatch = year >= MIN_YEAR && year <= MAX_YEAR;

        // Check rating against the new 5.0 limit
        const isLowRated = !isNaN(rating) && rating <= MAX_IMDB_RATING;

        // Also include films with "N/A" or missing ratings (often bad films)
        const isRatingMissing = m.imdbRating === "N/A" || !m.imdbRating || isNaN(rating);

        const ratingChallengeMatch = isLowRated || isRatingMissing;

        return yearMatch && ratingChallengeMatch;
    });

    console.log(`Movies that Hurt (80s/90s, Rating <= ${MAX_IMDB_RATING} OR Unrated): ${challengeMovies.length}`);

    if (challengeMovies.length === 0) {
        movieList.innerHTML = '<p class="loading-message error">NO MOVIES MEETING THE BASE CHALLENGE CRITERIA WERE FOUND. CHECK YOUR API KEY OR TRY AGAIN.</p>';
        // Returns an empty JSON array
        return [];
    }

    // Returns the final filtered JSON array
    return challengeMovies;
}

// --- Action Step 5: Master Data Loader (Handles Caching and API Calls) ---
// Why is this here? This bad boy is the *engine* of the whole app! It's our main data guy.
// What does it do? It decides: 1) Should we quickly grab the movie list
// from our **local storage cache** (super fast, no API hit!) or 2) Should we hit the OMDb API
// for a fresh, long, expensive data pull? It then passes the final list off for filtering.
// What's the connection? It's directly connected to the 'init()' function (for starting up the page)
// and the 'filterBtn' click listener, so any time the movie data is needed, this function handles it.
// What was tough? The biggest headache was making sure the **caching** works right.
// We *have* to use caching to avoid burning through our API calls too fast! We also had to
// make sure we check for corrupted cache data and always have a network fallback.
// @returns {Array<Object>} The final array of challenge movie objects.
async function loadMovies() {
    const message = getRandomLoadingMessage();
    movieList.innerHTML = `<p class="loading-message">${message}</p>`;

    const CACHED_DATA = localStorage.getItem(CACHE_KEY);

    if (CACHED_DATA) {
        try {
            // JSON Interaction: Parse the cached string back into a JavaScript object array
            const details = JSON.parse(CACHED_DATA);
            console.log("Loaded movie details from local cache. Skipping expensive API calls.");
            return processChallengeMovies(details);
        } catch (e) {
            console.warn("Cache corrupted, fetching fresh data from OMDb.");
            localStorage.removeItem(CACHE_KEY);
        }
    }

    // API Fetch Path
    const allMovies = await fetchBroadMovies();
    // Core Array Method: .slice() limits the number of expensive detail fetches.
    const moviesToDetail = allMovies.slice(0, MAX_DETAILS_TO_FETCH);

    console.log(`Processing details for ${moviesToDetail.length} movies... (API Requests: ~${moviesToDetail.length})`);

    // Core Array Method: .map() creates an array of Promises, and Promise.all waits for all of them
    const details = await Promise.all(moviesToDetail.map(m => fetchMovieDetails(m.imdbID)));

    const successCount = details.filter(d => d !== null).length;

    // Only save the cache if we got a reasonable number of results (e.g., > 10)
    if (successCount > 10) {
        // JSON Interaction: Stringify the array of JavaScript objects for storage
        localStorage.setItem(CACHE_KEY, JSON.stringify(details));
        console.log(`Successfully cached ${successCount} movie details.`);
    } else {
        console.warn(`Insufficient successful detail fetches (${successCount}). Cache not saved.`);
    }

    return processChallengeMovies(details);
}


// --- Display & Modal Functions (Simplified Comments) ---

function displayMovies(movies) {
    movieList.innerHTML = '';

    if (movies.length === 0) {
        movieList.innerHTML = '<p class="loading-message error">NO MOVIES MATCH YOUR CURRENT FILTERS. ADJUST YOUR CRITERIA!</p>';
        return;
    }

    // Core Array Method: .forEach() iterates through the final movie list to create UI elements.
    movies.forEach(movie => {
        const div = document.createElement('div');
        div.className = 'movie';

        // Action Step: Conditional rendering for the poster to show the chaotic placeholder
        const posterHtml = (movie.Poster && movie.Poster !== "N/A")
            ? `<img src="${movie.Poster}" alt="${movie.Title}" onerror="this.onerror=null;this.outerHTML='<div class=\\"poster-placeholder\\">IMAGE CORRUPTED: VIEWING IS DANGEROUS</div>'">`
            : `<div class="poster-placeholder">
                  POSTER NOT FOUND: GLITCH DETECTED
                  <span class="placeholder-id">ID: ${movie.imdbID}</span>
              </div>`;

        // Note: 'movie' is a JavaScript object derived from the JSON API response.
        div.innerHTML = `
            ${posterHtml}
            <h3>${movie.Title} (${movie.Year})</h3>
            <p>IMDB: <span class="rating-tag">${movie.imdbRating}</span> | MPAA: ${movie.Rated}</p>
            <p>Genre: ${movie.Genre}</p>
        `;
        div.addEventListener('click', () => openModal(movie));
        movieList.appendChild(div);
    });
}

function openModal(movie) {
    // Populate modal using keys from the movie object (derived from JSON)
    modalTitle.textContent = movie.Title;

    // Handle modal poster display/placeholder
    const posterElement = document.getElementById('modalPoster');
    if (movie.Poster && movie.Poster !== "N/A") {
        posterElement.src = movie.Poster;
        posterElement.style.display = 'block';
    } else {
        posterElement.style.display = 'none'; // Hide the image element if no poster
    }

    modalGenre.textContent = "Genre: " + movie.Genre;
    modalLanguage.textContent = "Language: " + movie.Language;
    modalRuntime.textContent = "Runtime: " + movie.Runtime;
    modalRating.textContent = "Rating: " + movie.Rated + " (IMDB: " + movie.imdbRating + ")";
    modalPlot.textContent = movie.Plot;

    const searchTitle = encodeURIComponent(`${movie.Title} ${movie.Year} full movie`);

    const youtubeLink = `https://www.youtube.com/results?search_query=${searchTitle}`;
    const googleLink = `https://www.google.com/search?q=${searchTitle} free streaming`;

    const challengeLinksHTML = `
        <div class="challenge-links">
            <p>READY TO DARE? SEARCH FOR FREE VIEWING OPTIONS:</p>
            <a href="${youtubeLink}" target="_blank" class="search-btn youtube-btn">
                📺 YOUTUBE SEARCH
            </a>
            <a href="${googleLink}" target="_blank" class="search-btn google-btn">
                🔍 GOOGLE SEARCH
            </a>
        </div>
    `;

    const modalInfo = document.querySelector('.modal-info');
    if (modalInfo) {
        const oldLinks = modalInfo.querySelector('.challenge-links');
        if (oldLinks) oldLinks.remove();

        modalPlot.insertAdjacentHTML('afterend', challengeLinksHTML);
    }

    modal.style.display = "block";
}

closeModal.onclick = () => { modal.style.display = "none"; }
window.onclick = (e) => { if(e.target == modal) modal.style.display = "none"; }

// --- Filter Event Listener ---
filterBtn.addEventListener('click', async () => {
    const languageFilter = languageSelect.value.toLowerCase();
    const topicFilter = topicInput.value.toLowerCase();
    const sortOrder = ratingOrderSelect.value;

    const movies = await loadMovies(); // Reload or retrieve from cache

    // Core Array Method: .filter() narrows the list based on user selections
    let filtered = movies.filter(m => {
        const langMatch = (languageFilter === 'all')
            ? true
            // Core Array Method: .includes() is used for language matching
            : m.Language.toLowerCase().includes(languageFilter);

        const topicMatch = topicFilter
            ? m.Title.toLowerCase().includes(topicFilter) || m.Plot.toLowerCase().includes(topicFilter)
            : true;

        return langMatch && topicMatch;
    });

    // Core Array Method: .sort() orders the filtered list by IMDB rating
    filtered.sort((a, b) => {
        // Fallback to Infinity if rating is N/A to push N/A movies to the end (lowest) or beginning (highest)
        const ratingA = parseFloat(a.imdbRating) || Infinity;
        const ratingB = parseFloat(b.imdbRating) || Infinity;

        if (sortOrder === 'lowest') {
            if (isNaN(ratingA)) return isNaN(ratingB) ? a.Title.localeCompare(b.Title) : -1;
            if (isNaN(ratingB)) return 1;
            return ratingA - ratingB; // Ascending (lowest first)
        } else {
            if (isNaN(ratingA)) return isNaN(ratingB) ? a.Title.localeCompare(b.Title) : 1;
            if (isNaN(ratingB)) return -1;
            return ratingB - ratingA; // Descending (highest first)
        }
    });

    displayMovies(filtered);
});

// --- Page Initialization ---

/**
 * Action Step 6: Initialize the Application on Load
 * Why: This function ensures that the data is fetched and the UI is populated
 * immediately when the page loads, before the user clicks any buttons.
 */
async function init() {
    // 1. Fetch and process the challenge movies (from cache or API).
    // The loadMovies function handles making API requests and parsing the JSON response.
    const initialMovies = await loadMovies();

    // 2. Display the initial list of challenge movies that meet the criteria.
    displayMovies(initialMovies);
}

// Start the application process.
init();
