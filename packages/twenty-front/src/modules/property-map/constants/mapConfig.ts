/**
 * Map configuration constants for the property map module
 */

/**
 * Mapbox access token from environment variable
 * This should be set in your .env file as MAPBOX_ACCESS_TOKEN
 */
export const MAPBOX_ACCESS_TOKEN = import.meta.env.MAPBOX_ACCESS_TOKEN || '';

/**
 * Default Mapbox style URL
 * Using the Mapbox Streets v12 style
 */
export const DEFAULT_MAP_STYLE = 'mapbox://styles/mapbox/streets-v12';

/**
 * Default map center coordinates
 * Location: Sydney, Australia
 * Format: [latitude, longitude]
 */
export const DEFAULT_CENTER: [number, number] = [-33.8688, 151.2093];

/**
 * Default zoom level for the map
 * 11 provides a good city-level view
 */
export const DEFAULT_ZOOM = 11;

/**
 * Cluster radius in pixels
 * Points within this radius will be clustered together
 */
export const CLUSTER_RADIUS = 50;

/**
 * Maximum zoom level for clustering
 * At zoom levels higher than this, points will not be clustered
 */
export const CLUSTER_MAX_ZOOM = 14;

/**
 * Re-export MAPBOX_STYLE for backward compatibility with spec examples
 */
export const MAPBOX_STYLE = DEFAULT_MAP_STYLE;
