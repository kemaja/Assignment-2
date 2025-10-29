const apiKey = '64bddc98'; // API key I requested from the website
const apiUrl = 'https://www.omdbapi.com/';

const filterBtn = document.getElementById('filterBtn');
const genreSelect = document.getElementById('genre');
const languageInput = document.getElementById('language');
const maxRuntimeInput = document.getElementById('maxRuntime');
const movieList = document.getElementById('movieList');

// Event listener for the filter button
filterBtn.addEventListener('click', () => {
    const genre = genreSelect.value;
    const language = languageInput.value.trim();
    const maxRuntime = parseInt(maxRuntimeInput.value) || Infinity;
    displayMovies(genre, language, maxRuntime);
});

// Get the movies from the database by visitor selected requirement
// Fetch the relevant latitude and longitude data from open meteo database
// try - catch is a way to contain any error that might happen during running the code. It is type of if-else. If the code fails. Display error message.

async function fetchMovies(genre) {
    const url = `${apiUrl}?s=${genre}&type=movie&apikey=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.Response === "True") {
            return data.Search;
        } else {
            return [];
        }
    } catch (error) {
        console.error("Error fetching movies:", error);
        return [];
    }
}

// Access the whole database
async function fetchMovieDetails(imdbID) {
    const url = `${apiUrl}?i=${imdbID}&apikey=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.Response === "True" ? data : null;
    } catch (error) {
        console.error("Error fetching movie details:", error);
        return null;
    }
}

// Filter movies by language and runtime
async function filterMovies(movies, language, maxRuntime) {
    const detailedMovies = await Promise.all(
        movies.map(movie => fetchMovieDetails(movie.imdbID))
    );

    return detailedMovies.filter(movie => {
        if (!movie) return false;

        const runtime = movie.Runtime ? parseInt(movie.Runtime.split(' ')[0]) : Infinity;
        const languageMatch = language ? movie.Language.toLowerCase().includes(language.toLowerCase()) : true;
        const runtimeMatch = runtime <= maxRuntime;

        return languageMatch && runtimeMatch;
    });
}

// Sort movies alphabetically
function sortMoviesAlphabetically(movies) {
    return movies.sort((a, b) => a.Title.localeCompare(b.Title));
}

// Display movies
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
        movieList.innerHTML = '<p>No movies match your filters.</p>';
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
      <p class="pg-rating">PG Rating: ${movie.Rated || 'N/A'}</p>
    `;
        movieList.appendChild(movieElement);
    });
}

// Initial load
displayMovies();
