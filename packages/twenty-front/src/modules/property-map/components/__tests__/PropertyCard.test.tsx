import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../__tests__/testUtils';
import { PropertyCard } from '../PropertyCard';
import type { Property } from '../../types/property-map.types';

const mockProperty: Property = {
  id: 'test-property-1',
  addressDisplay: '123 Test Street, Sydney NSW 2000',
  latitude: -33.8688,
  longitude: 151.2093,
  listingStatus: 'on_market',
  attributes: {
    bedrooms: 3,
    bathrooms: 2,
    carSpaces: 1,
    propertyType: 'house',
  },
  askingPrice: 850000,
  landSize: 450,
  photos: ['https://example.com/photo1.jpg'],
};

describe('PropertyCard', () => {
  it('should render property details correctly', () => {
    renderWithProviders(<PropertyCard property={mockProperty} />);

    expect(screen.getByText('123 Test Street, Sydney NSW 2000')).toBeInTheDocument();
    expect(screen.getByText('$850,000')).toBeInTheDocument();
    expect(screen.getByText('on market')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // bedrooms
    expect(screen.getByText('2')).toBeInTheDocument(); // bathrooms
    expect(screen.getByText('1')).toBeInTheDocument(); // car spaces
    expect(screen.getByText('450m²')).toBeInTheDocument(); // land size
  });

  it('should render with image when photo is available', () => {
    renderWithProviders(<PropertyCard property={mockProperty} />);

    const image = screen.getByAltText('123 Test Street, Sydney NSW 2000');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/photo1.jpg');
  });

  it('should render placeholder when no photo available', () => {
    const propertyWithoutPhoto: Property = {
      ...mockProperty,
      photos: undefined,
    };

    renderWithProviders(<PropertyCard property={propertyWithoutPhoto} />);

    expect(screen.getByText('No Image')).toBeInTheDocument();
  });

  it('should display "Price on Application" when price is null', () => {
    const propertyWithoutPrice: Property = {
      ...mockProperty,
      askingPrice: null,
    };

    renderWithProviders(<PropertyCard property={propertyWithoutPrice} />);

    expect(screen.getByText('Price on Application')).toBeInTheDocument();
  });

  it('should render in compact mode when compact prop is true', () => {
    const { container } = renderWithProviders(
      <PropertyCard property={mockProperty} compact />,
    );

    const card = container.querySelector('[data-testid="property-card-test-property-1"]');
    expect(card).toBeInTheDocument();
  });

  it('should handle onClick event', () => {
    const handleClick = jest.fn();
    renderWithProviders(
      <PropertyCard property={mockProperty} onClick={handleClick} />,
    );

    const card = screen.getByTestId('property-card-test-property-1');
    fireEvent.click(card);

    expect(handleClick).toHaveBeenCalledWith(mockProperty);
  });

  it('should not render attributes that are undefined', () => {
    const propertyWithoutAttributes: Property = {
      ...mockProperty,
      attributes: undefined,
      landSize: null,
    };

    renderWithProviders(<PropertyCard property={propertyWithoutAttributes} />);

    // Should not render any attribute icons or values
    expect(screen.queryByText('3')).not.toBeInTheDocument();
    expect(screen.queryByText('2')).not.toBeInTheDocument();
    expect(screen.queryByText('1')).not.toBeInTheDocument();
    expect(screen.queryByText(/m²/)).not.toBeInTheDocument();
  });

  it('should render different status colors correctly', () => {
    const statuses: Array<Property['listingStatus']> = [
      'on_market',
      'off_market',
      'pre_market',
      'sold',
      'withdrawn',
    ];

    statuses.forEach((status) => {
      const { unmount } = renderWithProviders(
        <PropertyCard property={{ ...mockProperty, listingStatus: status }} />,
      );

      const formattedStatus = status.replace('_', ' ');
      expect(screen.getByText(formattedStatus)).toBeInTheDocument();

      unmount();
    });
  });

  it('should format large prices with thousand separators', () => {
    const expensiveProperty: Property = {
      ...mockProperty,
      askingPrice: 2500000,
    };

    renderWithProviders(<PropertyCard property={expensiveProperty} />);

    expect(screen.getByText('$2,500,000')).toBeInTheDocument();
  });

  it('should handle zero values for attributes', () => {
    const propertyWithZeroAttributes: Property = {
      ...mockProperty,
      attributes: {
        bedrooms: 0,
        bathrooms: 0,
        carSpaces: 0,
      },
      landSize: 0,
    };

    renderWithProviders(<PropertyCard property={propertyWithZeroAttributes} />);

    // Should render zero values (0 is a valid number)
    const zeroTexts = screen.getAllByText('0');
    expect(zeroTexts.length).toBeGreaterThan(0);
  });
});
