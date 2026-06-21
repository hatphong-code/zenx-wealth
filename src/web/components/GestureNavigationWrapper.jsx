import { useSwipeNavigation } from '../hooks/useSwipeNavigation';

export default function GestureNavigationWrapper({ children }) {
  const { handleTouchStart, handleTouchEnd, swipeDirection, isOnHub } = useSwipeNavigation();

  if (!isOnHub) {
    return <>{children}</>;
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`transition-opacity duration-300 w-full ${
        swipeDirection ? 'opacity-75' : 'opacity-100'
      }`}
      style={{
        touchAction: 'manipulation',
        transform:
          swipeDirection === 'left'
            ? 'translateX(-8px)'
            : swipeDirection === 'right'
            ? 'translateX(8px)'
            : 'translateX(0)',
        transition: 'transform 150ms ease-out, opacity 300ms ease-out',
        userSelect: 'none',
      }}
    >
      {children}
    </div>
  );
}
