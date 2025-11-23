/**
 * Intelligent Caching Layer
 * 
 * Implements RFC-specified caching strategy:
 * - Hash-based caching by provider, model, prompt, context
 * - Append-only per key for natural variety
 * - LRU eviction with configurable limits
 */

interface CacheEntry {
  value: string;
  timestamp: number;
  hits: number;
}

interface CacheKey {
  provider: string;
  model: string;
  prompt: string;
  contextHash: string;
}

class Cache {
  private store = new Map<string, CacheEntry[]>();
  private maxEntries = 1000; // Max unique keys
  private maxValuesPerKey = 10; // Max cached values per key
  private accessOrder: string[] = []; // For LRU

  /**
   * Generate cache key from prompt and context
   */
  private generateKey(provider: string, model: string, prompt: string, context?: Record<string, any>): string {
    const contextHash = context ? this.hashContext(context) : 'no-context';
    return `${provider}:${model}:${this.hashString(prompt)}:${contextHash}`;
  }

  /**
   * Hash context object for cache key
   */
  private hashContext(context: Record<string, any>): string {
    const sorted = Object.keys(context).sort().map(k => `${k}:${context[k]}`).join('|');
    return this.hashString(sorted);
  }

  /**
   * Simple string hash
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached value (random sample from cache for variety)
   */
  get(provider: string, model: string, prompt: string, context?: Record<string, any>): string | null {
    const key = this.generateKey(provider, model, prompt, context);
    const entries = this.store.get(key);

    if (!entries || entries.length === 0) {
      return null;
    }

    // Update access order for LRU
    this.updateAccessOrder(key);

    // Random sample for natural variety (RFC: append-only per key)
    const randomIndex = Math.floor(Math.random() * entries.length);
    const entry = entries[randomIndex];
    entry.hits++;
    return entry.value;
  }

  /**
   * Set cached value (append-only for variety)
   */
  set(provider: string, model: string, prompt: string, value: string, context?: Record<string, any>): void {
    const key = this.generateKey(provider, model, prompt, context);
    
    // Evict if too many keys
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      this.evictLRU();
    }

    const entries = this.store.get(key) || [];
    
    // Append-only: add new value, limit per key
    entries.push({
      value,
      timestamp: Date.now(),
      hits: 0,
    });

    // Keep only most recent N values per key
    if (entries.length > this.maxValuesPerKey) {
      entries.shift(); // Remove oldest
    }

    this.store.set(key, entries);
    this.updateAccessOrder(key);
  }

  /**
   * Update LRU access order
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;
    const lruKey = this.accessOrder.shift()!;
    this.store.delete(lruKey);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.store.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let totalEntries = 0;
    let totalHits = 0;
    
    for (const entries of this.store.values()) {
      totalEntries += entries.length;
      totalHits += entries.reduce((sum, e) => sum + e.hits, 0);
    }

    return {
      keys: this.store.size,
      totalEntries,
      totalHits,
      hitRate: totalHits > 0 ? (totalHits / (totalHits + this.store.size)) * 100 : 0,
    };
  }

  /**
   * Configure cache limits
   */
  configure(maxEntries?: number, maxValuesPerKey?: number) {
    if (maxEntries !== undefined) this.maxEntries = maxEntries;
    if (maxValuesPerKey !== undefined) this.maxValuesPerKey = maxValuesPerKey;
  }
}

// Global cache instance
export const cache = new Cache();

/**
 * Clear cache (exported for convenience)
 */
export function clearCache() {
  cache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return cache.getStats();
}

