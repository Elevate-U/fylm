# Mini-Player Feature Documentation

## Overview

This project now includes a YouTube-style mini-player feature using the modern **Document Picture-in-Picture API** (not the legacy `<video>.requestPictureInPicture()` method). This allows users to continue watching videos in an always-on-top window while navigating to other pages in the application.

## Features

✅ **Automatic Activation**: Mini-player automatically triggers when user navigates away from the video page
✅ **Seamless Playback**: Video continues playing without restarting or reloading
✅ **Modern API**: Uses the latest Document Picture-in-Picture API from WICG spec
✅ **Custom UI**: Full control over the mini-player interface with controls
✅ **Responsive Design**: Adapts to different screen sizes
✅ **Accessibility**: Supports keyboard navigation and screen readers

## Browser Compatibility

The mini-player now works on **ALL major browsers** through intelligent fallback detection:

### ✅ Full Support (All Browsers)

| Browser | Implementation Mode | Experience |
|---------|-------------------|-----------|
| **Chrome 116+** | Document PiP API | ⭐⭐⭐ Best - Separate window with full control |
| **Edge 116+** | Document PiP API | ⭐⭐⭐ Best - Separate window with full control |
| **Firefox** | Floating Player | ⭐⭐ Good - In-page draggable player |
| **Safari** | Floating Player | ⭐⭐ Good - In-page draggable player |
| **All Others** | Floating Player | ⭐⭐ Good - In-page draggable player |

### Fallback Modes

The implementation automatically detects browser capabilities and uses the best available mode:

1. **Document Picture-in-Picture** (Chrome 116+, Edge 116+)
   - Separate always-on-top window
   - Full HTML/CSS control
   - Best user experience
   - Can be moved anywhere on screen

2. **Floating Player** (Firefox, Safari, all others)
   - In-page fixed position element
   - Draggable mini-player
   - Stays within the main window
   - Works on all browsers

**Note**: Firefox technically supports video element PiP API, but since our video player uses iframes, the floating player fallback provides a better experience.

## Implementation Architecture

### 1. **MiniPlayer Context** (`src/context/MiniPlayer.jsx`)

A Preact context that manages the global state of the mini-player:

```jsx
import { useMiniPlayer } from '../context/MiniPlayer';

const { 
  isActive,           // Boolean: Is mini-player currently active?
  isSupported,        // Boolean: Does browser support the API?
  openMiniPlayer,     // Function: Open mini-player with video element
  closeMiniPlayer,    // Function: Close mini-player
  videoData          // Object: Current video information
} = useMiniPlayer();
```

### 2. **Watch Page Integration** (`src/pages/Watch.jsx`)

The Watch component automatically:
- Detects when the user navigates away from the page
- Captures the video player iframe element
- Transfers it to the PiP window
- Returns the player when user comes back to the page

### 3. **Mini-Player UI**

The mini-player window includes:
- **Header Bar**: Shows video title and controls
- **Video Container**: Full-screen video player
- **Return Button**: Navigate back to the original watch page
- **Close Button**: Close the mini-player entirely

## How It Works

### User Flow

1. **User starts watching a video** on the Watch page (`/watch/movie/123` or `/watch/tv/456/season/1/episode/1`)
2. **User navigates away** (e.g., clicks on Home, Favorites, or any other link)
3. **Mini-player activates automatically** in a separate always-on-top window
4. **Video continues playing seamlessly** without interruption
5. **User can**:
   - Continue browsing the site while watching
   - Click "Return to Page" to go back to full view
   - Click "Close" to stop the video entirely

### Technical Implementation

```javascript
// When user navigates away from Watch page
useEffect(() => {
  return () => {
    // Cleanup function runs on unmount
    const iframe = document.querySelector('iframe[title="Video Player"]');
    
    if (iframe && streamUrl && playerReady && !isMiniPlayerActive) {
      const videoInfo = {
        title: mediaDetails.title,
        url: window.location.href,
        // ... other metadata
      };
      
      // Open PiP window and move iframe to it
      openMiniPlayer(iframe, container, videoInfo);
    }
  };
}, [dependencies]);
```

### Document Picture-in-Picture API Usage

```javascript
// Request PiP window
const pipWindow = await window.documentPictureInPicture.requestWindow({
  width: 480,
  height: 270
});

// Clone styles from main document
const stylesheets = Array.from(document.styleSheets);
stylesheets.forEach(stylesheet => {
  // Copy styles to PiP window
});

// Move video element to PiP window
pipWindow.document.body.appendChild(videoElement);

// Handle window closure
pipWindow.addEventListener('pagehide', () => {
  // Return video to main document
});
```

## API Reference

### `useMiniPlayer()` Hook

#### Returns

```typescript
{
  isActive: boolean;              // Is mini-player currently active?
  isSupported: boolean;           // Browser support check
  videoData: VideoData | null;    // Current video information
  
  openMiniPlayer: (
    playerElement: HTMLElement,   // The video player element
    container: HTMLElement,       // Original container to return to
    videoInfo: VideoInfo          // Video metadata
  ) => Promise<boolean>;
  
  closeMiniPlayer: () => void;    // Close the mini-player
}
```

#### VideoInfo Type

```typescript
interface VideoInfo {
  title: string;        // Video title to display
  url: string;          // Watch page URL to return to
  type: string;         // Media type: 'movie' | 'tv' | 'anime'
  id: string | number;  // Media ID
  season?: number;      // Season number (for TV shows)
  episode?: number;     // Episode number (for TV shows)
}
```

## Styling

### Main Styles

All mini-player styles are in `src/styles/miniPlayer.css` and include:

- PiP window container styles
- Header and control button styles
- Animations and transitions
- Responsive breakpoints
- Dark/light mode support
- Accessibility improvements
- Reduced motion support

### Customization

To customize the mini-player appearance, edit:

```css
/* src/styles/miniPlayer.css */

/* Adjust window size */
@media (display-mode: picture-in-picture) {
  :root {
    --pip-width: 480px;    /* Change default width */
    --pip-height: 270px;   /* Change default height */
  }
}

/* Customize header colors */
#mini-player-header {
  background: rgba(0, 0, 0, 0.9); /* Change background */
  /* ... other styles */
}
```

## Feature Detection and Automatic Fallback

The implementation automatically detects the best available mode for the current browser:

```javascript
const detectSupportMode = () => {
  // Best: Document Picture-in-Picture API (Chrome 116+, Edge 116+)
  if ('documentPictureInPicture' in window) {
    return 'document-pip';
  }
  
  // Good: Video element Picture-in-Picture API (Firefox, older Chrome/Edge)
  if (document.pictureInPictureEnabled) {
    return 'video-pip';
  }
  
  // Fallback: Floating in-page mini-player (Safari, older browsers)
  return 'floating';
};

// Check current mode
const { fallbackMode } = useMiniPlayer();
console.log(`Using ${fallbackMode} mode`);
// Outputs: 'document-pip' | 'video-pip' | 'floating'
```

**The mini-player always works** - it just adapts based on browser capabilities!

## Accessibility Features

✅ **Keyboard Navigation**: All buttons are keyboard accessible
✅ **Screen Reader Support**: Proper ARIA labels on interactive elements
✅ **Focus Management**: Focus is properly managed when opening/closing
✅ **Reduced Motion**: Respects `prefers-reduced-motion` user preference
✅ **High Contrast**: Works with high contrast mode

## Performance Considerations

### Optimizations

1. **Style Cloning**: Only necessary styles are cloned to PiP window
2. **Async Activation**: Mini-player opens asynchronously to avoid blocking navigation
3. **Cleanup**: Proper cleanup on unmount prevents memory leaks
4. **Debouncing**: Prevents multiple simultaneous activations

### Best Practices

- Video playback is never interrupted
- State is preserved across transitions
- No additional video loading required
- Minimal performance impact

## Troubleshooting

### Mini-player doesn't activate

**Check:**
1. Browser supports Document PiP API (Chrome 116+)
2. Video is loaded and ready (`playerReady === true`)
3. User is navigating away (not just scrolling)
4. Not already in mini-player mode

### Styles look wrong in PiP window

**Solution:**
- Ensure all required stylesheets are being cloned
- Check for CORS issues with external stylesheets
- Add inline styles if needed for critical UI

### Video stops playing

**Possible causes:**
1. Browser autoplay restrictions
2. Network issues
3. CORS restrictions on video source

**Solution:**
- Ensure video has proper playback permissions
- Check browser console for errors
- Verify video source allows iframe embedding

## Future Enhancements

Possible improvements for future versions:

- [ ] Position preference (bottom-left, bottom-right, top-left, top-right)
- [ ] Size presets (small, medium, large)
- [ ] Keyboard shortcuts (P for play/pause, M for mute)
- [ ] Persistent position across sessions
- [ ] Mini-player for audio-only content
- [ ] Thumbnail preview on hover
- [ ] Progress bar in mini-player
- [ ] Volume control in mini-player

## Testing

### Manual Testing Checklist

1. **Basic Flow**
   - [ ] Start watching a video
   - [ ] Navigate to another page
   - [ ] Mini-player appears
   - [ ] Video continues playing

2. **Controls**
   - [ ] "Return to Page" button works
   - [ ] "Close" button works
   - [ ] Mini-player window can be moved
   - [ ] Mini-player window can be resized

3. **Edge Cases**
   - [ ] Navigate back to Watch page (mini-player closes)
   - [ ] Close main window (mini-player closes)
   - [ ] Multiple navigation attempts
   - [ ] Browser without PiP support

4. **Accessibility**
   - [ ] Tab navigation works
   - [ ] Screen reader announces elements
   - [ ] High contrast mode works
   - [ ] Keyboard shortcuts work

## Related Files

```
src/
├── context/
│   └── MiniPlayer.jsx          # Mini-player context and state management
├── pages/
│   └── Watch.jsx               # Watch page with mini-player integration
├── styles/
│   └── miniPlayer.css          # Mini-player specific styles
├── App.jsx                     # Main app with MiniPlayerProvider
└── index.css                   # Global styles (imports miniPlayer.css)
```

## Resources

- [WICG Document Picture-in-Picture Spec](https://wicg.github.io/document-picture-in-picture/)
- [MDN: Document Picture-in-Picture API](https://developer.mozilla.org/en-US/docs/Web/API/Document_Picture-in-Picture_API)
- [Chrome DevRel: Document Picture-in-Picture](https://developer.chrome.com/docs/web-platform/document-picture-in-picture/)

## Support

For issues or questions:
1. Check browser compatibility
2. Review console logs for errors
3. Verify feature detection is working
4. Check that all dependencies are properly installed

---

**Last Updated**: October 28, 2025  
**API Version**: Document Picture-in-Picture (WICG Spec)  
**Browser Support**: Chrome 116+, Edge 116+

