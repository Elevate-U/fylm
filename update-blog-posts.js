// Script to update existing blog posts with working TMDB links and images
// This script will:
// 1. Fetch all existing blog posts
// 2. Update internal links to use proper routing format
// 3. Add TMDB images where appropriate
// 4. Fix any broken hyperlinks

// Node.js compatible imports
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Supabase client for Node.js
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// TMDB API configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// Movie/TV show mappings for the blog posts
const CONTENT_MAPPINGS = {
  'stranger-things': { type: 'tv', id: 66732 },
  'breaking-bad': { type: 'tv', id: 1396 },
  'the-office': { type: 'tv', id: 2316 },
  'game-of-thrones': { type: 'tv', id: 1399 },
  'friends': { type: 'tv', id: 1668 },
  'captain-america-first-avenger': { type: 'movie', id: 1771 },
  'iron-man': { type: 'movie', id: 1726 },
  'wandavision': { type: 'tv', id: 85271 },
  'spider-man-homecoming': { type: 'movie', id: 315635 },
  'black-widow': { type: 'movie', id: 497698 },
  'the-mandalorian': { type: 'tv', id: 82856 },
  'loki': { type: 'tv', id: 84958 },
  'falcon-winter-soldier': { type: 'tv', id: 88396 },
  'hawkeye': { type: 'tv', id: 88329 },
  'dark-knight-rises': { type: 'movie', id: 49026 },
  'avengers-endgame': { type: 'movie', id: 299534 },
  'star-wars-new-hope': { type: 'movie', id: 11 },
  'the-matrix': { type: 'movie', id: 603 },
  'toy-story': { type: 'movie', id: 862 },
  'the-notebook': { type: 'movie', id: 11036 },
  'when-harry-met-sally': { type: 'movie', id: 639 },
  '10-things-i-hate-about-you': { type: 'movie', id: 4951 },
  'crazy-stupid-love': { type: 'movie', id: 50014 },
  'the-princess-bride': { type: 'movie', id: 2493 }
};

/**
 * Fetch TMDB details for a movie or TV show
 */
async function fetchTMDBDetails(type, id) {
  try {
    const response = await fetch(`${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}`);
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching TMDB details for ${type}/${id}:`, error);
    return null;
  }
}

/**
 * Update links in content to use proper routing format
 */
function updateContentLinks(content) {
  // Replace old-style links with new routing format
  let updatedContent = content;
  
  // Update watch links to use proper format
  updatedContent = updatedContent.replace(
    /<a href="#\/watch\/(tv|movie)\/(\d+)">([^<]+)<\/a>/g,
    '<a href="/watch/$1/$2">$3</a>'
  );
  
  // Ensure all internal links are properly formatted
  updatedContent = updatedContent.replace(
    /<a href="#\/([^"]+)">([^<]+)<\/a>/g,
    '<a href="/$1">$2</a>'
  );
  
  return updatedContent;
}

/**
 * Add TMDB images to content where appropriate
 */
async function addTMDBImages(content) {
  let updatedContent = content;
  
  // Find all watch links and add images
  const watchLinkRegex = /<a href="\/watch\/(tv|movie)\/(\d+)">([^<]+)<\/a>/g;
  const matches = [...content.matchAll(watchLinkRegex)];
  
  for (const match of matches) {
    const [fullMatch, type, id, title] = match;
    
    // Fetch TMDB details
    const details = await fetchTMDBDetails(type, id);
    if (details && details.poster_path) {
      const imageUrl = `${TMDB_IMAGE_BASE}${details.poster_path}`;
      
      // Create enhanced link with image
      const enhancedLink = `
        <div class="content-recommendation">
          <img src="${imageUrl}" alt="${title}" class="recommendation-poster" style="width: 100px; height: 150px; object-fit: cover; border-radius: 8px; margin-right: 15px; float: left;" />
          <div class="recommendation-details">
            <h4><a href="/watch/${type}/${id}">${title}</a></h4>
            <p class="recommendation-overview">${details.overview ? details.overview.substring(0, 150) + '...' : ''}</p>
            <p class="recommendation-meta">
              ${type === 'movie' ? 'Movie' : 'TV Series'} • 
              ${details.vote_average ? `★ ${details.vote_average.toFixed(1)}` : ''}
            </p>
          </div>
          <div style="clear: both;"></div>
        </div>
      `;
      
      // Replace the simple link with enhanced version
      updatedContent = updatedContent.replace(fullMatch, enhancedLink);
    }
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return updatedContent;
}

/**
 * Update featured images with TMDB images where appropriate
 */
async function updateFeaturedImage(post) {
  // If the post doesn't have a featured image or it's a generic one, try to find a relevant TMDB image
  if (!post.featured_image_url || post.featured_image_url.includes('unsplash.com')) {
    // Try to find the first mentioned movie/TV show in the content
    const watchLinkRegex = /<a href="\/watch\/(tv|movie)\/(\d+)">([^<]+)<\/a>/;
    const match = post.content.match(watchLinkRegex);
    
    if (match) {
      const [, type, id] = match;
      const details = await fetchTMDBDetails(type, id);
      
      if (details && details.backdrop_path) {
        return `https://image.tmdb.org/t/p/w1280${details.backdrop_path}`;
      }
    }
  }
  
  return post.featured_image_url;
}

/**
 * Get all blog posts (admin function)
 */
async function getAllBlogPosts() {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }
}

/**
 * Main function to update all blog posts
 */
async function updateAllBlogPosts() {
  console.log('🚀 Starting blog post updates...');
  
  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY environment variable is required');
    process.exit(1);
  }
  
  try {
    // Get all blog posts
    console.log('📚 Fetching all blog posts...');
    const posts = await getAllBlogPosts();
    console.log(`Found ${posts.length} blog posts to update`);
    
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      console.log(`\n🔄 Updating post ${i + 1}/${posts.length}: "${post.title}"`);
      
      try {
        // Update content links
        console.log('  📝 Updating content links...');
        let updatedContent = updateContentLinks(post.content);
        
        // Add TMDB images to content
        console.log('  🖼️  Adding TMDB images...');
        updatedContent = await addTMDBImages(updatedContent);
        
        // Update featured image
        console.log('  🎨 Updating featured image...');
        const updatedFeaturedImage = await updateFeaturedImage({
          ...post,
          content: updatedContent
        });
        
        // Update the post in database
        const { error } = await supabase
          .from('blog_posts')
          .update({
            content: updatedContent,
            featured_image_url: updatedFeaturedImage,
            updated_at: new Date().toISOString()
          })
          .eq('id', post.id);
        
        if (error) {
          console.error(`  ❌ Error updating post "${post.title}":`, error);
        } else {
          console.log(`  ✅ Successfully updated "${post.title}"`);
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing post "${post.title}":`, error);
      }
      
      // Add delay between posts to avoid rate limiting
      if (i < posts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n🎉 Blog post updates completed!');
    
  } catch (error) {
    console.error('❌ Error updating blog posts:', error);
    process.exit(1);
  }
}

// CSS styles are now embedded in the content where needed

// Run the update function
updateAllBlogPosts().catch(console.error);

export { updateAllBlogPosts, updateContentLinks, addTMDBImages };