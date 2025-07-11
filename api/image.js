export const runtime = 'edge';

// Named export for GET requests - Vercel requirement
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new Response(JSON.stringify({ error: 'URL parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const decodedUrl = decodeURIComponent(imageUrl);
    console.log('Attempting to fetch image from:', decodedUrl);

    const imageRes = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!imageRes.ok) {
      console.error('Image fetch failed:', imageRes.status, imageRes.statusText);
      // Create a transparent PNG using Uint8Array instead of Buffer
      const transparentPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      const binaryString = atob(transparentPngBase64);
      const transparentPng = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        transparentPng[i] = binaryString.charCodeAt(i);
      }
      
      return new Response(transparentPng, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }
    
    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    
    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    });

    return new Response(imageRes.body, { headers });

  } catch (error) {
    console.error('Error proxying image:', error);
    // Create a transparent PNG using Uint8Array instead of Buffer
    const transparentPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const binaryString = atob(transparentPngBase64);
    const transparentPng = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      transparentPng[i] = binaryString.charCodeAt(i);
    }
    
    return new Response(transparentPng, {
      status: 500,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

// Handle OPTIONS requests (preflight)
export async function OPTIONS(req) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 