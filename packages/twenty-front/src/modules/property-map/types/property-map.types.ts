/**
 * Frontend types for the property map module
 */

export type ListingStatus = 'on_market' | 'off_market' | 'pre_market' | 'sold' | 'withdrawn';

export type PropertyType = 'house' | 'apartment' | 'townhouse' | 'land' | 'villa' | 'other';

export type PropertyAttributes = {
  bedrooms?: number;
  bathrooms?: number;
  carSpaces?: number;
  propertyType?: PropertyType;
  features?: string[];
};

/**
 * Property type for frontend consumption (from GraphQL API)
 */
export type Property = {
  id: string;
  addressDisplay: string;
  addressStreet?: string | null;
  addressSuburb?: string | null;
  addressState?: string | null;
  addressPostcode?: string | null;
  addressCountry?: string | null;
  latitude: number;
  longitude: number;
  listingStatus: ListingStatus;
  listingAgentId?: string | null;
  listingAgentName?: string | null;
  listingAgentPhone?: string | null;
  listingAgentEmail?: string | null;
  askingPrice?: number | null;
  soldPrice?: number | null;
  landSize?: number | null;
  buildingSize?: number | null;
  floorArea?: number | null;
  photos?: string[] | null;
  description?: string | null;
  attributes?: PropertyAttributes | null;
  sourceUrl?: string | null;
  sourceId?: string | null;
  listedDate?: string | null;
  soldDate?: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Bounding box for map viewport queries
 */
export type BoundingBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

/**
 * GeoJSON Feature for property clustering
 */
export type PropertyGeoJSONFeature = {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    id: string;
    address: string;
    price?: number;
    bedrooms?: number;
    bathrooms?: number;
    status: ListingStatus;
    photo?: string;
  };
};

/**
 * GeoJSON FeatureCollection for properties
 */
export type PropertyGeoJSONCollection = {
  type: 'FeatureCollection';
  features: PropertyGeoJSONFeature[];
};
