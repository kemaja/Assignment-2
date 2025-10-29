const apiKey = '64bddc98';
const apiUrl = 'https://www.omdbapi.com/';

const filterBtn = document.getElementById('filterBtn');
const languageInput = document.getElementById('language');
const maxRuntimeInput = document.getElementById('maxRuntime');
const resultSummary = document.getElementById('resultSummary');
const ageGroupsList = document.getElementById('ageGroupsList');

const strictSafeRatings = ["g", "approved", "tv-g", "u", "pg", "pg-13"];
const adultKeywords = [
    "sex","sexual","affair","cheating","adult","seduce","gay","lesbian",
    "pregnant","nudity","intimate","erotic","drugs","violence","terror","horror",
];

function getAgeCategory(rating, plot) {
    if (!rating) return null;
    const r = rating.toLowerCase();

    const sensitive = adultKeywords.some(k => plot.includes(k));
    if (sensitive) return null;

    if (["g", "u", "tv-g"].includes(r)) return "Below 6 years";
    if (["pg", "approved"].includes(r)) return "6-11 years";
    if (["pg-13"].includes(r)) return "12 years and up";
    return null;
}

// Get a broad set of movies by searching several letters (ABC)
async function fetchBroadMovies() {
    const searchTerms = ['a', 'e', 'o', 'r']; // Choose several to broaden the base
    let movies = [];
    for (const term of searchTerms) {
        const url = `${apiUrl}?s=${term}&type=movie&apikey=${apiKey}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.Response === "True") movies.push(...data.Search);
        } catch {}
    }
    // Remove duplicates by imdbID (some overlap in searches)
    const seen = {};
    const uniqueMovies = movies.filter(m => {
        if (seen[m.imdbID]) return false;
        seen[m.imdbID] = true;
        return true;
    });
    return uniqueMovies;
}

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

async function filterAndCategorizeMovies(language, maxRuntime) {
    const allMovies = await fetchBroadMovies();
    // Limit results to avoid API overload (optional, e.g., 30 movies)
    const movieSample = allMovies.slice(0, 30);

    const details = await Promise.all(movieSample.map(m => fetchMovieDetails(m.imdbID)));
    const ageGroups = {
        "Below 6 years": [],
        "6-11 years": [],
        "12 years and up": []
    };
    const genreCount = {};
    let totalSafe = 0;

    for (const movie of details) {
        if (!movie) continue;
        const rating = movie.Rated || "";
        const plot = (movie.Plot || "").toLowerCase();
        const runtime = movie.Runtime ? parseInt(movie.Runtime.split(' ')[0]) : Infinity;
        const langMatch = language ? movie.Language && movie.Language.toLowerCase().includes(language.toLowerCase()) : true;
        const runtimeMatch = runtime <= maxRuntime;

        if (!langMatch || !runtimeMatch) continue;
        const ageCat = getAgeCategory(rating, plot);
        if (!ageCat) continue;

        // Genre counting
        if (movie.Genre) {
            movie.Genre.split(',').forEach(g => {
                const genre = g.trim();
                if (genre) genreCount[genre] = (genreCount[genre] || 0) + 1;
            });
        }
        ageGroups[ageCat].push(movie);
        totalSafe++;
    }
    return { ageGroups, genreCount, totalSafe };
}

function renderResults(ageGroups, genreCount, totalSafe) {
    // Summary
    resultSummary.innerHTML = `
        <h2>${totalSafe} strictly safe movies found!</h2>
        <h3>Categories available:</h3>
        <ul>
            ${Object.entries(genreCount).map(([g, cnt]) => `<li>${g} (${cnt})</li>`).join('')}
        </ul>
    `;

    // List by age group
    ageGroupsList.innerHTML = '';
    Object.entries(ageGroups).forEach(([group, movies]) => {
        if (movies.length === 0) return;
        const groupBox = document.createElement('div');
        groupBox.className = "age-group";
        groupBox.innerHTML = `
            <h3>For ${group} (${movies.length} movies)</h3>
            <div class="movie-row">
                ${movies.map(movie => `
                    <div class="movie">
                        <img src="${movie.Poster !== 'N/A' ? movie.Poster : ''}" alt="${movie.Title}">
                        <h4>${movie.Title}</h4>
                        <p>Genre: ${movie.Genre}</p>
                        <p>Language: ${movie.Language}</p>
                        <p>Runtime: ${movie.Runtime}</p>
                        <p class="pg-rating">Rating: ${movie.Rated}</p>
                    </div>
                `).join('')}
            </div>
        `;
        ageGroupsList.appendChild(groupBox);
    });
}

filterBtn.addEventListener('click', async () => {
    const language = languageInput.value.trim();
    const maxRuntime = parseInt(maxRuntimeInput.value) || Infinity;

    resultSummary.innerHTML = '<p>Loading movies...</p>';
    ageGroupsList.innerHTML = '';

    const { ageGroups, genreCount, totalSafe } = await filterAndCategorizeMovies(language, maxRuntime);

    renderResults(ageGroups, genreCount, totalSafe);
});

// Initial load
(async () => {
    const { ageGroups, genreCount, totalSafe } = await filterAndCategorizeMovies('', Infinity);
    renderResults(ageGroups, genreCount, totalSafe);
})();
