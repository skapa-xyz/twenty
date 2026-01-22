import styled from '@emotion/styled';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PropertyCard } from '../PropertyCard';
import type { Property } from '@/property-map/types/property-map.types';

const StyledContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing(4)};
  padding: ${({ theme }) => theme.spacing(4)};
  flex-wrap: wrap;
`;

const meta: Meta<typeof PropertyCard> = {
  title: 'Modules/PropertyMap/PropertyCard',
  component: PropertyCard,
};

export default meta;
type Story = StoryObj<typeof PropertyCard>;

const mockPropertyWithAllDetails: Property = {
  id: 'property-1',
  addressDisplay: '123 Harbour View Street, Sydney NSW 2000',
  addressStreet: '123 Harbour View Street',
  addressSuburb: 'Sydney',
  addressState: 'NSW',
  addressPostcode: '2000',
  latitude: -33.8688,
  longitude: 151.2093,
  listingStatus: 'on_market',
  attributes: {
    bedrooms: 4,
    bathrooms: 3,
    carSpaces: 2,
    propertyType: 'house',
    features: ['Pool', 'Garden', 'Air Conditioning'],
  },
  askingPrice: 1850000,
  landSize: 650,
  buildingSize: 320,
  photos: [
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=300&fit=crop',
  ],
  listingAgentName: 'Jane Smith',
  listingAgentPhone: '+61 2 9876 5432',
};

const mockPropertyApartment: Property = {
  id: 'property-2',
  addressDisplay: '45/100 Barangaroo Avenue, Barangaroo NSW 2000',
  latitude: -33.8634,
  longitude: 151.2021,
  listingStatus: 'pre_market',
  attributes: {
    bedrooms: 2,
    bathrooms: 2,
    carSpaces: 1,
    propertyType: 'apartment',
  },
  askingPrice: 1200000,
  buildingSize: 95,
  photos: [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop',
  ],
};

const mockPropertyNoImage: Property = {
  id: 'property-3',
  addressDisplay: '78 Suburban Road, Bondi Beach NSW 2026',
  latitude: -33.8905,
  longitude: 151.2749,
  listingStatus: 'sold',
  attributes: {
    bedrooms: 3,
    bathrooms: 2,
    carSpaces: 1,
    propertyType: 'townhouse',
  },
  askingPrice: 2100000,
  landSize: 180,
};

const mockPropertyNoPrice: Property = {
  id: 'property-4',
  addressDisplay: '22 Luxury Lane, Mosman NSW 2088',
  latitude: -33.8289,
  longitude: 151.2443,
  listingStatus: 'off_market',
  attributes: {
    bedrooms: 5,
    bathrooms: 4,
    carSpaces: 3,
    propertyType: 'house',
  },
  askingPrice: null,
  landSize: 1200,
  photos: [
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=400&h=300&fit=crop',
  ],
};

const mockPropertyMinimal: Property = {
  id: 'property-5',
  addressDisplay: 'Lot 15 Development Drive, Ryde NSW 2112',
  latitude: -33.8148,
  longitude: 151.1015,
  listingStatus: 'withdrawn',
  attributes: {
    propertyType: 'land',
  },
  landSize: 800,
};

export const Default: Story = {
  args: {
    property: mockPropertyWithAllDetails,
  },
};

export const Compact: Story = {
  args: {
    property: mockPropertyWithAllDetails,
    compact: true,
  },
};

export const WithClick: Story = {
  args: {
    property: mockPropertyWithAllDetails,
    onClick: (property) => {
      alert(`Clicked property: ${property.addressDisplay}`);
    },
  },
};

export const Apartment: Story = {
  args: {
    property: mockPropertyApartment,
  },
};

export const NoImage: Story = {
  args: {
    property: mockPropertyNoImage,
  },
};

export const NoPriceOnApplication: Story = {
  args: {
    property: mockPropertyNoPrice,
  },
};

export const MinimalDetails: Story = {
  args: {
    property: mockPropertyMinimal,
  },
};

export const AllStatuses: Story = {
  render: () => {
    const statuses: Array<Property['listingStatus']> = [
      'on_market',
      'off_market',
      'pre_market',
      'sold',
      'withdrawn',
    ];

    return (
      <StyledContainer>
        {statuses.map((status) => (
          <PropertyCard
            key={status}
            property={{ ...mockPropertyWithAllDetails, listingStatus: status }}
            compact
          />
        ))}
      </StyledContainer>
    );
  },
};

export const GridLayout: Story = {
  render: () => (
    <StyledContainer>
      <PropertyCard property={mockPropertyWithAllDetails} compact />
      <PropertyCard property={mockPropertyApartment} compact />
      <PropertyCard property={mockPropertyNoImage} compact />
      <PropertyCard property={mockPropertyNoPrice} compact />
    </StyledContainer>
  ),
};
