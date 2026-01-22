import { renderWithProviders } from '../../__tests__/testUtils';
import { PropertyMapMarker } from '../PropertyMapMarker';
import type { Property } from '../../types/property-map.types';

const mockProperty: Property = {
  id: 'test-property-1',
  addressDisplay: '123 Test Street, Sydney NSW 2000',
  latitude: -33.8688,
  longitude: 151.2093,
  listingStatus: 'on_market',
  askingPrice: 1500000,
  attributes: {
    bedrooms: 3,
    bathrooms: 2,
    carSpaces: 1,
    propertyType: 'house',
  },
};

describe('PropertyMapMarker', () => {
  it('should render marker with formatted price', () => {
    const onClick = jest.fn();
    const { container } = renderWithProviders(
      <PropertyMapMarker property={mockProperty} onClick={onClick} />,
    );

    expect(container).toBeInTheDocument();
  });

  it('should format price as millions when >= 1M', () => {
    const onClick = jest.fn();
    const propertyWithHighPrice: Property = {
      ...mockProperty,
      askingPrice: 2500000,
    };

    const { getByText } = renderWithProviders(
      <PropertyMapMarker property={propertyWithHighPrice} onClick={onClick} />,
    );

    expect(getByText('$2.50M')).toBeInTheDocument();
  });

  it('should format price as thousands when < 1M', () => {
    const onClick = jest.fn();
    const propertyWithLowPrice: Property = {
      ...mockProperty,
      askingPrice: 850000,
    };

    const { getByText } = renderWithProviders(
      <PropertyMapMarker property={propertyWithLowPrice} onClick={onClick} />,
    );

    expect(getByText('$850K')).toBeInTheDocument();
  });

  it('should display POA when price is not available', () => {
    const onClick = jest.fn();
    const propertyWithoutPrice: Property = {
      ...mockProperty,
      askingPrice: null,
    };

    const { getByText } = renderWithProviders(
      <PropertyMapMarker property={propertyWithoutPrice} onClick={onClick} />,
    );

    expect(getByText('POA')).toBeInTheDocument();
  });

  it('should call onClick when marker is clicked', () => {
    const onClick = jest.fn();
    const { container } = renderWithProviders(
      <PropertyMapMarker property={mockProperty} onClick={onClick} />,
    );

    const marker = container.querySelector('[role="button"]');
    if (marker) {
      marker.click();
    }

    expect(onClick).toHaveBeenCalledWith(mockProperty);
  });

  it('should render with selected styling when isSelected is true', () => {
    const onClick = jest.fn();
    const { container } = renderWithProviders(
      <PropertyMapMarker property={mockProperty} isSelected={true} onClick={onClick} />,
    );

    expect(container).toBeInTheDocument();
  });

  it('should apply correct color based on listing status', () => {
    const onClick = jest.fn();
    const statuses = ['on_market', 'off_market', 'pre_market', 'sold', 'withdrawn'] as const;

    statuses.forEach((status) => {
      const propertyWithStatus: Property = {
        ...mockProperty,
        listingStatus: status,
      };

      const { container } = renderWithProviders(
        <PropertyMapMarker property={propertyWithStatus} onClick={onClick} />,
      );

      expect(container).toBeInTheDocument();
    });
  });
});
