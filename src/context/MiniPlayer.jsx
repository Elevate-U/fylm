import { h, createContext } from 'preact';
import { useState, useContext, useEffect, useRef } from 'preact/hooks';
import { route } from 'preact-router';
import { saveWatchProgress } from '../utils/watchHistory';
import { supabase } from '../supabase';
import { isIOS } from '../utils/iosUtils';

const MiniPlayerContext = createContext();

export const useMiniPlayer = () => {
  const context = useContext(MiniPlayerContext);
  if (!context) {
    throw new Error('useMiniPlayer must be used within a MiniPlayerProvider');
  }
  return context;
};

export const MiniPlayerProvider = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [videoData, setVideoData] = useState(null);
  const [fallbackMode, setFallbackMode] = useState(null); // 'document-pip' | 'video-pip' | 'floating'
  const pipWindowRef = useRef(null);
  const playerElementRef = useRef(null);
  const originalContainerRef = useRef(null);
  const floatingPlayerRef = useRef(null);
  const videoElementRef = useRef(null);
  const lastProgressSaveTime = useRef(0);

  // Check browser support and determine fallback mode
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

  // Check if any form of mini-player is supported
  const isSupported = () => {
    return true; // Always supported via fallbacks
  };

  // Open the mini-player (with automatic fallback detection)
  const openMiniPlayer = async (playerElement, container, videoInfo) => {
    try {
      console.log('🔍 openMiniPlayer called with:', {
        hasPlayerElement: !!playerElement,
        hasContainer: !!container,
        hasVideoInfo: !!videoInfo,
        isActive
      });

      // Check if already active
      if (isActive) {
        console.log('⚠️ Mini-player already active, skipping');
        return true;
      }

      // Validate inputs
      if (!playerElement) {
        console.error('❌ No player element provided');
        return false;
      }

      if (!container) {
        console.error('❌ No container provided');
        return false;
      }

      // Store references
      playerElementRef.current = playerElement;
      originalContainerRef.current = container;

      // Detect support mode
      const mode = detectSupportMode();
      setFallbackMode(mode);
      console.log(`🎬 Opening mini-player in ${mode} mode`);

      // Route to appropriate implementation
      switch (mode) {
        case 'document-pip':
          const dpipResult = await openDocumentPiP(playerElement, container, videoInfo);
          if (!dpipResult) {
            console.log('⚠️ Document PiP failed, falling back to floating player');
            setFallbackMode('floating');
            return await openFloatingPlayer(playerElement, container, videoInfo);
          }
          return dpipResult;
        case 'video-pip':
          const vpipResult = await openVideoPiP(playerElement, container, videoInfo);
          if (!vpipResult) {
            console.log('⚠️ Video PiP failed, falling back to floating player');
            setFallbackMode('floating');
            return await openFloatingPlayer(playerElement, container, videoInfo);
          }
          return vpipResult;
        case 'floating':
          return await openFloatingPlayer(playerElement, container, videoInfo);
        default:
          console.error('Unknown fallback mode');
          return false;
      }
    } catch (error) {
      console.error('❌ Failed to open mini-player:', error);
      return false;
    }
  };

  // Track watch history while MiniPlayer is active
  useEffect(() => {
    if (!isActive || !videoData) return;

    const handleMessage = async (event) => {
      // Verify origin if possible, but for now we trust the source as it's our own iframe
      const data = event.data;

      if (data && data.type === 'video-progress') {
        const now = Date.now();
        if (now - lastProgressSaveTime.current < 5000) { // Throttle to 5 seconds
          return;
        }

        lastProgressSaveTime.current = now;

        try {
          const { session } = await supabase.auth.getSession();
          const userId = session?.user?.id;

          if (userId) {
            console.log('📱 [MiniPlayer] Saving progress:', data.progress);
            await saveWatchProgress(
              userId,
              {
                id: videoData.id,
                type: videoData.type,
                season: videoData.season,
                episode: videoData.episode
              },
              data.progress,
              data.duration,
              false,
              session
            );
          }
        } catch (err) {
          console.error('❌ [MiniPlayer] Error saving progress:', err);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isActive, videoData]);

  // Implementation 1: Document Picture-in-Picture (Chrome 116+, Edge 116+)
  const openDocumentPiP = async (playerElement, container, videoInfo) => {
    try {
      // Check if already in PiP mode
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        console.log('Document PiP already active');
        return true;
      }

      // Request PiP window
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 480,
        height: 270,
        // Position in bottom-left corner (CSS will handle actual positioning)
      });

      pipWindowRef.current = pipWindow;

      // Clone styles from main document to PiP window
      const stylesheets = Array.from(document.styleSheets);
      stylesheets.forEach((stylesheet) => {
        try {
          if (stylesheet.href) {
            // External stylesheet
            const link = pipWindow.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = stylesheet.href;
            pipWindow.document.head.appendChild(link);
          } else if (stylesheet.cssRules) {
            // Inline stylesheet
            const style = pipWindow.document.createElement('style');
            const cssRules = Array.from(stylesheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n');
            style.textContent = cssRules;
            pipWindow.document.head.appendChild(style);
          }
        } catch (e) {
          // Some stylesheets might not be accessible due to CORS
          console.warn('Could not clone stylesheet:', e);
        }
      });

      // Add custom styles for the mini-player with glassmorphic design
      const miniPlayerStyles = pipWindow.document.createElement('style');
      miniPlayerStyles.textContent = `
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background: rgba(0, 0, 0, 0.95);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }

        #mini-player-container {
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: transparent;
        }

        #mini-player-header {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          padding: 10px 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #fff;
          font-size: 13px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
          user-select: none;
        }

        #mini-player-title {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-right: 12px;
          font-weight: 500;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.95);
          letter-spacing: 0.2px;
        }

        #mini-player-controls {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .mini-player-btn {
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #fff;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mini-player-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }

        .mini-player-btn.close {
          background: rgba(220, 38, 38, 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .mini-player-btn.close:hover {
          background: rgba(239, 68, 68, 1);
          transform: scale(1.05);
        }

        #mini-player-video {
          flex: 1;
          position: relative;
          background: #000;
          overflow: hidden;
        }

        #mini-player-video iframe,
        #mini-player-video video {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }

        /* Position the window in bottom-right corner using CSS */
        @media (display-mode: picture-in-picture) {
          /* Styles when in PiP mode */
        }
      `;
      pipWindow.document.head.appendChild(miniPlayerStyles);

      // Create mini-player UI structure
      const container = pipWindow.document.createElement('div');
      container.id = 'mini-player-container';

      const header = pipWindow.document.createElement('div');
      header.id = 'mini-player-header';

      const title = pipWindow.document.createElement('div');
      title.id = 'mini-player-title';
      title.textContent = videoInfo?.title || 'Playing Video';

      const controls = pipWindow.document.createElement('div');
      controls.id = 'mini-player-controls';

      // Return to page button
      const returnBtn = pipWindow.document.createElement('button');
      returnBtn.className = 'mini-player-btn';
      returnBtn.innerHTML = '↩';
      returnBtn.title = 'Return to page';
      returnBtn.onclick = () => {
        // Navigate back to the watch page in the main window
        if (videoInfo?.url) {
          window.location.href = videoInfo.url;
          closeMiniPlayer();
        }
      };

      // Close button
      const closeBtn = pipWindow.document.createElement('button');
      closeBtn.className = 'mini-player-btn close';
      closeBtn.innerHTML = '✕';
      closeBtn.title = 'Close mini-player';
      closeBtn.onclick = () => {
        closeMiniPlayer();
      };

      controls.appendChild(returnBtn);
      controls.appendChild(closeBtn);
      header.appendChild(title);
      header.appendChild(controls);

      const videoContainer = pipWindow.document.createElement('div');
      videoContainer.id = 'mini-player-video';

      // Move the player element to the PiP window
      videoContainer.appendChild(playerElement);

      container.appendChild(header);
      container.appendChild(videoContainer);
      pipWindow.document.body.appendChild(container);

      // Handle PiP window closure
      pipWindow.addEventListener('pagehide', () => {
        handlePipClose();
      });

      // Handle unload (when main window is closed)
      pipWindow.addEventListener('unload', () => {
        handlePipClose();
      });

      setIsActive(true);
      setVideoData(videoInfo);

      console.log('✅ Document PiP mini-player opened successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to open Document PiP mini-player:', error);
      return false;
    }
  };

  // Implementation 2: Video Element Picture-in-Picture (Firefox, older Chrome/Edge)
  const openVideoPiP = async (playerElement, container, videoInfo) => {
    try {
      // Find video element within the iframe or direct video element
      let videoElement = null;

      if (playerElement.tagName === 'VIDEO') {
        videoElement = playerElement;
      } else if (playerElement.tagName === 'IFRAME') {
        // For iframe players, we can't access the video element due to CORS
        // So we'll fall back to the floating player
        console.log('📺 Cannot use video PiP with iframe, falling back to floating player');
        return await openFloatingPlayer(playerElement, container, videoInfo);
      }

      if (!videoElement) {
        console.log('No video element found, falling back to floating player');
        return await openFloatingPlayer(playerElement, container, videoInfo);
      }

      // Request Picture-in-Picture
      await videoElement.requestPictureInPicture();

      videoElementRef.current = videoElement;

      // Handle video PiP events
      videoElement.addEventListener('leavepictureinpicture', handleVideoPipClose);

      setIsActive(true);
      setVideoData(videoInfo);

      console.log('✅ Video PiP mini-player opened successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to open video PiP, falling back to floating player:', error);
      // Fall back to floating player if video PiP fails
      return await openFloatingPlayer(playerElement, container, videoInfo);
    }
  };

  // Implementation 3: Floating In-Page Mini-Player (Safari, fallback for all)
  const openFloatingPlayer = async (playerElement, container, videoInfo) => {
    try {
      // Create floating mini-player container with glassmorphic design
      const floatingContainer = document.createElement('div');
      floatingContainer.className = 'floating-mini-player';
      floatingContainer.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        width: 400px;
        height: auto;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      `;

      // Create header with glassmorphic effect
      const header = document.createElement('div');
      header.style.cssText = `
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        padding: 10px 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #fff;
        font-size: 13px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        cursor: move;
        user-select: none;
      `;

      const title = document.createElement('div');
      title.textContent = videoInfo?.title || 'Playing Video';
      title.style.cssText = `
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-right: 12px;
        font-weight: 500;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.95);
        letter-spacing: 0.2px;
      `;

      const controls = document.createElement('div');
      controls.style.cssText = `
        display: flex;
        gap: 6px;
        align-items: center;
      `;

      // Return button with glassmorphic styling
      const returnBtn = document.createElement('button');
      returnBtn.innerHTML = '↩';
      returnBtn.title = 'Return to page';
      returnBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.12);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #fff;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      returnBtn.onmouseover = () => {
        returnBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        returnBtn.style.transform = 'scale(1.05)';
      };
      returnBtn.onmouseout = () => {
        returnBtn.style.background = 'rgba(255, 255, 255, 0.12)';
        returnBtn.style.transform = 'scale(1)';
      };
      returnBtn.onclick = () => {
        if (videoInfo?.url) {
          const hashPath = videoInfo.url.split('#')[1];
          if (hashPath) {
            route('/' + hashPath);
          }
        }
        closeMiniPlayer();
      };

      // Close button with red glassmorphic styling
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '✕';
      closeBtn.title = 'Close mini-player';
      closeBtn.style.cssText = `
        background: rgba(220, 38, 38, 0.9);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #fff;
        padding: 6px 10px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      closeBtn.onmouseover = () => {
        closeBtn.style.background = 'rgba(239, 68, 68, 1)';
        closeBtn.style.transform = 'scale(1.05)';
      };
      closeBtn.onmouseout = () => {
        closeBtn.style.background = 'rgba(220, 38, 38, 0.9)';
        closeBtn.style.transform = 'scale(1)';
      };
      closeBtn.onclick = () => closeMiniPlayer();

      controls.appendChild(returnBtn);
      controls.appendChild(closeBtn);
      header.appendChild(title);
      header.appendChild(controls);

      // Create video container with aspect ratio preservation
      const videoContainer = document.createElement('div');
      videoContainer.style.cssText = `
        position: relative;
        background: #000;
        overflow: hidden;
        aspect-ratio: 16 / 9;
        width: 100%;
      `;

      // IMPORTANT: Move the actual player element (don't clone) to preserve playback state
      playerElement.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: none;
      `;

      videoContainer.appendChild(playerElement);

      // iOS Optimization: Ensure iframe has correct attributes for playback
      if (isIOS() && playerElement.tagName === 'IFRAME') {
        // Force allow attributes to ensure playback continues
        const currentAllow = playerElement.getAttribute('allow') || '';
        if (!currentAllow.includes('autoplay')) {
          playerElement.setAttribute('allow', `${currentAllow}; autoplay; fullscreen; picture-in-picture`);
        }

        // If we have progress data, we might want to try to seek (though this depends on the player implementation)
        // For now, we rely on the player's internal state or the URL params if we were to reload it
      }

      floatingContainer.appendChild(header);
      floatingContainer.appendChild(videoContainer);

      // Make draggable with smooth interaction
      let isDragging = false;
      let currentX;
      let currentY;
      let initialX;
      let initialY;

      const dragStart = (e) => {
        isDragging = true;
        initialX = e.clientX - floatingContainer.offsetLeft;
        initialY = e.clientY - floatingContainer.offsetTop;
        floatingContainer.style.transition = 'none';
        header.style.cursor = 'grabbing';
      };

      const dragMove = (e) => {
        if (isDragging) {
          e.preventDefault();
          currentX = e.clientX - initialX;
          currentY = e.clientY - initialY;

          // Keep within viewport bounds
          const maxX = window.innerWidth - floatingContainer.offsetWidth;
          const maxY = window.innerHeight - floatingContainer.offsetHeight;

          currentX = Math.max(0, Math.min(currentX, maxX));
          currentY = Math.max(0, Math.min(currentY, maxY));

          floatingContainer.style.left = currentX + 'px';
          floatingContainer.style.top = currentY + 'px';
          floatingContainer.style.right = 'auto';
          floatingContainer.style.bottom = 'auto';
        }
      };

      const dragEnd = () => {
        isDragging = false;
        floatingContainer.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        header.style.cursor = 'move';
      };

      header.addEventListener('mousedown', dragStart);
      document.addEventListener('mousemove', dragMove);
      document.addEventListener('mouseup', dragEnd);

      // Add resize handle for better UX
      const resizeHandle = document.createElement('div');
      resizeHandle.style.cssText = `
        position: absolute;
        bottom: 0;
        right: 0;
        width: 20px;
        height: 20px;
        cursor: nwse-resize;
        background: linear-gradient(135deg, transparent 0%, transparent 50%, rgba(255, 255, 255, 0.2) 50%);
        border-bottom-right-radius: 12px;
      `;

      let isResizing = false;
      let startWidth, startHeight, startX, startY;

      resizeHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        isResizing = true;
        startWidth = floatingContainer.offsetWidth;
        startHeight = floatingContainer.offsetHeight;
        startX = e.clientX;
        startY = e.clientY;
        floatingContainer.style.transition = 'none';
      });

      document.addEventListener('mousemove', (e) => {
        if (isResizing) {
          const deltaX = e.clientX - startX;
          const deltaY = e.clientY - startY;

          // Maintain 16:9 aspect ratio, use width change as primary
          const newWidth = Math.max(300, Math.min(800, startWidth + deltaX));

          floatingContainer.style.width = newWidth + 'px';
          // Height is auto-calculated by aspect-ratio CSS
        }
      });

      document.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          floatingContainer.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        }
      });

      floatingContainer.appendChild(resizeHandle);

      // Add to page with animation
      floatingContainer.style.opacity = '0';
      floatingContainer.style.transform = 'scale(0.9) translateY(20px)';
      document.body.appendChild(floatingContainer);
      floatingPlayerRef.current = floatingContainer;

      // Trigger animation
      requestAnimationFrame(() => {
        floatingContainer.style.opacity = '1';
        floatingContainer.style.transform = 'scale(1) translateY(0)';
      });

      // Hide the original container (not the player)
      if (container) {
        container.style.opacity = '0';
        container.style.pointerEvents = 'none';
      }

      // Store cleanup functions
      floatingPlayerRef.current._cleanup = () => {
        header.removeEventListener('mousedown', dragStart);
        document.removeEventListener('mousemove', dragMove);
        document.removeEventListener('mouseup', dragEnd);
      };

      setIsActive(true);
      setVideoData(videoInfo);

      console.log('✅ Floating mini-player opened successfully with playback preserved');
      return true;
    } catch (error) {
      console.error('❌ Failed to open floating mini-player:', error);
      return false;
    }
  };

  // Handle video PiP close
  const handleVideoPipClose = () => {
    if (videoElementRef.current) {
      videoElementRef.current.removeEventListener('leavepictureinpicture', handleVideoPipClose);
      videoElementRef.current = null;
    }
    handlePipClose();
  };

  // Close the mini-player and return video to main page
  const closeMiniPlayer = () => {
    try {
      // Close based on fallback mode
      if (fallbackMode === 'document-pip') {
        if (pipWindowRef.current && !pipWindowRef.current.closed) {
          // Return the player element to the original container if it exists
          if (playerElementRef.current && originalContainerRef.current) {
            // Check if original container still exists in DOM
            if (document.body.contains(originalContainerRef.current)) {
              // Reset player element styles
              playerElementRef.current.style.cssText = '';
              originalContainerRef.current.appendChild(playerElementRef.current);
            }
          }
          pipWindowRef.current.close();
        }
      } else if (fallbackMode === 'video-pip') {
        if (videoElementRef.current && document.pictureInPictureElement) {
          document.exitPictureInPicture().catch(err => {
            console.error('Error exiting video PiP:', err);
          });
        }
      } else if (fallbackMode === 'floating') {
        // Clean up event listeners
        if (floatingPlayerRef.current && floatingPlayerRef.current._cleanup) {
          floatingPlayerRef.current._cleanup();
        }

        // Return the player to the original container BEFORE removing the floating player
        if (playerElementRef.current && originalContainerRef.current) {
          if (document.body.contains(originalContainerRef.current)) {
            // Reset player styles to original
            playerElementRef.current.style.cssText = `
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              border: none;
            `;
            originalContainerRef.current.appendChild(playerElementRef.current);
          }
        }

        // Remove the floating player with animation
        if (floatingPlayerRef.current) {
          floatingPlayerRef.current.style.opacity = '0';
          floatingPlayerRef.current.style.transform = 'scale(0.9) translateY(20px)';

          setTimeout(() => {
            if (floatingPlayerRef.current) {
              floatingPlayerRef.current.remove();
              floatingPlayerRef.current = null;
            }
          }, 300);
        }

        // Restore original container visibility
        if (originalContainerRef.current) {
          originalContainerRef.current.style.opacity = '1';
          originalContainerRef.current.style.pointerEvents = 'auto';
        }
      }
    } catch (error) {
      console.error('Error closing mini-player:', error);
    }

    handlePipClose();
  };

  // Handle cleanup when PiP window is closed
  const handlePipClose = () => {
    pipWindowRef.current = null;
    playerElementRef.current = null;
    videoElementRef.current = null;
    originalContainerRef.current = null;
    if (floatingPlayerRef.current) {
      floatingPlayerRef.current.remove();
      floatingPlayerRef.current = null;
    }
    setIsActive(false);
    setVideoData(null);
    setFallbackMode(null);
    console.log('Mini-player closed');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closeMiniPlayer();
    };
  }, []);

  const value = {
    isActive,
    isSupported: isSupported(),
    fallbackMode: fallbackMode || detectSupportMode(),
    openMiniPlayer,
    closeMiniPlayer,
    videoData,
  };

  return (
    <MiniPlayerContext.Provider value={value}>
      {children}
    </MiniPlayerContext.Provider>
  );
};

