# PropertyMapMarker Component

Custom map marker component for displaying individual properties on the map.

## Features

- Displays property price in abbreviated format (e.g., $1.5M, $850K)
- Shows "POA" when price is not available
- Color-coded based on listing status:
  - Green: On Market
  - Blue: Off Market
  - Orange: Pre-Market
  - Red: Sold
  - Gray: Withdrawn
- Selected state with enhanced visual styling
- Hover effect for better interactivity
- Arrow pointer for precise location indication

## Usage

```tsx
import { PropertyMapMarker } from '@/property-map/components';
import type { Property } from '@/property-map/types/property-map.types';

const MyMapComponent = () => {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  return (
    <Map>
      {properties.map((property) => (
        <PropertyMapMarker
          key={property.id}
          property={property}
          isSelected={selectedProperty?.id === property.id}
          onClick={(property) => setSelectedProperty(property)}
        />
      ))}
    </Map>
  );
};
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `property` | `Property` | Yes | - | Property data to display |
| `isSelected` | `boolean` | No | `false` | Whether the marker is in selected state |
| `onClick` | `(property: Property) => void` | Yes | - | Callback when marker is clicked |

## Price Formatting

The component automatically formats prices:

- Prices >= $1M: Displayed as "$X.XXM" (e.g., $2.50M)
- Prices >= $1K: Displayed as "$XXXK" (e.g., $850K)
- Prices < $1K: Displayed with locale formatting
- No price: Displayed as "POA" (Price on Application)

## Styling

The marker uses Twenty's theming system and adapts to:
- Theme colors for status indication
- Theme spacing for consistent padding
- Theme typography for text styling
- Theme borders and shadows for visual hierarchy

## Accessibility

- Cursor changes to pointer on hover
- Click handlers include event propagation management
- Visual feedback for hover and selected states
