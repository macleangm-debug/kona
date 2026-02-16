import React, { useState, useRef, useEffect } from "react";
import { SeriesCard } from "./SeriesCard";

/**
 * Skeleton placeholder for series cards - Netflix-style shimmer effect
 */
const SeriesCardSkeleton = () => (
  <div className="animate-pulse" data-testid="series-card-skeleton">
    {/* Thumbnail skeleton */}
    <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-2 bg-white/5">
      {/* Shimmer overlay */}
      <div className="absolute inset-0 skeleton-shimmer" />
      
      {/* Badge placeholder */}
      <div className="absolute top-2 left-2 w-10 h-4 rounded bg-white/10" />
      
      {/* Episode count placeholder */}
      <div className="absolute top-2 right-2 w-8 h-4 rounded bg-white/10" />
      
      {/* Rating placeholder */}
      <div className="absolute bottom-2 right-2 w-10 h-3 rounded bg-white/10" />
    </div>
    
    {/* Title skeleton */}
    <div className="h-4 bg-white/10 rounded w-3/4 mb-1.5" />
    
    {/* Genre skeleton */}
    <div className="h-3 bg-white/10 rounded w-1/2" />
  </div>
);

/**
 * LazySeriesCard - Loads series card only when it enters the viewport
 * Uses Intersection Observer for Netflix-style lazy loading
 */
export const LazySeriesCard = ({ 
  series, 
  onClick, 
  badge, 
  showViews = true, 
  inMyList = false, 
  onAddToList, 
  onRemoveFromList,
  rootMargin = "100px", // Pre-load when 100px away from viewport
  threshold = 0.1
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once visible, stop observing
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  // Preload the image once visible
  useEffect(() => {
    if (isVisible && series?.thumbnail) {
      const img = new Image();
      img.onload = () => setIsLoaded(true);
      img.onerror = () => setIsLoaded(true); // Show card even if image fails
      img.src = series.thumbnail;
    }
  }, [isVisible, series?.thumbnail]);

  return (
    <div ref={cardRef} className="lazy-card-wrapper">
      {!isVisible || !isLoaded ? (
        <SeriesCardSkeleton />
      ) : (
        <div 
          className="animate-fade-in"
          style={{
            animation: 'fadeInScale 0.3s ease-out forwards'
          }}
        >
          <SeriesCard
            series={series}
            onClick={onClick}
            badge={badge}
            showViews={showViews}
            inMyList={inMyList}
            onAddToList={onAddToList}
            onRemoveFromList={onRemoveFromList}
          />
        </div>
      )}
    </div>
  );
};

/**
 * LazyCarouselRow - A complete carousel row with lazy loading
 * Optimized for horizontal scrolling
 */
export const LazyCarouselRow = ({
  title,
  emoji,
  series,
  onSeeAll,
  getBadge,
  myList = [],
  onAddToList,
  onRemoveFromList,
  testId
}) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 6 });
  const scrollRef = useRef(null);

  // Track scroll position to determine which cards to render
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const cardWidth = 120; // Approximate card width + gap
      const viewportWidth = container.clientWidth;
      
      const start = Math.max(0, Math.floor(scrollLeft / cardWidth) - 2);
      const end = Math.min(
        series.length,
        Math.ceil((scrollLeft + viewportWidth) / cardWidth) + 3
      );
      
      setVisibleRange({ start, end });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => container.removeEventListener('scroll', handleScroll);
  }, [series.length]);

  if (!series || series.length === 0) return null;

  return (
    <div className="mb-6" data-testid={testId}>
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="font-heading text-sm font-semibold">
          {title} {emoji}
        </h2>
        {onSeeAll && (
          <button 
            onClick={onSeeAll}
            className="text-xs text-primary"
          >
            See All
          </button>
        )}
      </div>
      <div 
        ref={scrollRef}
        className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2"
      >
        {series.map((s, index) => (
          <div key={s.id} className="flex-shrink-0 w-28">
            <LazySeriesCard
              series={s}
              badge={getBadge ? getBadge(s, index) : null}
              onClick={() => s.onClick?.() || null}
              showViews={false}
              inMyList={myList.includes(s.id)}
              onAddToList={onAddToList}
              onRemoveFromList={onRemoveFromList}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LazySeriesCard;
