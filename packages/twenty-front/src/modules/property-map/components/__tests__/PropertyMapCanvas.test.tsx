import { render } from '@testing-library/react';
import { PropertyMapCanvas } from '../PropertyMapCanvas';
import type { Property } from '../../types/property-map.types';

// react-map-gl is mocked in __mocks__/react-map-gl.tsx
jest.mock('react-map-gl');

describe('PropertyMapCanvas', () => {
  const mockProperties: Property[] = [
    {
      id: '1',
      addressDisplay: '123 Test St, Sydney NSW 2000',
      latitude: -33.8688,
      longitude: 151.2093,
      listingStatus: 'on_market',
      askingPrice: 1000000,
      attributes: {
        bedrooms: 3,
        bathrooms: 2,
        carSpaces: 1,
      },
      photos: ['https://example.com/photo1.jpg'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      addressDisplay: '456 Demo Ave, Sydney NSW 2000',
      latitude: -33.87,
      longitude: 151.21,
      listingStatus: 'off_market',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  const mockViewState = {
    latitude: -33.8688,
    longitude: 151.2093,
    zoom: 11,
  };

  const mockOnViewStateChange = jest.fn();

  it('should render without crashing', () => {
    const { container } = render(
      <PropertyMapCanvas
        properties={mockProperties}
        viewState={mockViewState}
        onViewStateChange={mockOnViewStateChange}
      />,
    );

    expect(container).toBeInTheDocument();
  });

  it('should render the map component', () => {
    const { getByTestId } = render(
      <PropertyMapCanvas
        properties={mockProperties}
        viewState={mockViewState}
        onViewStateChange={mockOnViewStateChange}
      />,
    );

    expect(getByTestId('mock-map')).toBeInTheDocument();
  });

  it('should render with empty properties array', () => {
    const { container } = render(
      <PropertyMapCanvas
        properties={[]}
        viewState={mockViewState}
        onViewStateChange={mockOnViewStateChange}
      />,
    );

    expect(container).toBeInTheDocument();
  });

  it('should accept optional callbacks', () => {
    const mockOnPropertyClick = jest.fn();
    const mockOnClusterClick = jest.fn();

    const { container } = render(
      <PropertyMapCanvas
        properties={mockProperties}
        viewState={mockViewState}
        onViewStateChange={mockOnViewStateChange}
        onPropertyClick={mockOnPropertyClick}
        onClusterClick={mockOnClusterClick}
      />,
    );

    expect(container).toBeInTheDocument();
  });
});
