import fetch from 'node-fetch';

export default async function handler(req, res) {
  const imageUrl = req.query.url;
  if (!imageUrl) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const decodedUrl = decodeURIComponent(imageUrl);
    console.log('Attempting to fetch image from:', decodedUrl);
    
    // Set CORS headers first
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    // Handle OPTIONS requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Create timeout promise for compatibility
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 10000);
    });
    
    const fetchPromise = fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const imageRes = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (!imageRes.ok) {
      console.error('Image fetch failed:', imageRes.status, imageRes.statusText);
      // Return a simple 1x1 transparent PNG instead of an error
      const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
      return res.end(transparentPng);
    }
    
    // Get the content type from the response
    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    
    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    // Handle different environments (Vercel vs local Express)
    if (typeof imageRes.body.pipe === 'function' && process.env.NODE_ENV !== 'production') {
      // Local Express environment - use streaming
      imageRes.body.pipe(res);
    } else {
      // Vercel serverless environment - use buffer
      const buffer = await imageRes.buffer();
      res.end(buffer);
    }
    
  } catch (error) {
    console.error('Error proxying image:', error);
    
    // Return a simple 1x1 transparent PNG for any error
    const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(transparentPng);
  }
} 