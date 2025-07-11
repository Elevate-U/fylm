# Player Message Format Optimization

## Problem
The current `MEDIA_DATA` message format sends the entire media library (hundreds of KB) every few seconds just to update progress for a single media item. This causes significant performance issues:

- Large payload sizes (100KB+)
- Frequent network overhead
- JSON parsing of large objects
- Browser memory consumption
- Console spam

## Solution: Efficient PROGRESS_UPDATE Format

### New Recommended Format

Instead of sending the entire media library, send only the specific progress data:

```json
{
  "type": "PROGRESS_UPDATE",
  "data": {
    "mediaId": "tv-62650",
    "mediaType": "tv",
    "season": 2,
    "episode": 3,
    "progress": {
      "watched": 15.2,
      "duration": 2499
    },
    "timestamp": 1752122522841
  }
}
```

### Message Format Specifications

#### For TV Shows/Series
```json
{
  "type": "PROGRESS_UPDATE",
  "data": {
    "mediaId": "tv-{tmdb_id}",
    "mediaType": "tv",
    "season": 2,
    "episode": 3,
    "progress": {
      "watched": 15.2,         // Current playback time in seconds
      "duration": 2499         // Total episode duration in seconds
    },
    "timestamp": 1752122522841  // Unix timestamp of the update
  }
}
```

#### For Movies
```json
{
  "type": "PROGRESS_UPDATE",
  "data": {
    "mediaId": "movie-{tmdb_id}",
    "mediaType": "movie",
    "progress": {
      "watched": 1450.5,       // Current playback time in seconds
      "duration": 8597         // Total movie duration in seconds
    },
    "timestamp": 1752122522841  // Unix timestamp of the update
  }
}
```

### Implementation Example

#### JavaScript Player Implementation
```javascript
// Instead of sending entire MEDIA_DATA
function sendProgressUpdate(mediaId, mediaType, progress, season = null, episode = null) {
  const message = {
    type: 'PROGRESS_UPDATE',
    data: {
      mediaId: mediaId,
      mediaType: mediaType,
      progress: {
        watched: progress.currentTime,
        duration: progress.duration
      },
      timestamp: Date.now()
    }
  };
  
  // Add season/episode for TV shows
  if (mediaType === 'tv' && season && episode) {
    message.data.season = season;
    message.data.episode = episode;
  }
  
  // Send to parent window
  window.parent.postMessage(message, '*');
}

// Usage in video player
video.addEventListener('timeupdate', () => {
  if (video.currentTime > 0) {
    sendProgressUpdate(
      currentMediaId,
      currentMediaType,
      {
        currentTime: video.currentTime,
        duration: video.duration
      },
      currentSeason,
      currentEpisode
    );
  }
});
```

#### React Component Handler (Already Implemented)
The Watch.jsx component now handles both formats:

```javascript
// New efficient format (recommended)
if (data.type === 'PROGRESS_UPDATE' && data.data) {
  // Process small, targeted update
  handleProgressUpdate(progressData, 'PROGRESS_UPDATE');
}

// Legacy format (deprecated)
if (data.type === 'MEDIA_DATA' && data.data) {
  // Process large, inefficient update with warning
  console.warn('Legacy MEDIA_DATA format detected');
  handleProgressUpdate(progressData, 'MEDIA_DATA');
}
```

## Benefits of New Format

### Performance Improvements
- **Payload size**: ~200 bytes vs ~100KB+ (500x reduction)
- **Parsing time**: Near-instantaneous vs several milliseconds
- **Memory usage**: Minimal vs significant heap allocation
- **Network traffic**: Dramatically reduced

### Developer Experience
- **Console clarity**: No more spam from large objects
- **Debugging**: Easy to trace specific media updates
- **Monitoring**: Clear distinction between legacy and new formats

## Migration Strategy

### Phase 1: Backward Compatibility ✅
- Watch.jsx component supports both formats
- Legacy `MEDIA_DATA` messages still work
- Occasional warnings logged for legacy format

### Phase 2: Player Updates
- Update player to send `PROGRESS_UPDATE` messages
- Reduce frequency of legacy `MEDIA_DATA` messages
- Test with new format

### Phase 3: Legacy Deprecation
- Remove `MEDIA_DATA` message handling
- Full migration to efficient format

## Testing

### Verify New Format Works
1. Update player to send `PROGRESS_UPDATE` messages
2. Check browser console for successful progress saves
3. Verify no performance issues during playback

### Monitor Legacy Usage
- Watch for deprecation warnings in console
- Track when legacy format is still being used
- Plan migration timeline

## Additional Optimizations

### Message Throttling
- Send updates every 5-10 seconds maximum
- Avoid sending identical progress values
- Implement client-side throttling

### Error Handling
```javascript
try {
  window.parent.postMessage(message, '*');
} catch (error) {
  console.error('Failed to send progress update:', error);
  // Fallback to legacy format if needed
}
```

This optimization will significantly improve your application's performance while maintaining full backward compatibility during the transition period. 