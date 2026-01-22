import { render, screen, fireEvent } from '@testing-library/react';
import { PropertyCard } from '@/property-map/components/PropertyCard';
import type { Property } from '@/property-map/types/property-map.types';
import { getJestMetadataAndApolloMocksAndActionMenuWrappers } from '~/testing/jest/getJestMetadataAndApolloMocksAndActionMenuWrappers';

const { Wrapper: MockedWrapper } =
  getJestMetadataAndApolloMocksAndActionMenuWrappers({
    apolloMocks: [],
  });

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
    render(
      <MockedWrapper>
        <PropertyCard property={mockProperty} />
      </MockedWrapper>,
    );

    expect(screen.getByText('123 Test Street, Sydney NSW 2000')).toBeInTheDocument();
    expect(screen.getByText('$850,000')).toBeInTheDocument();
    expect(screen.getByText('on market')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // bedrooms
    expect(screen.getByText('2')).toBeInTheDocument(); // bathrooms
    expect(screen.getByText('1')).toBeInTheDocument(); // car spaces
    expect(screen.getByText('450m²')).toBeInTheDocument(); // land size
  });

  it('should render with image when photo is available', () => {
    render(
      <MockedWrapper>
        <PropertyCard property={mockProperty} />
      </MockedWrapper>,
    );

    const image = screen.getByAltText('123 Test Street, Sydney NSW 2000');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/photo1.jpg');
  });

  it('should render placeholder when no photo available', () => {
    const propertyWithoutPhoto: Property = {
      ...mockProperty,
      photos: undefined,
    };

    render(
      <MockedWrapper>
        <PropertyCard property={propertyWithoutPhoto} />
      </MockedWrapper>,
    );

    expect(screen.getByText('No Image')).toBeInTheDocument();
  });

  it('should display "Price on Application" when price is null', () => {
    const propertyWithoutPrice: Property = {
      ...mockProperty,
      askingPrice: null,
    };

    render(
      <MockedWrapper>
        <PropertyCard property={propertyWithoutPrice} />
      </MockedWrapper>,
    );

    expect(screen.getByText('Price on Application')).toBeInTheDocument();
  });

  it('should render in compact mode when compact prop is true', () => {
    const { container } = render(
      <MockedWrapper>
        <PropertyCard property={mockProperty} compact />
      </MockedWrapper>,
    );

    const card = container.querySelector('[data-testid="property-card-test-property-1"]');
    expect(card).toBeInTheDocument();
  });

  it('should handle onClick event', () => {
    const handleClick = jest.fn();
    render(
      <MockedWrapper>
        <PropertyCard property={mockProperty} onClick={handleClick} />
      </MockedWrapper>,
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

    render(
      <MockedWrapper>
        <PropertyCard property={propertyWithoutAttributes} />
      </MockedWrapper>,
    );

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
      const { unmount } = render(
        <MockedWrapper>
          <PropertyCard property={{ ...mockProperty, listingStatus: status }} />
        </MockedWrapper>,
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

    render(
      <MockedWrapper>
        <PropertyCard property={expensiveProperty} />
      </MockedWrapper>,
    );

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

    render(
      <MockedWrapper>
        <PropertyCard property={propertyWithZeroAttributes} />
      </MockedWrapper>,
    );

    // Should render zero values (0 is a valid number)
    const zeroTexts = screen.getAllByText('0');
    expect(zeroTexts.length).toBeGreaterThan(0);
  });
});
