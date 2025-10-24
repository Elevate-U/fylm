/**
 * iOS Utility Functions
 * Handles iOS-specific behaviors and optimizations
 */

/**
 * Detect if the user is on iOS
 */
export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Detect if the user is on Safari
 */
export function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/**
 * Get iOS version
 */
export function getIOSVersion() {
  if (!isIOS()) return null;
  
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
  if (!match) return null;
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: match[3] ? parseInt(match[3], 10) : 0
  };
}

/**
 * Fix viewport height for iOS Safari
 * Handles the dynamic address bar
 */
export function setIOSViewportHeight() {
  if (!isIOS()) return;
  
  const setHeight = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };
  
  setHeight();
  window.addEventListener('resize', setHeight);
  window.addEventListener('orientationchange', setHeight);
  
  return () => {
    window.removeEventListener('resize', setHeight);
    window.removeEventListener('orientationchange', setHeight);
  };
}

/**
 * Enable/disable iOS body scroll lock
 * Useful for modals and overlays
 */
export function setIOSBodyScrollLock(lock) {
  if (!isIOS()) return;
  
  if (lock) {
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
  }
}

/**
 * Optimize video playback for iOS
 */
export function optimizeVideoForIOS(videoElement) {
  if (!isIOS() || !videoElement) return;
  
  // Set required attributes for iOS
  videoElement.setAttribute('playsinline', '');
  videoElement.setAttribute('webkit-playsinline', '');
  videoElement.setAttribute('x-webkit-airplay', 'allow');
  videoElement.setAttribute('preload', 'metadata');
  
  // Handle autoplay restrictions
  const playPromise = videoElement.play();
  if (playPromise !== undefined) {
    playPromise.catch(error => {
      console.log('Autoplay prevented on iOS, user interaction required:', error);
      // Optionally show a play button overlay
    });
  }
}

/**
 * Prevent iOS zoom on input focus
 */
export function preventIOSInputZoom() {
  if (!isIOS()) return;
  
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    const currentFontSize = window.getComputedStyle(input).fontSize;
    const fontSize = parseFloat(currentFontSize);
    
    // iOS won't zoom if font-size is >= 16px
    if (fontSize < 16) {
      input.style.fontSize = '16px';
    }
  });
}

/**
 * Handle iOS safe area insets
 */
export function getIOSSafeAreaInsets() {
  if (!isIOS()) return { top: 0, right: 0, bottom: 0, left: 0 };
  
  const getInset = (side) => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(`env(safe-area-inset-${side})`);
    return parseInt(value, 10) || 0;
  };
  
  return {
    top: getInset('top'),
    right: getInset('right'),
    bottom: getInset('bottom'),
    left: getInset('left')
  };
}

/**
 * Optimize touch events for iOS
 */
export function optimizeIOSTouchEvents(element) {
  if (!isIOS() || !element) return;
  
  element.style.touchAction = 'manipulation';
  element.style.WebkitTapHighlightColor = 'transparent';
  element.style.WebkitTouchCallout = 'none';
  element.style.WebkitUserSelect = 'none';
}

/**
 * Handle iOS momentum scrolling
 */
export function enableIOSMomentumScroll(element) {
  if (!isIOS() || !element) return;
  
  // Use modern overscroll-behavior instead of deprecated -webkit-overflow-scrolling
  element.style.overscrollBehavior = 'contain';
  element.style.WebkitOverflowScrolling = 'touch'; // Fallback for older iOS
}

/**
 * Detect if in standalone mode (PWA)
 */
export function isIOSStandalone() {
  if (!isIOS()) return false;
  return window.navigator.standalone === true;
}

/**
 * Handle iOS fullscreen video
 */
export function handleIOSFullscreen(videoElement) {
  if (!isIOS() || !videoElement) return;
  
  // iOS has its own fullscreen implementation
  if (videoElement.webkitEnterFullscreen) {
    videoElement.webkitEnterFullscreen();
  } else if (videoElement.requestFullscreen) {
    videoElement.requestFullscreen();
  }
}

/**
 * Initialize all iOS optimizations
 */
export function initializeIOSOptimizations() {
  if (!isIOS()) return;
  
  console.log('🍎 Initializing iOS optimizations...');
  
  // Setup viewport height fix
  setIOSViewportHeight();
  
  // Prevent input zoom
  preventIOSInputZoom();
  
  // Optimize all buttons and links
  const interactiveElements = document.querySelectorAll('button, a, input, textarea');
  interactiveElements.forEach(element => {
    optimizeIOSTouchEvents(element);
  });
  
  // Optimize scrollable containers
  const scrollContainers = document.querySelectorAll('.scrolling-row, .movie-grid, .episode-list');
  scrollContainers.forEach(container => {
    enableIOSMomentumScroll(container);
  });
  
  // Optimize all videos
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    optimizeVideoForIOS(video);
  });
  
  console.log('✅ iOS optimizations complete');
}

export default {
  isIOS,
  isSafari,
  getIOSVersion,
  setIOSViewportHeight,
  setIOSBodyScrollLock,
  optimizeVideoForIOS,
  preventIOSInputZoom,
  getIOSSafeAreaInsets,
  optimizeIOSTouchEvents,
  enableIOSMomentumScroll,
  isIOSStandalone,
  handleIOSFullscreen,
  initializeIOSOptimizations
};






