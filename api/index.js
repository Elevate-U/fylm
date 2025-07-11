import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import tmdbProxy from './tmdb.js'; // Import the new generic handler

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const apiRoutes = express.Router();

// Use the generic TMDB proxy for all routes under /tmdb
apiRoutes.use('/tmdb', tmdbProxy);

// Manually setup stream-url route
const streamUrlModule = await import('./stream-url.js');
if (typeof streamUrlModule.default === 'function') {
    apiRoutes.all('/stream-url', streamUrlModule.default);
}

// Add image proxy route for local development
const imageModule = await import('./image.js');
if (typeof imageModule.default === 'function') {
    app.all('/image-proxy', imageModule.default);
}

app.use('/api', apiRoutes);

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});

export default app; 