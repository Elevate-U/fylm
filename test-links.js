// Test script to verify link replacement
import { updateContentLinks } from './update-blog-posts.js';

const testContent = `
<p>Check out <a href="#/movie/872585">Oppenheimer</a> for a great film.</p>
<p>Also watch <a href="#/tv/66732">Stranger Things</a> on Netflix.</p>
<p>And don't miss <a href="#/watch/movie/1726">Iron Man</a> either.</p>
`;

console.log('Original content:');
console.log(testContent);

const updatedContent = updateContentLinks(testContent);

console.log('\nUpdated content:');
console.log(updatedContent);