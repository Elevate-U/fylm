# Shikimori API Implementation Guide

This guide explains how to set up and use the Shikimori API in our streaming application.

## 1. Overview

The application now supports both AniList and Shikimori as anime data providers. Shikimori offers several advantages:

- Episode images/thumbnails (unique to Shikimori)
- Detailed episode metadata
- Russian titles for anime
- Similar anime recommendations
- Less restrictive API rate limits

## 2. Configuration

### Required Environment Variables

Add the following to your `.env` file:

```
# Shikimori API Configuration
VITE_SHIKIMORI_CLIENT_ID=your_shikimori_client_id
VITE_SHIKIMORI_CLIENT_SECRET=your_shikimori_client_secret

# Default Anime Provider (options: anilist, shikimori)
VITE_DEFAULT_ANIME_PROVIDER=anilist
```

### Obtaining API Credentials

1. Visit [Shikimori](https://shikimori.one/) and create an account
2. Navigate to [OAuth Applications](https://shikimori.one/oauth/applications)
3. Create a new application:
   - Name: Your app name (e.g., "Fylm Streaming")
   - Redirect URI: `https://your-domain.com/auth/callback`
   - Scopes: Select necessary permissions (basic user info and anime data)
4. Copy the generated Client ID and Client Secret to your environment variables

## 3. Features Implemented

### 3.1. Authentication

- OAuth2 implementation in `shikimoriApi.js`
- Token management (refresh and storage)
- Secure token storage in Supabase user metadata

### 3.2. Data Fetching

- Anime details (title, synopsis, cover image, etc.)
- Episode information with thumbnails
- Recommendations for similar anime
- Search functionality

### 3.3. ID Mapping

- Automatic mapping between AniList and Shikimori IDs
- Fallback to AniList when mapping fails
- Caching of mapped IDs to reduce API calls

### 3.4. UI Enhancements

- Provider selector in the Watch page
- Episode images from Shikimori when available
- User-friendly error handling when switching providers

## 4. API Endpoints

The following server-side endpoints have been added:

- `/shikimori/anime/:id` - Get anime details
- `/shikimori/anime/:id/episodes` - Get episode list with images
- `/shikimori/anime/:id/recommendations` - Get similar anime
- `/shikimori/search` - Search for anime
- `/mapping/anilist-to-shikimori/:anilistId` - Map AniList IDs to Shikimori IDs

## 5. User Experience

Users can now:

1. Choose between AniList and Shikimori as their anime data provider
2. See episode thumbnails when using Shikimori
3. Get recommendations based on Shikimori's algorithm
4. Search anime in both providers

## 6. Known Limitations

1. Not all AniList anime can be mapped to Shikimori IDs
2. Shikimori doesn't provide backdrop images
3. Episode details might be less complete for some anime
4. Shikimori API requires authentication for some endpoints

## 7. Future Enhancements

1. Implement user anime lists and sync between providers
2. Add Shikimori user ratings and reviews
3. Create a global provider preference setting
4. Optimize ID mapping with local caching

## 8. Troubleshooting

- If mapping fails, the application will automatically fall back to AniList
- Check browser console for API error messages
- Ensure your Shikimori API credentials are correctly configured
- Verify network connectivity to both APIs 