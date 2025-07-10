document.addEventListener('DOMContentLoaded', () => {

    const app = {
        // State
        currentMediaType: 'movie',
        heroSlideshowInterval: null,

        // DOM Elements
        elements: {
            heroSection: document.getElementById('hero'),
            contentDisplay: document.getElementById('content-display'),
            genreResultsSection: document.getElementById('genre-results'),
            navLinks: document.querySelectorAll('header nav a[data-type]'),
            genreBar: document.getElementById('genre-bar'),
            trendingMoviesGrid: document.querySelector('#trending-movies .movie-grid'),
            topRatedMoviesGrid: document.querySelector('#top-rated-movies .movie-grid'),
            trendingTvGrid: document.querySelector('#trending-tv .movie-grid'),
            topRatedTvGrid: document.querySelector('#top-rated-tv .movie-grid'),
            genreResultsGrid: document.getElementById('genre-results-grid'),
            genreResultsTitle: document.getElementById('genre-results-title'),
            paginationContainer: document.getElementById('pagination'),
            continueWatchingSection: document.getElementById('continue-watching'),
        },

        // --- CORE METHODS ---

        init() {
            this.displayContinueWatching();
            this.setupEventListeners();
            this.switchView(this.currentMediaType);
            this.elements.navLinks[0].classList.add('active'); // Default to movies
            setupUniversalSearch();
        },

        setupEventListeners() {
            this.elements.navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.switchView(link.dataset.type);
                });
            });
        },

        // --- VIEW SWITCHING & CONTENT LOADING ---

        switchView(mediaType) {
            this.currentMediaType = mediaType;
            this.elements.navLinks.forEach(link => {
                link.classList.toggle('active', link.dataset.type === mediaType);
            });
            this.elements.contentDisplay.classList.remove('hidden');
            this.elements.genreResultsSection.classList.add('hidden');
            this.fetchAndDisplaySections(mediaType);
            this.fetchAndDisplayGenres(mediaType);
        },

        async fetchAndDisplaySections(mediaType) {
            this.toggleSectionVisibility(mediaType);
            const trendingGrid = (mediaType === 'movie') ? this.elements.trendingMoviesGrid : this.elements.trendingTvGrid;
            const topRatedGrid = (mediaType === 'movie') ? this.elements.topRatedMoviesGrid : this.elements.topRatedTvGrid;
            
            trendingGrid.innerHTML = '<p>Loading...</p>';
            topRatedGrid.innerHTML = '<p>Loading...</p>';

            const trendingUrl = `${API_BASE_URL}/trending/${mediaType}/week`;
            const topRatedUrl = `${API_BASE_URL}/${mediaType}/top_rated?language=en-US&page=1`;

            const [trendingData, topRatedData] = await Promise.all([
                fetchJson(trendingUrl),
                fetchJson(topRatedUrl)
            ]);
            
            if (trendingData && trendingData.results) {
                this.displayGrid(trendingData.results, trendingGrid, mediaType);
                this.startHeroSlideshow(trendingData.results.slice(0, 5), mediaType);
            }
            if (topRatedData && topRatedData.results) {
                this.displayGrid(topRatedData.results, topRatedGrid, mediaType);
            }
        },

        displayGrid(items, gridElement, mediaType) {
            if (!items || items.length === 0) {
                gridElement.innerHTML = '<p>No items to display.</p>';
                return;
            }
            gridElement.innerHTML = items.map(item => createMovieCard(item, mediaType)).join('');
        },

        toggleSectionVisibility(mediaType) {
            const isMovie = mediaType === 'movie';
            document.getElementById('trending-movies').style.display = isMovie ? 'block' : 'none';
            document.getElementById('top-rated-movies').style.display = isMovie ? 'block' : 'none';
            document.getElementById('trending-tv').style.display = !isMovie ? 'block' : 'none';
            document.getElementById('top-rated-tv').style.display = !isMovie ? 'block' : 'none';
        },
        
        // --- HERO SECTION ---

        updateHeroContent(item, mediaType) {
            this.elements.heroSection.style.backgroundImage = `linear-gradient(to right, rgba(0, 0, 0, 0.7) 30%, transparent), url(${ORIGINAL_IMAGE_BASE_URL}${item.backdrop_path})`;
            const title = mediaType === 'movie' ? item.title : item.name;
            const link = `movie.html?id=${item.id}&type=${mediaType}`;
            this.elements.heroSection.innerHTML = `
                <div class="hero-content">
                    <h1 class="hero-title">${title}</h1>
                    <p class="hero-overview">${item.overview}</p>
                    <a href="${link}" class="btn btn-primary">▶ Watch Now</a>
                </div>
            `;
        },

        startHeroSlideshow(items, mediaType) {
            if (!items || items.length === 0) return;
            let currentIndex = 0;
            this.updateHeroContent(items[currentIndex], mediaType);

            clearInterval(this.heroSlideshowInterval);
            this.heroSlideshowInterval = setInterval(() => {
                currentIndex = (currentIndex + 1) % items.length;
                this.updateHeroContent(items[currentIndex], mediaType);
            }, 7000);
        },

        // --- GENRE FILTERING ---

        async fetchAndDisplayGenres(mediaType) {
            const url = `${API_BASE_URL}/genre/${mediaType}/list?language=en-US`;
            const data = await fetchJson(url);
            if (!data || !data.genres) return;
            
            this.elements.genreBar.innerHTML = `<button class="genre-btn active" data-genre-id="all">All Genres</button>` +
                data.genres.map(genre => `<button class="genre-btn" data-genre-id="${genre.id}">${genre.name}</button>`).join('');

            this.elements.genreBar.querySelectorAll('.genre-btn').forEach(button => {
                button.addEventListener('click', () => {
                    this.elements.genreBar.querySelector('.genre-btn.active').classList.remove('active');
                    button.classList.add('active');
                    const genreId = button.dataset.genreId;
                    const genreName = button.textContent;

                    if (genreId === 'all') {
                        this.elements.contentDisplay.classList.remove('hidden');
                        this.elements.genreResultsSection.classList.add('hidden');
                    } else {
                        this.fetchAndDisplayByGenre(mediaType, genreId, genreName);
                    }
                });
            });
        },

        async fetchAndDisplayByGenre(mediaType, genreId, genreName, page = 1) {
            const url = `${API_BASE_URL}/discover/${mediaType}?with_genres=${genreId}&language=en-US&page=${page}`;
            const data = await fetchJson(url);
            if (!data) return;

            this.elements.contentDisplay.classList.add('hidden');
            this.elements.genreResultsSection.classList.remove('hidden');
            this.elements.genreResultsTitle.textContent = `${genreName}`;

            this.displayGrid(data.results, this.elements.genreResultsGrid, mediaType);
            this.setupPagination(mediaType, genreId, genreName, page, data.total_pages);
        },

        setupPagination(mediaType, genreId, genreName, currentPage, totalPages) {
            this.elements.paginationContainer.innerHTML = '';
            if (totalPages <= 1) return;

            const createButton = (page, text, isDisabled = false) => {
                const button = document.createElement('button');
                button.textContent = text;
                button.disabled = isDisabled;
                if (!isDisabled) {
                    button.addEventListener('click', () => this.fetchAndDisplayByGenre(mediaType, genreId, genreName, page));
                }
                return button;
            };

            if (currentPage > 1) {
                this.elements.paginationContainer.appendChild(createButton(currentPage - 1, '« Prev'));
            }

            const startPage = Math.max(1, currentPage - 2);
            const endPage = Math.min(totalPages, currentPage + 2);

            for (let i = startPage; i <= endPage; i++) {
                const pageButton = createButton(i, i);
                if (i === currentPage) {
                    pageButton.classList.add('active');
                    pageButton.disabled = true;
                }
                this.elements.paginationContainer.appendChild(pageButton);
            }

            if (currentPage < totalPages) {
                this.elements.paginationContainer.appendChild(createButton(currentPage + 1, 'Next »'));
            }
        },

        // --- CONTINUE WATCHING ---

        displayContinueWatching() {
            const history = getHistory();
            if (!history || history.length === 0) {
                this.elements.continueWatchingSection.classList.add('hidden');
                return;
            }
            
            this.elements.continueWatchingSection.classList.remove('hidden');
            const recentlyWatched = history.slice(0, 10); // Show up to 10
            
            let gridHTML = recentlyWatched.map(item => {
                // For history items, the type is stored on the item itself
                const cardHTML = createMovieCard(item, item.type);
                const cardElement = document.createElement('div');
                cardElement.innerHTML = cardHTML;
                const infoDiv = cardElement.querySelector('.movie-info');
                
                // Add progress bar
                let progress = 0;
                if (item.type === 'movie' && item.progress) {
                    progress = item.progress;
                } else if (item.type === 'tv' && item.watchedEpisodes) {
                    const totalEpisodes = Object.keys(item.watchedEpisodes).length;
                    const completedEpisodes = Object.values(item.watchedEpisodes).filter(ep => ep.status === 'completed').length;
                    if (totalEpisodes > 0) {
                        progress = (completedEpisodes / totalEpisodes) * 100;
                    }
                }
                
                if (infoDiv && progress > 0) {
                     infoDiv.innerHTML += `<div class="progress-bar-container"><div class="progress-bar" style="width: ${progress}%;"></div></div>`;
                }
                
                return cardElement.innerHTML;
            }).join('');

            this.elements.continueWatchingSection.innerHTML = `
                <h2>Continue Watching</h2>
                <div class="movie-grid">${gridHTML}</div>
            `;
        }
    };

    app.init();
}); 