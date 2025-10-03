/**
 * Resource Preloader Service
 * Handles intelligent preloading of critical resources
 */

export interface PreloadResource {
  url: string;
  type: 'css' | 'js' | 'image' | 'font' | 'other';
  priority: 'critical' | 'high' | 'medium' | 'low';
  size?: number;
  lastModified?: string;
  cacheKey?: string;
}

export interface PreloadConfig {
  enabled: boolean;
  maxConcurrent: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  networkThreshold: number; // Minimum network speed in kbps
}

export interface PreloadResult {
  url: string;
  success: boolean;
  size: number;
  loadTime: number;
  error?: string;
  cached: boolean;
}

export class ResourcePreloader {
  private static instance: ResourcePreloader;
  private config: PreloadConfig;
  private preloadQueue: PreloadResource[] = [];
  private activePreloads: Map<string, Promise<PreloadResult>> = new Map();
  private preloadResults: Map<string, PreloadResult> = new Map();
  private isNetworkAvailable: boolean = true;
  private networkSpeed: number = 0;

  private constructor() {
    this.config = {
      enabled: true,
      maxConcurrent: 3,
      timeout: 10000,
      retryAttempts: 2,
      retryDelay: 1000,
      networkThreshold: 100, // 100 kbps minimum
    };
  }

  public static getInstance(): ResourcePreloader {
    if (!ResourcePreloader.instance) {
      ResourcePreloader.instance = new ResourcePreloader();
    }
    return ResourcePreloader.instance;
  }

  /**
   * Configure the preloader
   */
  public configure(config: Partial<PreloadConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set network status for intelligent preloading
   */
  public setNetworkStatus(isAvailable: boolean, speed: number = 0): void {
    this.isNetworkAvailable = isAvailable;
    this.networkSpeed = speed;
    
    if (!isAvailable) {
      this.pausePreloading();
    } else {
      this.resumePreloading();
    }
  }

  /**
   * Add resources to preload queue
   */
  public addResources(resources: PreloadResource[]): void {
    // Sort by priority
    const sortedResources = resources.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    this.preloadQueue.push(...sortedResources);
    this.processQueue();
  }

  /**
   * Preload a single resource
   */
  public async preloadResource(resource: PreloadResource): Promise<PreloadResult> {
    const cacheKey = this.generateCacheKey(resource.url);
    
    // Check if already cached
    if (this.preloadResults.has(cacheKey)) {
      const result = this.preloadResults.get(cacheKey)!;
      return { ...result, cached: true };
    }

    // Check if already preloading
    if (this.activePreloads.has(cacheKey)) {
      return this.activePreloads.get(cacheKey)!;
    }

    // Start preloading
    const preloadPromise = this.executePreload(resource);
    this.activePreloads.set(cacheKey, preloadPromise);

    try {
      const result = await preloadPromise;
      this.preloadResults.set(cacheKey, result);
      return result;
    } finally {
      this.activePreloads.delete(cacheKey);
    }
  }

  /**
   * Get preload statistics
   */
  public getStats(): {
    totalResources: number;
    successfulPreloads: number;
    failedPreloads: number;
    averageLoadTime: number;
    totalSize: number;
  } {
    const results = Array.from(this.preloadResults.values());
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    return {
      totalResources: results.length,
      successfulPreloads: successful.length,
      failedPreloads: failed.length,
      averageLoadTime: successful.length > 0 
        ? successful.reduce((sum, r) => sum + r.loadTime, 0) / successful.length 
        : 0,
      totalSize: successful.reduce((sum, r) => sum + r.size, 0),
    };
  }

  /**
   * Clear preload cache
   */
  public clearCache(): void {
    this.preloadResults.clear();
    this.activePreloads.clear();
    this.preloadQueue = [];
  }

  /**
   * Pause preloading
   */
  public pausePreloading(): void {
    this.config.enabled = false;
  }

  /**
   * Resume preloading
   */
  public resumePreloading(): void {
    this.config.enabled = true;
    this.processQueue();
  }

  /**
   * Process preload queue
   */
  private async processQueue(): Promise<void> {
    if (!this.config.enabled || !this.isNetworkAvailable) {
      return;
    }

    // Check network speed threshold
    if (this.networkSpeed > 0 && this.networkSpeed < this.config.networkThreshold) {
      console.log('Network speed too slow for preloading:', this.networkSpeed, 'kbps');
      return;
    }

    // Process up to maxConcurrent resources
    const availableSlots = this.config.maxConcurrent - this.activePreloads.size;
    const resourcesToProcess = this.preloadQueue.splice(0, availableSlots);

    for (const resource of resourcesToProcess) {
      this.preloadResource(resource).catch(error => {
        console.warn('Preload failed for:', resource.url, error);
      });
    }
  }

  /**
   * Execute actual preload
   */
  private async executePreload(resource: PreloadResource): Promise<PreloadResult> {
    const startTime = Date.now();
    
    try {
      // Create timeout manually for React Native compatibility
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(resource.url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'max-age=3600',
          'Accept': this.getAcceptHeader(resource.type),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.text();
      const size = new Blob([data]).size;
      const loadTime = Date.now() - startTime;

      console.log(`✅ Preloaded: ${resource.url} (${size} bytes, ${loadTime}ms)`);

      return {
        url: resource.url,
        success: true,
        size,
        loadTime,
        cached: false,
      };

    } catch (error) {
      const loadTime = Date.now() - startTime;
      console.warn(`❌ Preload failed: ${resource.url}`, error);

      return {
        url: resource.url,
        success: false,
        size: 0,
        loadTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        cached: false,
      };
    }
  }

  /**
   * Generate cache key for resource
   */
  private generateCacheKey(url: string): string {
    return url.replace(/[^a-zA-Z0-9]/g, '_');
  }

  /**
   * Get appropriate Accept header for resource type
   */
  private getAcceptHeader(type: PreloadResource['type']): string {
    switch (type) {
      case 'css':
        return 'text/css,*/*;q=0.1';
      case 'js':
        return 'application/javascript,*/*;q=0.1';
      case 'image':
        return 'image/*,*/*;q=0.1';
      case 'font':
        return 'font/*,*/*;q=0.1';
      default:
        return '*/*';
    }
  }
}
