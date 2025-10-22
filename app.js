const apiKey = '64bddc98'; // Your OMDb API key
const apiUrl = 'https://www.omdbapi.com/';

const filterBtn = document.getElementById('filterBtn');
const genreSelect = document.getElementById('genre');
const languageInput = document.getElementById('language');
const maxRuntimeInput = document.getElementById('maxRuntime');
const movieList = document.getElementById('movieList');

// Only allow these ratings
const strictSafeRatings = [
    "g",
    "approved",
    "tv-g",
    "u"
];

function isStrictSafeRating(rating) {
    if (!rating) return false;
    return strictSafeRatings.includes(rating.toLowerCase());
}

// Filtering adult themes in plot
const adultKeywords = [
    "sex", "sexual", "affair", "cheating", "adult", "seduce", "gay" , "lesbian",
    "pregnant", "nudity", "intimate", "erotic", "drugs", "violence", "terror", "horror",
];

// Event listener for filter action
filterBtn.addEventListener('click', () => {
    const genre = genreSelect.value;
    const language = languageInput.value.trim();
    const maxRuntime = parseInt(maxRuntimeInput.value) || Infinity;
    displayMovies(genre, language, maxRuntime);
});

// Search OMDb for movies of a specific genre
async function fetchMovies(genre) {
    const url = `${apiUrl}?s=${genre}&type=movie&apikey=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.Response === "True") {
            console.log(data);
            return data.Search;
        } else {
            return [];
        }
    } catch (error) {
        console.error("Error fetching movies:", error);
        return [];
    }
}

// Fetch full movie info (needed for filtering)
async function fetchMovieDetails(imdbID) {
    const url = `${apiUrl}?i=${imdbID}&plot=full&apikey=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.Response === "True" ? data : null;
    } catch (error) {
        console.error("Error fetching movie details:", error);
        return null;
    }
}

// Strict safety filter for rating and adult plot content
async function filterMovies(movies, language, maxRuntime) {
    const detailedMovies = await Promise.all(
        movies.map(movie => fetchMovieDetails(movie.imdbID))
    );

    return detailedMovies.filter(movie => {
        if (!movie) return false;

        const runtime = movie.Runtime ? parseInt(movie.Runtime.split(' ')[0]) : Infinity;
        const languageMatch = language ? movie.Language.toLowerCase().includes(language.toLowerCase()) : true;
        const runtimeMatch = runtime <= maxRuntime;

        const rating = movie.Rated ? movie.Rated.toLowerCase() : "";
        const isSafeRating = isStrictSafeRating(rating);

        const plot = movie.Plot ? movie.Plot.toLowerCase() : "";
        const containsAdultContent = adultKeywords.some(keyword => plot.includes(keyword));

        // Optional debugging log
        if (!isSafeRating || containsAdultContent) {
            console.log(`Excluded: ${movie.Title} (${movie.Rated}) - ${movie.Plot.slice(0, 60)}...`);
        }

        return languageMatch && runtimeMatch && isSafeRating && !containsAdultContent;
    });
}

// Sort movies alphabetically
function sortMoviesAlphabetically(movies) {
    return movies.sort((a, b) => a.Title.localeCompare(b.Title));
}

// Display only filtered, safe movies
async function displayMovies(genre = 'Animation', language = '', maxRuntime = Infinity) {
    movieList.innerHTML = '<p>Loading movies...</p>';

    const movies = await fetchMovies(genre);
    if (movies.length === 0) {
        movieList.innerHTML = '<p>No movies found for this genre.</p>';
        return;
    }

    const filteredMovies = await filterMovies(movies, language, maxRuntime);
    const sortedMovies = sortMoviesAlphabetically(filteredMovies);

    movieList.innerHTML = '';

    if (sortedMovies.length === 0) {
        movieList.innerHTML = '<p>No suitable movies match your filters.</p>';
        return;
    }

    sortedMovies.forEach(movie => {
        const movieElement = document.createElement('div');
        movieElement.classList.add('movie');
        movieElement.innerHTML = `
            <img src="${movie.Poster !== 'N/A' ? movie.Poster : ''}" alt="${movie.Title}">
            <h3>${movie.Title}</h3>
            <p>Genre: ${movie.Genre}</p>
            <p>Language: ${movie.Language}</p>
            <p>Runtime: ${movie.Runtime}</p>
            <p class="pg-rating">Rating: ${movie.Rated}</p>
        `;
        movieList.appendChild(movieElement);
    });
}

// Initial load
displayMovies();
