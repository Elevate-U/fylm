/**
 * SEO Utilities for Dynamic Meta Tags and Structured Data
 * Enhances search engine optimization with dynamic content
 */

// Update document title dynamically
export const updatePageTitle = (title, suffix = 'Fylm') => {
    if (typeof document !== 'undefined') {
        document.title = title ? `${title} | ${suffix}` : suffix;
    }
};

// Update meta description
export const updateMetaDescription = (description) => {
    if (typeof document !== 'undefined') {
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.name = 'description';
            document.head.appendChild(metaDesc);
        }
        metaDesc.content = description;
    }
};

// Update Open Graph meta tags
export const updateOpenGraphTags = (data) => {
    if (typeof document === 'undefined') return;
    
    const ogTags = {
        'og:title': data.title,
        'og:description': data.description,
        'og:image': data.image,
        'og:url': data.url || window.location.href,
        'og:type': data.type || 'website'
    };
    
    Object.entries(ogTags).forEach(([property, content]) => {
        if (content) {
            let metaTag = document.querySelector(`meta[property="${property}"]`);
            if (!metaTag) {
                metaTag = document.createElement('meta');
                metaTag.setAttribute('property', property);
                document.head.appendChild(metaTag);
            }
            metaTag.content = content;
        }
    });
};

// Update Twitter Card meta tags
export const updateTwitterCardTags = (data) => {
    if (typeof document === 'undefined') return;
    
    const twitterTags = {
        'twitter:title': data.title,
        'twitter:description': data.description,
        'twitter:image': data.image,
        'twitter:card': 'summary_large_image'
    };
    
    Object.entries(twitterTags).forEach(([name, content]) => {
        if (content) {
            let metaTag = document.querySelector(`meta[name="${name}"]`);
            if (!metaTag) {
                metaTag = document.createElement('meta');
                metaTag.name = name;
                document.head.appendChild(metaTag);
            }
            metaTag.content = content;
        }
    });
};

// Add structured data (JSON-LD)
export const addStructuredData = (data) => {
    if (typeof document === 'undefined') return;
    
    // Remove existing structured data
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
        existingScript.remove();
    }
    
    // Add new structured data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
};

// Generate movie/TV show structured data
export const generateMovieStructuredData = (mediaDetails, type) => {
    const baseData = {
        '@context': 'https://schema.org',
        '@type': type === 'movie' ? 'Movie' : 'TVSeries',
        'name': mediaDetails.title || mediaDetails.name,
        'description': mediaDetails.overview,
        'image': mediaDetails.poster_path ? `https://image.tmdb.org/t/p/w500${mediaDetails.poster_path}` : null,
        'datePublished': mediaDetails.release_date || mediaDetails.first_air_date,
        'genre': mediaDetails.genres?.map(g => g.name) || [],
        'aggregateRating': mediaDetails.vote_average ? {
            '@type': 'AggregateRating',
            'ratingValue': mediaDetails.vote_average,
            'ratingCount': mediaDetails.vote_count,
            'bestRating': 10,
            'worstRating': 0
        } : undefined
    };
    
    if (type === 'movie') {
        baseData.duration = mediaDetails.runtime ? `PT${mediaDetails.runtime}M` : undefined;
        baseData.director = mediaDetails.credits?.crew?.find(c => c.job === 'Director')?.name;
    } else {
        baseData.numberOfSeasons = mediaDetails.number_of_seasons;
        baseData.numberOfEpisodes = mediaDetails.number_of_episodes;
    }
    
    // Add cast information
    if (mediaDetails.credits?.cast) {
        baseData.actor = mediaDetails.credits.cast.slice(0, 5).map(actor => ({
            '@type': 'Person',
            'name': actor.name
        }));
    }
    
    return baseData;
};

// Generate anime structured data
export const generateAnimeStructuredData = (animeDetails) => {
    return {
        '@context': 'https://schema.org',
        '@type': 'TVSeries',
        'name': animeDetails.title || animeDetails.name,
        'description': animeDetails.overview || animeDetails.description,
        'image': animeDetails.poster_path || animeDetails.image,
        'genre': animeDetails.genres || [],
        'aggregateRating': animeDetails.vote_average || animeDetails.rating ? {
            '@type': 'AggregateRating',
            'ratingValue': animeDetails.vote_average || animeDetails.rating,
            'bestRating': 10,
            'worstRating': 0
        } : undefined,
        'numberOfEpisodes': animeDetails.episodes || animeDetails.episode_count
    };
};

// SEO-friendly URL generation
export const generateSEOFriendlySlug = (title) => {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .trim();
};

// Generate comprehensive SEO data for media items
export const generateMediaSEOData = (mediaDetails, type, currentSeason = null, currentEpisode = null) => {
    const title = mediaDetails.title || mediaDetails.name;
    const year = mediaDetails.release_date || mediaDetails.first_air_date ? 
        new Date(mediaDetails.release_date || mediaDetails.first_air_date).getFullYear() : '';
    
    let pageTitle = title;
    let description = mediaDetails.overview || `Watch ${title} online for free in HD quality.`;
    
    // Customize for episodes
    if (type === 'tv' && currentSeason && currentEpisode) {
        pageTitle = `${title} - Season ${currentSeason} Episode ${currentEpisode}`;
        description = `Watch ${title} Season ${currentSeason} Episode ${currentEpisode} online for free in HD quality. ${mediaDetails.overview || ''}`;
    } else if (type === 'anime' && currentSeason && currentEpisode) {
        pageTitle = `${title} - Episode ${currentEpisode}`;
        description = `Watch ${title} Episode ${currentEpisode} online for free in HD quality. ${mediaDetails.overview || ''}`;
    } else if (type === 'movie') {
        pageTitle = `${title}${year ? ` (${year})` : ''}`;
        description = `Watch ${title}${year ? ` (${year})` : ''} online for free in HD quality. ${mediaDetails.overview || ''}`;
    }
    
    const image = mediaDetails.poster_path ? 
        `https://image.tmdb.org/t/p/w500${mediaDetails.poster_path}` : 
        mediaDetails.image || '/android-chrome-512x512.png';
    
    return {
        title: pageTitle,
        description: description.substring(0, 160), // Limit to 160 characters
        image,
        url: window.location.href,
        type: type === 'movie' ? 'video.movie' : 'video.tv_show'
    };
};

// Update all SEO elements for a media page
export const updateMediaPageSEO = (mediaDetails, type, currentSeason = null, currentEpisode = null) => {
    const seoData = generateMediaSEOData(mediaDetails, type, currentSeason, currentEpisode);
    
    updatePageTitle(seoData.title);
    updateMetaDescription(seoData.description);
    updateOpenGraphTags(seoData);
    updateTwitterCardTags(seoData);
    
    // Add structured data
    let structuredData;
    if (type === 'anime') {
        structuredData = generateAnimeStructuredData(mediaDetails);
    } else {
        structuredData = generateMovieStructuredData(mediaDetails, type);
    }
    
    if (structuredData) {
        addStructuredData(structuredData);
    }
};

// Generate breadcrumb structured data
export const generateBreadcrumbData = (breadcrumbs) => {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': breadcrumbs.map((crumb, index) => ({
            '@type': 'ListItem',
            'position': index + 1,
            'name': crumb.name,
            'item': crumb.url
        }))
    };
};

// SEO optimization for search pages
export const updateSearchPageSEO = (query, resultsCount = 0) => {
    const title = query ? `Search Results for "${query}"` : 'Search Movies & TV Shows';
    const description = query ? 
        `Found ${resultsCount} results for "${query}". Watch movies and TV shows online for free in HD quality.` :
        'Search thousands of movies and TV shows. Watch online for free in HD quality.';
    
    updatePageTitle(title);
    updateMetaDescription(description);
    updateOpenGraphTags({
        title,
        description,
        image: '/android-chrome-512x512.png'
    });
};

// SEO optimization for category pages
export const updateCategoryPageSEO = (category) => {
    const titles = {
        movies: 'Free Movies Online - Watch HD Movies',
        tv: 'Free TV Shows Online - Watch HD Series',
        anime: 'Free Anime Online - Watch HD Anime Series',
        favorites: 'My Favorites - Saved Movies & TV Shows',
        history: 'Watch History - Continue Watching'
    };
    
    const descriptions = {
        movies: 'Watch thousands of free movies online in HD quality. No registration required. Stream action, comedy, horror, drama and more.',
        tv: 'Watch free TV shows and series online in HD quality. Stream popular shows, new episodes, and classic series.',
        anime: 'Watch free anime series and movies online in HD quality. Stream popular anime, new episodes, and classic series.',
        favorites: 'Access your saved favorite movies and TV shows. Continue watching where you left off.',
        history: 'View your watch history and continue watching movies and TV shows where you left off.'
    };
    
    const title = titles[category] || 'Fylm - Free Movies & TV Shows';
    const description = descriptions[category] || 'Watch free movies and TV shows online in HD quality.';
    
    updatePageTitle(title);
    updateMetaDescription(description);
    updateOpenGraphTags({
        title,
        description,
        image: '/android-chrome-512x512.png'
    });
};

// Add canonical URL
export const updateCanonicalUrl = (url) => {
    if (typeof document === 'undefined') return;
    
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
    }
    canonical.href = url || window.location.href;
};

// Generate sitemap data (for future sitemap generation)
export const generateSitemapEntry = (url, lastmod = new Date(), changefreq = 'weekly', priority = '0.8') => {
    return {
        url,
        lastmod: lastmod.toISOString().split('T')[0],
        changefreq,
        priority
    };
};