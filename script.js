const apiKey = 'ec562c11';
const apiUrl = 'https://www.omdbapi.com/';


const filterBtn = document.getElementById('filterBtn');
const genreInput = document.getElementById('genre');
const languageInput = document.getElementById('language');
const movieList = document.getElementById('movieList');

// Modal elements
const modal = document.getElementById('movieModal');
const closeModal = document.getElementById('closeModal');
const modalTitle = document.getElementById('modalTitle');
const modalPoster = document.getElementById('modalPoster');
const modalGenre = document.getElementById('modalGenre');
const modalLanguage = document.getElementById('modalLanguage');
const modalRuntime = document.getElementById('modalRuntime');
const modalRating = document.getElementById('modalRating');
const modalPlot = document.getElementById('modalPlot');

const allowedRatings = ["g", "u", "tv-g", "pg", "pg-13"];

// New (Effective for OMDB)
const searchTerms = ['the','and','ing','act','man','st','at','to','of','in'];

// --- Pagination Safety Limit ---
const MAX_PAGES_PER_TERM = 10; // Fetch up to 10 pages (100 movies) per broad term
const MAX_DETAILS_TO_FETCH = 500; // Total maximum movie details to fetch

/**
 * Fetches movies using broad search terms and pagination.
 * This prevents the 'Too many results' error and gathers up to 100 results per term.
 */
async function fetchBroadMovies() {
    let movies = [];

    for (const term of searchTerms) {
        let currentPage = 1;
        let hasMore = true;

        // Loop through pages for the current search term
        while (hasMore && currentPage <= MAX_PAGES_PER_TERM) {
            // Include the 'page' parameter in the URL
            const url = `${apiUrl}?s=${term}&type=movie&page=${currentPage}&apikey=${apiKey}`;

            try {
                const response = await fetch(url);
                const data = await response.json();

                if (data.Response === "True" && data.Search) {
                    movies.push(...data.Search);

                    // OMDB returns 10 results per page. If we get less than 10,
                    // we've hit the last page for this search term.
                    if (data.Search.length < 10) {
                        hasMore = false;
                    } else {
                        currentPage++; // Proceed to the next page
                    }
                } else {
                    // Stop if the response is "False" (e.g., 'Too many results' or 'Movie not found')
                    // and continue to the next search term
                    hasMore = false;
                }
            } catch (err) {
                console.error(`Fetch error for term '${term}' on page ${currentPage}:`, err);
                hasMore = false;
            }
        }
    }

    // Remove duplicates by imdbID
    const seen = {};
    const uniqueMovies = movies.filter(m => {
        if (seen[m.imdbID]) return false;
        seen[m.imdbID] = true;
        return true;
    });

    return uniqueMovies;
}

/**
 * Fetches full details for a single movie by its IMDB ID.
 */
async function fetchMovieDetails(imdbID) {
    const url = `${apiUrl}?i=${imdbID}&plot=full&apikey=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.Response === "True" ? data : null;
    } catch {
        return null;
    }
}

/**
 * Main function to load and process movies.
 */
async function loadMovies() {
    const allMovies = await fetchBroadMovies();

    // --- New Safety Limit Implementation ---
    // Slice the array to prevent thousands of detail fetches, improving performance.
    const moviesToDetail = allMovies.slice(0, MAX_DETAILS_TO_FETCH);

    console.log(`Fetched ${allMovies.length} unique movie IDs. Processing details for ${moviesToDetail.length} movies.`);

    // Fetch details for the limited set of movies
    const details = await Promise.all(moviesToDetail.map(m => fetchMovieDetails(m.imdbID)));

    // Only allowed ratings
    const filtered = details.filter(m => m && m.Rated && allowedRatings.includes(m.Rated.toLowerCase()));

    displayMovies(filtered);
    return filtered;
}

// ... (displayMovies, openModal, closeModal, window.onclick remain unchanged) ...

function displayMovies(movies) {
    movieList.innerHTML = '';
    movies.forEach(movie => {
        const div = document.createElement('div');
        div.className = 'movie';
        div.innerHTML = `
            <img src="${movie.Poster !== "N/A" ? movie.Poster : ""}" alt="${movie.Title}">
            <h3>${movie.Title}</h3>
            <p>Genre: ${movie.Genre}</p>
            <p>Language: ${movie.Language}</p>
            <p>Rating: ${movie.Rated}</p>
        `;
        div.addEventListener('click', () => openModal(movie));
        movieList.appendChild(div);
    });
}

function openModal(movie) {
    modalTitle.textContent = movie.Title;
    modalPoster.src = movie.Poster !== "N/A" ? movie.Poster : "";
    modalGenre.textContent = "Genre: " + movie.Genre;
    modalLanguage.textContent = "Language: " + movie.Language;
    modalRuntime.textContent = "Runtime: " + movie.Runtime;
    modalRating.textContent = "Rating: " + movie.Rated;
    modalPlot.textContent = movie.Plot;

    modal.style.display = "block";
}

closeModal.onclick = () => { modal.style.display = "none"; }
window.onclick = (e) => { if(e.target == modal) modal.style.display = "none"; }

filterBtn.addEventListener('click', async () => {
    const genreFilter = genreInput.value.toLowerCase();
    const languageFilter = languageInput.value.toLowerCase();

    // Re-run loadMovies to get the base data (this might take a few seconds)
    const movies = await loadMovies();

    const filtered = movies.filter(m => {
        const genreMatch = genreFilter ? m.Genre.toLowerCase().includes(genreFilter) : true;
        const langMatch = languageFilter ? m.Language.toLowerCase().includes(languageFilter) : true;
        return genreMatch && langMatch;
    });

    displayMovies(filtered);
});

// Initial load
loadMovies();