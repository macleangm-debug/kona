import { Helmet } from 'react-helmet-async';

/**
 * SEO Component for dynamic page meta tags
 * Use this on every page for proper SEO
 */
const SEO = ({
  title = "Stream Kona | Watch African Mini-Series & Drama Online",
  description = "Africa's premier mini-series streaming platform. Watch exclusive romance, drama, thriller & action series. New episodes daily!",
  image = "https://www.streamkona.com/og-image.png",
  url = "https://www.streamkona.com",
  type = "website",
  keywords = "African series, mini series, streaming, drama series, romance series",
  author = "Stream Kona",
  publishedTime = null,
  modifiedTime = null,
  section = null,
  tags = [],
  noindex = false,
  breadcrumbs = null,
  videoData = null,
}) => {
  const siteName = "Stream Kona";
  const twitterHandle = "@streamkona";
  
  // Generate breadcrumb schema
  const breadcrumbSchema = breadcrumbs ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": crumb.url
    }))
  } : null;

  // Generate video schema if video data provided
  const videoSchema = videoData ? {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": videoData.title,
    "description": videoData.description,
    "thumbnailUrl": videoData.thumbnail,
    "uploadDate": videoData.uploadDate || new Date().toISOString(),
    "duration": videoData.duration ? `PT${videoData.duration}M` : "PT10M",
    "contentUrl": videoData.contentUrl,
    "embedUrl": videoData.embedUrl,
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": { "@type": "WatchAction" },
      "userInteractionCount": videoData.views || 0
    },
    "publisher": {
      "@type": "Organization",
      "name": "Stream Kona",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.streamkona.com/logo.png"
      }
    }
  } : null;
  
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large" />
      )}
      <link rel="canonical" href={url} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_US" />
      
      {/* Video specific OG tags */}
      {videoData && (
        <>
          <meta property="og:video" content={videoData.contentUrl} />
          <meta property="og:video:type" content="video/mp4" />
          <meta property="og:video:width" content="1280" />
          <meta property="og:video:height" content="720" />
        </>
      )}
      
      {/* Article specific (for blog/series pages) */}
      {type === "article" && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === "article" && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === "article" && section && (
        <meta property="article:section" content={section} />
      )}
      {type === "article" && tags.map((tag, index) => (
        <meta key={index} property="article:tag" content={tag} />
      ))}
      
      {/* Twitter */}
      <meta name="twitter:card" content={videoData ? "player" : "summary_large_image"} />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content={twitterHandle} />
      <meta name="twitter:creator" content={twitterHandle} />
      {videoData && (
        <>
          <meta name="twitter:player" content={videoData.embedUrl} />
          <meta name="twitter:player:width" content="1280" />
          <meta name="twitter:player:height" content="720" />
        </>
      )}

      {/* Structured Data - Breadcrumbs */}
      {breadcrumbSchema && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      )}

      {/* Structured Data - Video */}
      {videoSchema && (
        <script type="application/ld+json">
          {JSON.stringify(videoSchema)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;

/**
 * Generate structured data for a video/series
 */
export const generateSeriesSchema = (series) => {
  return {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    "name": series.title,
    "description": series.description,
    "genre": series.genre,
    "image": series.thumbnail,
    "url": `https://www.streamkona.com/series/${series.id}`,
    "numberOfEpisodes": series.total_episodes,
    "aggregateRating": series.rating ? {
      "@type": "AggregateRating",
      "ratingValue": series.rating,
      "bestRating": "5",
      "worstRating": "1",
      "ratingCount": series.views || 100
    } : undefined,
    "provider": {
      "@type": "Organization",
      "name": "Stream Kona",
      "url": "https://www.streamkona.com"
    }
  };
};

/**
 * Generate structured data for an episode
 */
export const generateEpisodeSchema = (episode, series) => {
  return {
    "@context": "https://schema.org",
    "@type": "TVEpisode",
    "name": episode.title,
    "description": episode.description || `Episode from ${series?.title}`,
    "episodeNumber": episode.episode_number,
    "duration": `PT${episode.duration || 10}M`,
    "image": episode.thumbnail || series?.thumbnail,
    "url": `https://www.streamkona.com/watch/${episode.id}`,
    "partOfSeries": {
      "@type": "TVSeries",
      "name": series?.title,
      "url": `https://www.streamkona.com/series/${series?.id}`
    }
  };
};
