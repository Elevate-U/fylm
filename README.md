# Fylm - Movie and TV Streaming Platform

A modern movie, TV show, and anime streaming platform with a clean user interface.

## Features

- Browse movies, TV shows, and anime from various sources
- Stream content through Videasy, VidSrc, and EmbedSU providers
- User authentication with Supabase
- Favorites and watch history tracking
- Continue watching functionality
- Responsive design for all devices
- Dark/light theme toggle

## Anime Tab

The new Anime tab integrates with AniList API to provide:
- Trending anime content
- Popular anime
- Top rated anime
- Currently airing shows
- Upcoming anime releases

Anime content is played through the Videasy player, which provides the best anime streaming experience with features like:
- Episode selection
- Dub/sub toggle
- Auto-next episode
- Watch progress tracking

## Technical Stack

- Frontend: Preact, React Router
- State Management: Zustand
- Authentication: Supabase Auth
- Database: Supabase PostgreSQL
- APIs: TMDB API, AniList API
- Styling: CSS3 with custom properties for theming
- Deployment: Vercel

## Environment Variables

```env
TMDB_API_KEY=your_tmdb_api_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_CONSUMET_API_URL=consumet_api_url
VITE_API_BASE_URL=/api
PORT=3001
```

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see above)
4. Start development server: `npm run dev`
5. API server: `npm run dev:api`

## Deployment

See `DEPLOYMENT-GUIDE.md` and `DEPLOYMENT-CHECKLIST.md` for detailed instructions on deploying to production. 