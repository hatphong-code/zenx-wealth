import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const HUB_ROUTES = ['/', '/track', '/plan', '/review'];

export function useSwipeNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [swipeDirection, setSwipeDirection] = useState(null);

  const currentHubIndex = HUB_ROUTES.indexOf(location.pathname);

  const handleSwipe = useCallback(
    (direction) => {
      if (currentHubIndex === -1) return; // Not on a hub page

      let nextIndex = currentHubIndex;
      if (direction === 'left' && currentHubIndex < HUB_ROUTES.length - 1) {
        nextIndex = currentHubIndex + 1;
      } else if (direction === 'right' && currentHubIndex > 0) {
        nextIndex = currentHubIndex - 1;
      } else {
        return; // Can't swipe further
      }

      navigate(HUB_ROUTES[nextIndex]);
    },
    [currentHubIndex, navigate]
  );

  const handlePointerDown = useCallback((e) => {
    setSwipeDirection(null);
  }, []);

  const handlePointerMove = useCallback((e) => {
    // Will be handled by gesture detection
  }, []);

  const handlePointerUp = useCallback((e) => {
    // Will be handled by gesture detection
  }, []);

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    if (!touch) return;
    e.currentTarget._swipeStartX = touch.clientX;
    e.currentTarget._swipeStartTime = Date.now();
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      const touch = e.changedTouches[0];
      if (!touch || !e.currentTarget._swipeStartX) return;

      const deltaX = touch.clientX - e.currentTarget._swipeStartX;
      const deltaTime = Date.now() - e.currentTarget._swipeStartTime;
      const velocity = Math.abs(deltaX) / deltaTime;

      // Threshold: 50px minimum or 0.5px/ms velocity
      const minDistance = 50;
      const minVelocity = 0.5;

      if (Math.abs(deltaX) < minDistance && velocity < minVelocity) {
        return;
      }

      const direction = deltaX > 0 ? 'right' : 'left';
      setSwipeDirection(direction);
      handleSwipe(direction);

      // Clear state after animation
      setTimeout(() => setSwipeDirection(null), 300);

      // Clear stored values
      delete e.currentTarget._swipeStartX;
      delete e.currentTarget._swipeStartTime;
    },
    [handleSwipe]
  );

  return {
    handleTouchStart,
    handleTouchEnd,
    swipeDirection,
    isOnHub: currentHubIndex !== -1,
  };
}
