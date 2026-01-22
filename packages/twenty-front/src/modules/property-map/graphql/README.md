# Property Map GraphQL Queries

This directory contains GraphQL queries for fetching property data with spatial/geolocation capabilities.

## Overview

The queries in `queries.ts` provide three primary spatial search methods:
1. **Bounding Box Search** - For viewport-based map queries
2. **Radius Search** - For "search near me" functionality
3. **Polygon Search** - For custom area selections

## Queries

### PROPERTIES_IN_BOUNDING_BOX

Fetches properties within a rectangular bounding box. This is the primary query used for map viewport updates.

**Variables:**
- `minLat: Float!` - Minimum latitude (south boundary)
- `maxLat: Float!` - Maximum latitude (north boundary)
- `minLng: Float!` - Minimum longitude (west boundary)
- `maxLng: Float!` - Maximum longitude (east boundary)
- `filters: PropertyFilters` - Optional property filters (bedrooms, price, etc.)
- `limit: Int` - Maximum number of results (optional)

**Usage:**
```typescript
import { useQuery } from '@apollo/client';
import { PROPERTIES_IN_BOUNDING_BOX } from '../graphql/queries';

const { data, loading } = useQuery(PROPERTIES_IN_BOUNDING_BOX, {
  variables: {
    minLat: -33.9,
    maxLat: -33.8,
    minLng: 151.1,
    maxLng: 151.3,
    filters: {
      minBedrooms: 3,
      maxPrice: 1000000,
      listingStatus: ['on_market']
    },
    limit: 100
  }
});
```

### PROPERTIES_WITHIN_RADIUS

Fetches properties within a circular radius from a center point.

**Variables:**
- `lat: Float!` - Center point latitude
- `lng: Float!` - Center point longitude
- `radiusKm: Float!` - Radius in kilometers
- `filters: PropertyFilters` - Optional property filters
- `limit: Int` - Maximum number of results (optional)

**Usage:**
```typescript
import { useQuery } from '@apollo/client';
import { PROPERTIES_WITHIN_RADIUS } from '../graphql/queries';

const { data, loading } = useQuery(PROPERTIES_WITHIN_RADIUS, {
  variables: {
    lat: -33.8688,
    lng: 151.2093,
    radiusKm: 5,
    filters: {
      minBedrooms: 2,
      propertyTypes: ['apartment', 'townhouse']
    },
    limit: 50
  }
});
```

### PROPERTIES_IN_POLYGON

Fetches properties within a custom polygon boundary. Useful for irregular search areas drawn by users.

**Variables:**
- `coordinates: [[Float!]!]!` - Array of coordinate pairs defining the polygon
- `filters: PropertyFilters` - Optional property filters
- `limit: Int` - Maximum number of results (optional)

**Usage:**
```typescript
import { useQuery } from '@apollo/client';
import { PROPERTIES_IN_POLYGON } from '../graphql/queries';

const { data, loading } = useQuery(PROPERTIES_IN_POLYGON, {
  variables: {
    coordinates: [
      [151.20, -33.87],
      [151.22, -33.87],
      [151.22, -33.88],
      [151.20, -33.88],
      [151.20, -33.87] // Close the polygon
    ],
    filters: {
      listingStatus: ['on_market', 'pre_market']
    }
  }
});
```

### GET_PROPERTY

Fetches a single property by ID. Used for property detail views.

**Variables:**
- `id: ID!` - Property ID

**Usage:**
```typescript
import { useQuery } from '@apollo/client';
import { GET_PROPERTY } from '../graphql/queries';

const { data, loading } = useQuery(GET_PROPERTY, {
  variables: {
    id: 'property-uuid-here'
  }
});
```

## Property Fields

All queries return properties with the following fields (via `PropertyMapFields` fragment):

### Core Fields
- `id` - Property UUID
- `workspaceId` - Workspace UUID

### Address Fields
- `addressDisplay` - Full formatted address
- `addressStreet` - Street address
- `addressSuburb` - Suburb/city
- `addressState` - State/province
- `addressPostcode` - Postal code

### Location Fields
- `latitude` - Latitude coordinate
- `longitude` - Longitude coordinate

### Property Details
- `attributes` - JSON object containing:
  - `bedrooms` - Number of bedrooms
  - `bathrooms` - Number of bathrooms
  - `carSpaces` - Number of car spaces
  - `propertyType` - Type of property
  - `features` - Array of feature strings

### Listing Information
- `listingStatus` - Current listing status
- `listingAgentId` - Agent UUID
- `listingAgentName` - Agent name
- `listingAgentPhone` - Agent phone

### Media
- `photos` - Array of photo URLs
- `floorplanUrl` - Floorplan image URL

### Pricing
- `estimatedValue` - Estimated value
- `askingPrice` - Current asking price
- `soldPrice` - Final sale price
- `soldDate` - Date of sale

### Size
- `landSize` - Land size in square meters
- `buildingSize` - Building size in square meters
- `yearBuilt` - Year of construction

### Metadata
- `notes` - Internal notes
- `createdAt` - Record creation timestamp
- `updatedAt` - Last update timestamp

## PropertyFilters Type

The `PropertyFilters` input type supports the following fields:

```graphql
input PropertyFilters {
  minBedrooms: Int
  minBathrooms: Int
  minPrice: Int
  maxPrice: Int
  listingStatus: [String!]
  propertyTypes: [String!]
}
```

## Backend Implementation Requirements

These queries expect the following GraphQL resolvers to be implemented on the backend:

1. `propertiesInBoundingBox` - Uses PostGIS ST_MakeEnvelope and ST_Contains
2. `propertiesWithinRadius` - Uses PostGIS ST_DWithin for radius search
3. `propertiesInPolygon` - Uses PostGIS ST_MakePolygon and ST_Contains
4. `property` - Simple findOne by ID

See `packages/twenty-server/src/modules/real-estate/property/resolvers/property.resolver.ts` for implementation details.
