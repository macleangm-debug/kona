// Offline Downloads Manager - Service Worker Registration & IndexedDB
const DB_NAME = 'kona-offline-db';
const DB_VERSION = 1;
const STORE_NAME = 'downloads';
const CACHE_NAME = 'kona-offline-cache-v1';

// IndexedDB Helper
class OfflineDB {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('episodeId', 'episodeId', { unique: false });
          store.createIndex('seriesId', 'seriesId', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }
      };
    });
  }

  async addDownload(download) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(download);
      
      request.onsuccess = () => resolve(download);
      request.onerror = () => reject(request.error);
    });
  }

  async getDownload(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getDownloadByEpisodeId(episodeId) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('episodeId');
      const request = index.get(episodeId);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllDownloads() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async updateDownloadProgress(id, progress, status = 'downloading') {
    const download = await this.getDownload(id);
    if (download) {
      download.progress = progress;
      download.status = status;
      download.updatedAt = new Date().toISOString();
      return this.addDownload(download);
    }
    return null;
  }

  async deleteDownload(id) {
    await this.init();
    
    // Also delete from cache
    try {
      const download = await this.getDownload(id);
      if (download?.cacheKey) {
        const cache = await caches.open(CACHE_NAME);
        await cache.delete(download.cacheKey);
      }
    } catch (e) {
      console.warn('Failed to delete from cache:', e);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll() {
    await this.init();
    
    // Clear cache too
    try {
      await caches.delete(CACHE_NAME);
    } catch (e) {
      console.warn('Failed to clear cache:', e);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async getStorageUsage() {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        usageInMB: Math.round((estimate.usage || 0) / (1024 * 1024)),
        quotaInMB: Math.round((estimate.quota || 0) / (1024 * 1024))
      };
    }
    return { usage: 0, quota: 0, usageInMB: 0, quotaInMB: 0 };
  }
}

// Download Manager
class DownloadManager {
  constructor() {
    this.db = new OfflineDB();
    this.activeDownloads = new Map();
  }

  async init() {
    await this.db.init();
    
    // Register service worker if supported
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration.scope);
      } catch (e) {
        console.warn('Service Worker registration failed:', e);
      }
    }
  }

  async startDownload(episodeData, encryptionKey, onProgress) {
    const downloadId = `dl-${episodeData.episodeId}-${Date.now()}`;
    
    // Check if already downloaded
    const existing = await this.db.getDownloadByEpisodeId(episodeData.episodeId);
    if (existing && existing.status === 'complete') {
      throw new Error('Episode already downloaded');
    }

    const download = {
      id: downloadId,
      episodeId: episodeData.episodeId,
      episodeTitle: episodeData.episodeTitle,
      seriesId: episodeData.seriesId,
      seriesTitle: episodeData.seriesTitle,
      thumbnail: episodeData.thumbnail,
      videoUrl: episodeData.videoUrl,
      encryptionKey: encryptionKey,
      status: 'downloading',
      progress: 0,
      size: 0,
      downloadedSize: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: episodeData.expiresAt,
      cacheKey: `/offline-video/${downloadId}`
    };

    await this.db.addDownload(download);

    // Start actual download
    try {
      const response = await fetch(episodeData.videoUrl);
      if (!response.ok) throw new Error('Download failed');

      const contentLength = response.headers.get('content-length');
      const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
      download.size = totalSize;

      const reader = response.body.getReader();
      const chunks = [];
      let downloadedSize = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        downloadedSize += value.length;
        const progress = totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0;

        download.progress = progress;
        download.downloadedSize = downloadedSize;
        await this.db.addDownload(download);

        if (onProgress) onProgress(progress, downloadedSize, totalSize);
      }

      // Combine chunks and store in cache
      const blob = new Blob(chunks, { type: 'video/mp4' });
      const cache = await caches.open(CACHE_NAME);
      await cache.put(download.cacheKey, new Response(blob, {
        headers: { 'Content-Type': 'video/mp4' }
      }));

      // Mark as complete
      download.status = 'complete';
      download.progress = 100;
      download.downloadedSize = downloadedSize;
      await this.db.addDownload(download);

      return download;
    } catch (error) {
      download.status = 'failed';
      download.error = error.message;
      await this.db.addDownload(download);
      throw error;
    }
  }

  async cancelDownload(downloadId) {
    const controller = this.activeDownloads.get(downloadId);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(downloadId);
    }
    await this.db.deleteDownload(downloadId);
  }

  async getOfflineVideoUrl(downloadId) {
    const download = await this.db.getDownload(downloadId);
    if (!download || download.status !== 'complete') {
      throw new Error('Download not available');
    }

    // Check expiry
    if (download.expiresAt && new Date(download.expiresAt) < new Date()) {
      await this.db.deleteDownload(downloadId);
      throw new Error('Download has expired');
    }

    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(download.cacheKey);
    if (!response) {
      throw new Error('Video not found in cache');
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  async getAllDownloads() {
    return this.db.getAllDownloads();
  }

  async deleteDownload(downloadId) {
    return this.db.deleteDownload(downloadId);
  }

  async getStorageInfo() {
    return this.db.getStorageUsage();
  }

  async isOfflineAvailable(episodeId) {
    const download = await this.db.getDownloadByEpisodeId(episodeId);
    return download && download.status === 'complete' && 
           (!download.expiresAt || new Date(download.expiresAt) > new Date());
  }
}

// Singleton instance
export const offlineManager = new DownloadManager();
export const offlineDB = new OfflineDB();
export default offlineManager;
