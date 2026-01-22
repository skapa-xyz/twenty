# PropertyCard Component

A reusable card component for displaying property information in both Grid and Map views.

## Features

- Displays property thumbnail or placeholder image
- Shows property address, price, and listing status
- Displays key attributes: bedrooms, bathrooms, car spaces, land size
- Supports compact mode for grid layouts
- Clickable with optional onClick handler
- Status badge with color coding:
  - `on_market`: Green
  - `off_market`: Blue
  - `pre_market`: Orange
  - `sold`: Red
  - `withdrawn`: Gray
- Hover effects when clickable

## Usage

```tsx
import { PropertyCard } from '@/property-map/components/PropertyCard';

// Basic usage
<PropertyCard property={property} />

// Compact mode (for grid views)
<PropertyCard property={property} compact />

// With click handler
<PropertyCard
  property={property}
  onClick={(property) => console.log('Selected:', property.id)}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `property` | `Property` | Yes | - | The property object to display |
| `compact` | `boolean` | No | `false` | Whether to render in compact mode (250px width) |
| `onClick` | `(property: Property) => void` | No | - | Callback when card is clicked |

## Testing

Run tests:
```bash
npx nx test twenty-front --testPathPattern=PropertyCard.test.tsx
```
