import React, { useState, useRef, useEffect } from "react";
import { SeriesCardDesktop } from "./SeriesCardDesktop";

/**
 * Skeleton placeholder for desktop series cards - Netflix-style shimmer effect
 */
const SeriesCardDesktopSkeleton = ({ size = "default" }) => {
  const sizeClasses = {
    small: "w-[140px]",
    default: "w-[180px] lg:w-[200px]",
    large: "w-[220px] lg:w-[260px]"
  };

  return (
    <div className={`animate-pulse flex-shrink-0 ${sizeClasses[size]}`} data-testid="series-card-skeleton">
      {/* Thumbnail skeleton */}
      <div className="relative aspect-[2/3] rounded-lg lg:rounded-xl overflow-hidden mb-2 bg-white/5">
        {/* Shimmer overlay */}
        <div className="absolute inset-0 skeleton-shimmer" />
        
        {/* Badge placeholder */}
        <div className="absolute top-2 left-2 w-12 h-5 rounded bg-white/10" />
        
        {/* Episode count placeholder */}
        <div className="absolute top-2 right-2 w-10 h-5 rounded bg-white/10" />
        
        {/* View count placeholder */}
        <div className="absolute bottom-2 left-2 w-12 h-4 rounded bg-white/10" />
        
        {/* Rating placeholder */}
        <div className="absolute bottom-2 right-2 w-10 h-4 rounded bg-white/10" />
      </div>
      
      {/* Title skeleton */}
      <div className="h-5 bg-white/10 rounded w-4/5 mb-1.5" />
      
      {/* Genre skeleton */}
      <div className="h-4 bg-white/10 rounded w-1/2" />
    </div>
  );
};

/**
 * LazySeriesCardDesktop - Loads desktop series card only when it enters the viewport
 * Uses Intersection Observer for Netflix-style lazy loading
 */
export const LazySeriesCardDesktop = ({ 
  series, 
  onClick, 
  badge, 
  inMyList = false, 
  onAddToList, 
  onRemoveFromList,
  size = "default",
  rootMargin = "200px", // Pre-load when 200px away (larger for desktop)
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
    <div ref={cardRef} className="lazy-card-wrapper-desktop">
      {!isVisible || !isLoaded ? (
        <SeriesCardDesktopSkeleton size={size} />
      ) : (
        <div 
          className="animate-card-reveal"
          style={{
            animation: 'fadeInScale 0.4s ease-out forwards'
          }}
        >
          <SeriesCardDesktop
            series={series}
            onClick={onClick}
            badge={badge}
            inMyList={inMyList}
            onAddToList={onAddToList}
            onRemoveFromList={onRemoveFromList}
            size={size}
          />
        </div>
      )}
    </div>
  );
};

export default LazySeriesCardDesktop;
