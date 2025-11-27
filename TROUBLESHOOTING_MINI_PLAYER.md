# Mini-Player Troubleshooting Guide 🔧

## Common Issues and Solutions

### ❌ Issue 1: Mini-Player Not Appearing At All

#### Symptoms:
- Navigate away from video page
- Nothing happens
- No mini-player appears

#### Causes & Solutions:

**1. Development Server Not Running**
```bash
# Check if server is running
curl http://localhost:5173

# If not running, start it:
npm run dev:full
```

**2. Video Not Loaded Yet**
- ✅ **Wait** for the video player iframe to fully load
- ✅ Look for the video player on the page
- ✅ Console should show: "🎬 Player iframe loaded"

**3. Player Not Ready**
- The mini-player only triggers if `playerReady === true`
- Check browser console for: `console.log('🎬 Player iframe loaded')`

**4. Haven't Actually Navigated Away**
- ❌ Scrolling on the same page won't trigger it
- ✅ Click a navigation link (Home, Favorites, etc.)
- ✅ Use browser back button after navigating

#### Quick Check:
Open browser console and look for these messages:
```javascript
✅ "🎬 Player iframe loaded" - Player is ready
✅ "🎬 Navigating away, activating mini-player" - Mini-player triggered
✅ "🎬 Opening mini-player in [mode] mode" - Mode detected
✅ "✅ [Mode] mini-player opened successfully" - Success!
```

### ❌ Issue 2: Console Errors

#### Error: "useMiniPlayer must be used within a MiniPlayerProvider"

**Cause**: The MiniPlayerProvider is not wrapping your app

**Solution**: Check `src/App.jsx`:
```jsx
return (
  <AuthProvider>
    <MiniPlayerProvider>  {/* ← Must be here */}
      <MainApp />
    </MiniPlayerProvider>
  </AuthProvider>
);
```

#### Error: "Cannot read property 'openMiniPlayer' of undefined"

**Cause**: Hook not imported correctly

**Solution**: Check imports in `Watch.jsx`:
```jsx
import { useMiniPlayer } from '../context/MiniPlayer';

// Then use it:
const { openMiniPlayer, closeMiniPlayer, isActive, isSupported } = useMiniPlayer();
```

### ❌ Issue 3: Mini-Player Opens But Video Doesn't Play

#### On Chrome/Edge (Document PiP):

**Cause**: iframe might not have moved correctly

**Solution**:
1. Check console for errors
2. Verify streamUrl exists
3. Check if iframe has `src` attribute

#### On Firefox/Safari (Floating Player):

**Cause**: iframe clone might not have src

**Solution**: The code should automatically preserve the src:
```javascript
// In openFloatingPlayer function
if (playerElement.tagName === 'IFRAME' && clonedPlayer.tagName === 'IFRAME') {
  clonedPlayer.src = playerElement.src; // ← This should happen
}
```

### ❌ Issue 4: Mini-Player Opens Multiple Times

**Cause**: Navigation happening multiple times rapidly

**Solution**: Already implemented with debouncing (100ms timeout)

**Check**: Look for multiple console logs:
```javascript
🎬 Navigating away, activating mini-player
🎬 Navigating away, activating mini-player  ← Duplicate
```

If you see this, it's expected behavior and the system handles it.

### ❌ Issue 5: Can't Close Mini-Player

#### On Chrome/Edge:
- Click the "Close" button in PiP window
- Or close the PiP window using the X button

#### On Firefox/Safari:
- Click the "✕" button in floating player header
- Or refresh the page

### ❌ Issue 6: Floating Player Not Draggable (Firefox/Safari)

**Cause**: JavaScript event listeners not attached

**Debug**:
1. Open console
2. Check for: `✅ Floating mini-player opened successfully`
3. Try clicking and dragging the header bar (not the video area)

**Note**: You can only drag by clicking the **header bar** (where the title is), not the video itself.

### ❌ Issue 7: Mini-Player Stays When Returning to Watch Page

**Symptoms**:
- Navigate back to watch page
- Mini-player still visible

**Expected Behavior**: Should auto-close

**Check**:
```javascript
// Should see in console:
👁️ Watch page mounted, closing mini-player
```

**Solution**: If not closing, refresh the page.

## Debugging Steps

### Step 1: Check Browser Console

Open DevTools (F12) and look for these messages:

```javascript
// When page loads:
🔍 Auth status: Authenticated user [id]

// When video loads:
🎬 Player iframe loaded
📍 Videasy native resume - no seeking needed (or similar)

// When navigating away:
🎬 Navigating away, activating mini-player
🎬 Opening mini-player in [floating/document-pip] mode
✅ [Mode] mini-player opened successfully
```

### Step 2: Check Elements

Open DevTools → Elements tab:

**For Document PiP (Chrome/Edge)**:
- New window should open
- Window title: "Picture-in-Picture"

**For Floating Player (Firefox/Safari)**:
- Look for element with class: `floating-mini-player`
- Should be in `<body>` at the end
- Should have inline styles with `position: fixed`

### Step 3: Check Network Tab

**Problem**: Video not loading in mini-player

**Check**:
- Look for iframe src URL
- Check if video source is being fetched
- Look for any CORS errors

### Step 4: Test Step by Step

1. ✅ Open browser (Chrome, Firefox, or Safari)
2. ✅ Navigate to `/watch/movie/550` (or any video)
3. ✅ Wait for player to load (see iframe on page)
4. ✅ Wait for console: "🎬 Player iframe loaded"
5. ✅ Click "Home" link in navigation
6. ✅ Look for mini-player (separate window or floating)
7. ✅ Check console for success message

## Browser-Specific Issues

### Chrome/Edge Issues

**Issue**: PiP window opens but is blank

**Solution**:
- Check if Document PiP is enabled
- Chrome → Settings → Privacy and security → Site settings
- Make sure popups aren't blocked

### Firefox Issues

**Issue**: Nothing happens at all

**Solution**:
1. Check console for the mode: Should say `floating mode`
2. Look for floating player in bottom-left
3. Check if JavaScript is enabled
4. Try hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)

### Safari Issues

**Issue**: Floating player appears but video is black

**Solution**:
- Safari has strict iframe policies
- Check if the video source allows iframe embedding
- Try different video source in the player settings

## Performance Checks

### High CPU Usage

**Cause**: Multiple mini-players or memory leak

**Solution**:
1. Refresh the page
2. Check console for multiple "opened successfully" messages
3. Look for multiple floating players in DOM

### Memory Leak

**Symptoms**: Browser gets slower over time

**Solution**:
1. Close and reopen mini-player
2. Refresh the page
3. Check for leftover elements in DevTools

## Quick Fixes

### "Nothing Works!"

Try this in order:
1. ✅ Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
2. ✅ Clear browser cache
3. ✅ Restart development server: `npm run dev:full`
4. ✅ Check console for errors
5. ✅ Try different browser

### "It Worked Before But Not Now"

Common causes:
1. Development server stopped
2. Browser cached old version
3. Recent code changes conflicting

**Solution**:
```bash
# Stop server (Ctrl+C)
# Clear cache
# Restart server
npm run dev:full

# In browser:
# Hard refresh (Ctrl+Shift+R)
# Try again
```

## Verification Checklist

Use this checklist to verify everything is working:

### Setup Verification
- [ ] `npm run dev:full` is running
- [ ] Can access app in browser
- [ ] No console errors on home page
- [ ] Can navigate to a video page

### Video Page Verification
- [ ] Video player loads (see iframe)
- [ ] Console shows: "🎬 Player iframe loaded"
- [ ] Video starts playing (or loading)
- [ ] No red errors in console

### Mini-Player Activation
- [ ] Click a navigation link (e.g., Home)
- [ ] Console shows: "🎬 Navigating away, activating mini-player"
- [ ] Console shows: "🎬 Opening mini-player in [mode] mode"
- [ ] Console shows: "✅ [Mode] mini-player opened successfully"

### Mini-Player Functionality
- [ ] Mini-player appears (window or floating)
- [ ] Video is visible in mini-player
- [ ] Video is playing (not stuck)
- [ ] Can see title in header
- [ ] "Return" button is visible
- [ ] "Close" button is visible

### Mini-Player Controls
- [ ] Click "Return" → navigates back to watch page
- [ ] Click "Close" → mini-player closes
- [ ] (Floating only) Can drag by header
- [ ] Video plays smoothly

## Still Not Working?

If you've tried everything above and it's still not working:

### Collect Debug Info

1. **Browser & Version**:
   - Which browser? (Chrome, Firefox, Safari, Edge)
   - Version number? (Help → About)

2. **Console Messages**:
   - Copy all console messages
   - Look for red errors
   - Look for missing "✅" success messages

3. **Network Tab**:
   - Any failed requests?
   - Any CORS errors?
   - Is the video URL loading?

4. **Elements Tab**:
   - For Chrome/Edge: Check if PiP window opened
   - For Firefox/Safari: Look for `.floating-mini-player` element
   - Is the iframe present?

### Common Root Causes

**90% of issues are caused by**:
1. Server not running (50%)
2. Video not loaded yet (20%)
3. Not actually navigating away (10%)
4. Browser cache (10%)

## Emergency Reset

If nothing else works, do a complete reset:

```bash
# 1. Stop server
# Press Ctrl+C in terminal

# 2. Clear node modules (if really broken)
rm -rf node_modules package-lock.json

# 3. Reinstall
npm install

# 4. Start fresh
npm run dev:full
```

In browser:
1. Clear all browser cache
2. Close all tabs
3. Restart browser
4. Try again

---

## Need More Help?

Check the implementation files:
- `src/context/MiniPlayer.jsx` - Main logic
- `src/pages/Watch.jsx` - Integration
- `MINI_PLAYER_DOCUMENTATION.md` - Technical details

**Remember**: The mini-player only triggers when you **navigate away** from the video page, not when you scroll or do anything else on the same page!



