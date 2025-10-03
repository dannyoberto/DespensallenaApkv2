import { PreloadResource } from '@/services/ResourcePreloader';

/**
 * Critical Resources Configuration for Despensa Llena
 * These resources are preloaded to improve performance
 */

// Core website resources
export const CORE_RESOURCES: PreloadResource[] = [
  {
    url: 'https://despensallena.com/favicon.ico',
    type: 'image',
    priority: 'critical',
  },
  {
    url: 'https://despensallena.com/assets/css/main.css',
    type: 'css',
    priority: 'critical',
  },
  {
    url: 'https://despensallena.com/assets/js/main.js',
    type: 'js',
    priority: 'critical',
  },
];

// High priority resources
export const HIGH_PRIORITY_RESOURCES: PreloadResource[] = [
  {
    url: 'https://despensallena.com/assets/images/logo.png',
    type: 'image',
    priority: 'high',
  },
  {
    url: 'https://despensallena.com/assets/images/hero-bg.jpg',
    type: 'image',
    priority: 'high',
  },
  {
    url: 'https://despensallena.com/assets/css/components.css',
    type: 'css',
    priority: 'high',
  },
  {
    url: 'https://despensallena.com/assets/js/components.js',
    type: 'js',
    priority: 'high',
  },
];

// Medium priority resources
export const MEDIUM_PRIORITY_RESOURCES: PreloadResource[] = [
  {
    url: 'https://despensallena.com/assets/images/products/',
    type: 'image',
    priority: 'medium',
  },
  {
    url: 'https://despensallena.com/assets/css/responsive.css',
    type: 'css',
    priority: 'medium',
  },
  {
    url: 'https://despensallena.com/assets/js/analytics.js',
    type: 'js',
    priority: 'medium',
  },
];

// Low priority resources (lazy loaded)
export const LOW_PRIORITY_RESOURCES: PreloadResource[] = [
  {
    url: 'https://despensallena.com/assets/images/gallery/',
    type: 'image',
    priority: 'low',
  },
  {
    url: 'https://despensallena.com/assets/css/animations.css',
    type: 'css',
    priority: 'low',
  },
  {
    url: 'https://despensallena.com/assets/js/animations.js',
    type: 'js',
    priority: 'low',
  },
];

// All resources combined
export const ALL_CRITICAL_RESOURCES: PreloadResource[] = [
  ...CORE_RESOURCES,
  ...HIGH_PRIORITY_RESOURCES,
  ...MEDIUM_PRIORITY_RESOURCES,
  ...LOW_PRIORITY_RESOURCES,
];

// Resources by priority
export const RESOURCES_BY_PRIORITY = {
  critical: CORE_RESOURCES,
  high: HIGH_PRIORITY_RESOURCES,
  medium: MEDIUM_PRIORITY_RESOURCES,
  low: LOW_PRIORITY_RESOURCES,
};

// Resource categories
export const RESOURCE_CATEGORIES = {
  core: CORE_RESOURCES,
  high: HIGH_PRIORITY_RESOURCES,
  medium: MEDIUM_PRIORITY_RESOURCES,
  low: LOW_PRIORITY_RESOURCES,
  all: ALL_CRITICAL_RESOURCES,
} as const;

// Preload strategies
export const PRELOAD_STRATEGIES = {
  // Preload only critical resources
  CRITICAL_ONLY: CORE_RESOURCES,
  
  // Preload critical + high priority
  ESSENTIAL: [...CORE_RESOURCES, ...HIGH_PRIORITY_RESOURCES],
  
  // Preload critical + high + medium
  BALANCED: [...CORE_RESOURCES, ...HIGH_PRIORITY_RESOURCES, ...MEDIUM_PRIORITY_RESOURCES],
  
  // Preload all resources
  AGGRESSIVE: ALL_CRITICAL_RESOURCES,
} as const;

// Network-aware resource selection
export const getResourcesForNetworkSpeed = (speedKbps: number): PreloadResource[] => {
  if (speedKbps < 100) {
    // Slow connection - only critical resources
    return PRELOAD_STRATEGIES.CRITICAL_ONLY;
  } else if (speedKbps < 500) {
    // Medium connection - essential resources
    return PRELOAD_STRATEGIES.ESSENTIAL;
  } else if (speedKbps < 1000) {
    // Good connection - balanced resources
    return PRELOAD_STRATEGIES.BALANCED;
  } else {
    // Fast connection - aggressive preloading
    return PRELOAD_STRATEGIES.AGGRESSIVE;
  }
};

// Resource validation
export const validateResource = (resource: PreloadResource): boolean => {
  try {
    new URL(resource.url);
    return ['css', 'js', 'image', 'font', 'other'].includes(resource.type);
  } catch {
    return false;
  }
};

// Resource filtering
export const filterResourcesByType = (resources: PreloadResource[], type: PreloadResource['type']): PreloadResource[] => {
  return resources.filter(resource => resource.type === type);
};

export const filterResourcesByPriority = (resources: PreloadResource[], priority: PreloadResource['priority']): PreloadResource[] => {
  return resources.filter(resource => resource.priority === priority);
};
