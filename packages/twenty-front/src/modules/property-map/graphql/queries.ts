import { gql } from '@apollo/client';

/**
 * Fragment containing all property fields needed for map display
 */
export const PROPERTY_MAP_FRAGMENT = gql`
  fragment PropertyMapFields on Property {
    id
    workspaceId
    addressDisplay
    addressStreet
    addressSuburb
    addressState
    addressPostcode
    latitude
    longitude
    attributes
    listingStatus
    listingAgentId
    listingAgentName
    listingAgentPhone
    photos
    floorplanUrl
    estimatedValue
    askingPrice
    soldPrice
    soldDate
    landSize
    buildingSize
    yearBuilt
    notes
    createdAt
    updatedAt
  }
`;

/**
 * Query to fetch properties within a bounding box
 * Used for map viewport-based queries
 */
export const PROPERTIES_IN_BOUNDING_BOX = gql`
  ${PROPERTY_MAP_FRAGMENT}
  query PropertiesInBoundingBox(
    $minLat: Float!
    $minLng: Float!
    $maxLat: Float!
    $maxLng: Float!
    $filters: PropertyFiltersInput
    $limit: Int
  ) {
    propertiesInBoundingBox(
      minLat: $minLat
      minLng: $minLng
      maxLat: $maxLat
      maxLng: $maxLng
      filters: $filters
      limit: $limit
    ) {
      ...PropertyMapFields
    }
  }
`;

/**
 * Query to fetch properties within a radius from a center point
 * Used for "search near me" or radius-based searches
 */
export const PROPERTIES_WITHIN_RADIUS = gql`
  ${PROPERTY_MAP_FRAGMENT}
  query PropertiesWithinRadius(
    $latitude: Float!
    $longitude: Float!
    $radiusKm: Float!
    $filters: PropertyFiltersInput
    $limit: Int
  ) {
    propertiesWithinRadius(
      latitude: $latitude
      longitude: $longitude
      radiusKm: $radiusKm
      filters: $filters
      limit: $limit
    ) {
      ...PropertyMapFields
    }
  }
`;

/**
 * Query to fetch properties within a custom polygon boundary
 * Used for custom area selections on the map
 */
export const PROPERTIES_IN_POLYGON = gql`
  ${PROPERTY_MAP_FRAGMENT}
  query PropertiesInPolygon(
    $coordinates: [[Float!]!]!
    $filters: PropertyFiltersInput
    $limit: Int
  ) {
    propertiesInPolygon(
      coordinates: $coordinates
      filters: $filters
      limit: $limit
    ) {
      ...PropertyMapFields
    }
  }
`;

/**
 * Query to fetch a single property by ID
 * Used when clicking on a property marker or viewing property details
 */
export const GET_PROPERTY = gql`
  ${PROPERTY_MAP_FRAGMENT}
  query GetProperty($id: ID!) {
    property(id: $id) {
      ...PropertyMapFields
    }
  }
`;
