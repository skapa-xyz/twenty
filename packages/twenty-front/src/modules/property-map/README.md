# Property Map Module

This module provides interactive map visualization for properties using Mapbox GL and react-map-gl.

## Components

### PropertyMapCanvas

The main map rendering component that displays properties as markers with automatic clustering support.

#### Features

- **Marker Clustering**: Automatically clusters nearby properties for better visualization at different zoom levels
- **Interactive Markers**: Click on individual properties to select them
- **Cluster Expansion**: Click on clusters to zoom into that area
- **Status-based Coloring**: Different colors for different listing statuses:
  - On Market: Green (#22c55e)
  - Off Market: Blue (#3b82f6)
  - Pre Market: Orange (#f59e0b)
  - Sold: Red (#ef4444)
- **Responsive Clustering**: Cluster sizes and colors change based on the number of properties
  - < 10 properties: Light blue (#51bbd6), 20px radius
  - 10-50 properties: Yellow (#f1f075), 30px radius
  - > 50 properties: Pink (#f28cb1), 40px radius

#### Props

```typescript
interface PropertyMapCanvasProps {
  // Array of properties to display on the map
  properties: Property[];

  // Current map viewport state
  viewState: Partial<ViewState>;

  // Callback when viewport changes (pan, zoom, etc.)
  onViewStateChange: (viewState: Partial<ViewState>) => void;

  // Optional callback when a property marker is clicked
  onPropertyClick?: (property: Property) => void;

  // Optional callback when a cluster is clicked
  onClusterClick?: (clusterId: number, latitude: number, longitude: number) => void;
}
```

#### Usage Example

```typescript
import { PropertyMapCanvas } from '@/property-map/components/PropertyMapCanvas';
import { useState } from 'react';

function MyMapView() {
  const [viewState, setViewState] = useState({
    latitude: -33.8688,
    longitude: 151.2093,
    zoom: 11,
  });

  const [selectedProperty, setSelectedProperty] = useState(null);

  const handlePropertyClick = (property) => {
    setSelectedProperty(property);
  };

  return (
    <PropertyMapCanvas
      properties={properties}
      viewState={viewState}
      onViewStateChange={setViewState}
      onPropertyClick={handlePropertyClick}
    />
  );
}
```

## Configuration

The module uses constants defined in `constants/map-config.constants.ts`:

- `MAPBOX_ACCESS_TOKEN`: Mapbox API token (from environment variable)
- `MAPBOX_STYLE`: Default map style URL
- `DEFAULT_VIEWPORT`: Default map center and zoom
- `CLUSTER_MAX_ZOOM`: Maximum zoom level for clustering (14)
- `CLUSTER_RADIUS`: Clustering radius in pixels (50)

## Types

See `types/property-map.types.ts` for complete type definitions:

- `Property`: Main property type
- `PropertyAttributes`: Property features (bedrooms, bathrooms, etc.)
- `ListingStatus`: Property listing status enum
- `PropertyGeoJSONFeature`: GeoJSON feature format
- `PropertyGeoJSONFeatureCollection`: GeoJSON feature collection format

## Implementation Details

### Clustering

The component uses react-map-gl's built-in GeoJSON clustering via the `Source` component with `cluster={true}`. This provides:

- Efficient client-side clustering
- Automatic cluster updates on zoom/pan
- Cluster expansion on click
- Customizable cluster appearance via Mapbox GL layers

### Event Handling

The component handles two types of click events:

1. **Cluster Click**: Zooms into the cluster area with smooth animation
2. **Property Click**: Calls the `onPropertyClick` callback with the selected property

### Performance

- Uses `useMemo` to optimize GeoJSON conversion and layer configurations
- Uses `useCallback` to prevent unnecessary re-renders
- Cluster rendering is handled efficiently by Mapbox GL

## Dependencies

- `react-map-gl`: React wrapper for Mapbox GL JS
- `mapbox-gl`: Mapbox GL JS library
- `@emotion/styled`: Styling

## Environment Variables

```bash
REACT_APP_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
```

## Testing

Unit tests are located in `components/__tests__/PropertyMapCanvas.test.tsx`.

Run tests with:
```bash
npx nx test twenty-front
```
