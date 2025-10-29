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

// STRATEGY 1: Mix of broad and niche terms for volume
const searchTerms = ['the','and','ing','scream','act','man'];

// STRATEGY 2: Increased pages to collect more IDs initially
const MAX_PAGES_PER_TERM = 10;
const MAX_DETAILS_TO_FETCH = 500; // Limit the expensive detail fetches
const CACHE_KEY = 'challengeMovieCache';

const MIN_YEAR = 1980;
const MAX_YEAR = 1999;
// STRATEGY 3: Relaxed rating requirement to capture more results
const MAX_IMDB_RATING = 6.0;


// --- Loading Messages (Omitted for brevity, use your existing list) ---
const loadingMessages = [
    "😬 Hold on! We're scraping the bottom of the cinematic barrel.",
    "🎭 Patience. Finding the world's most wooden performances takes time.",
    "🤯 Warning: We're analyzing 1,000 plots that make zero sense.",
    "📼 Buffering the VHS tape... Be kind, rewind!",
    "📉 Just verifying these films scored under a 5.0. It's a tough job.",
    "🏆 Preparing your next movie challenge. Are you truly ready?",
    "🍿 Searching for that perfect blend of bad acting and cheap effects...",
    "🕰️ Dial-up noise engaged. Fetching 1980s cinema horrors now.",
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
 * Why: This function applies the specific criteria (1980-1999 AND IMDB rating <= 6.0)
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

        // Check rating against the new 6.0 limit
        const isLowRated = !isNaN(rating) && rating <= MAX_IMDB_RATING;

        // Also include films with "N/A" or missing ratings (often bad films)
        const isRatingMissing = m.imdbRating === "N/A" || !m.imdbRating || isNaN(rating);

        const ratingChallengeMatch = isLowRated || isRatingMissing;

        return yearMatch && ratingChallengeMatch;
    });

    console.log(`Movies that Hurt (80s/90s, Rating <= ${MAX_IMDB_RATING} OR Unrated): ${challengeMovies.length}`);

    if (challengeMovies.length === 0) {
        movieList.innerHTML = '<p class="loading-message error">No movies meeting the base challenge criteria were found. Check your API key or wait for the daily request limit to reset.</p>';
        // Returns an empty JSON array
        return [];
    }

    // Returns the final filtered JSON array
    return challengeMovies;
}

/**
 * Action Step 5: Master Data Loader (Handles Caching and API Calls)
 * Why: This function orchestrates the entire process and uses localStorage for caching.
 * Caching prevents hitting the OMDb API too many times for the same data.
 * @returns {Array<Object>} The final array of challenge movie objects.
 */
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
        movieList.innerHTML = '<p class="loading-message error">No movies match your current filters. Adjust your criteria!</p>';
        return;
    }

    // Core Array Method: .forEach() iterates through the final movie list to create UI elements.
    movies.forEach(movie => {
        const div = document.createElement('div');
        div.className = 'movie';
        // Note: 'movie' is a JavaScript object derived from the JSON API response.
        div.innerHTML = `
            <img src="${movie.Poster !== "N/A" ? movie.Poster : ""}" alt="${movie.Title}">
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
    modalPoster.src = movie.Poster !== "N/A" ? movie.Poster : "";
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
            <p>Ready to Dare? Search for free viewing options:</p>
            <a href="${youtubeLink}" target="_blank" class="search-btn youtube-btn">
                📺 YouTube Search
            </a>
            <a href="${googleLink}" target="_blank" class="search-btn google-btn">
                🔍 Google Search
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
