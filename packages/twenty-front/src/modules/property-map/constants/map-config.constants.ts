// Mapbox configuration
// NOTE: This should be replaced with environment variable in production
export const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || '';

// Default Mapbox style
export const MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12';

// Default map viewport (Sydney, Australia)
export const DEFAULT_VIEWPORT = {
  latitude: -33.8688,
  longitude: 151.2093,
  zoom: 11,
};

// Clustering configuration
export const CLUSTER_MAX_ZOOM = 14;
export const CLUSTER_RADIUS = 50;
