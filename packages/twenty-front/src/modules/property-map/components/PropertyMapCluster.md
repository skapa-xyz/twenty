# PropertyMapCluster Component

A cluster marker component for displaying aggregated property counts on a map when multiple properties are grouped together.

## Features

- **Scalable size**: Marker size increases based on the number of properties in the cluster
- **Color intensity**: Background color becomes more intense as the count increases
- **Click-to-zoom**: Click handler support for zooming into clusters
- **Formatted counts**: Large numbers are abbreviated (e.g., "1.5k" instead of "1500")
- **Hover effects**: Visual feedback on mouse hover
- **Accessible**: Built with proper semantic HTML

## Usage

```typescript
import { PropertyMapCluster } from '~/modules/property-map/components';

// Basic usage
<PropertyMapCluster
  latitude={-33.8688}
  longitude={151.2093}
  pointCount={25}
/>

// With click handler to zoom into cluster
<PropertyMapCluster
  latitude={-33.8688}
  longitude={151.2093}
  pointCount={150}
  onClick={() => {
    // Zoom into cluster
    mapRef.current?.flyTo({
      center: [151.2093, -33.8688],
      zoom: map.getZoom() + 2,
    });
  }}
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `latitude` | `number` | Yes | Latitude coordinate for the cluster marker |
| `longitude` | `number` | Yes | Longitude coordinate for the cluster marker |
| `pointCount` | `number` | Yes | Number of properties in the cluster |
| `onClick` | `() => void` | No | Callback function when cluster is clicked |

## Styling

The component uses the following size breakpoints:
- **1-9 properties**: 35px diameter, light blue
- **10-49 properties**: 40px diameter, medium blue
- **50-99 properties**: 45px diameter, darker blue
- **100+ properties**: 50px diameter, darkest blue

## Implementation Details

The component is built on top of `react-map-gl`'s `Marker` component and uses:
- Emotion styled components for styling
- Theme values for consistent colors and spacing
- Event handling that prevents map click propagation
- Number formatting for large counts (>= 1000 shows "Xk")
