import type { Meta, StoryObj } from '@storybook/react';
import { within } from '@storybook/test';
import Map from 'react-map-gl';
import { PropertyMapMarker } from '../PropertyMapMarker';
import type { Property } from '../../types/property-map.types';
import { MAPBOX_ACCESS_TOKEN, DEFAULT_MAP_STYLE } from '../../constants/mapConfig';

const mockProperty: Property = {
  id: 'story-property-1',
  addressDisplay: '123 Example Street, Sydney NSW 2000',
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

const meta: Meta<typeof PropertyMapMarker> = {
  title: 'Modules/PropertyMap/PropertyMapMarker',
  component: PropertyMapMarker,
  decorators: [
    (Story) => (
      <div style={{ width: '100%', height: '500px' }}>
        <Map
          mapboxAccessToken={MAPBOX_ACCESS_TOKEN || 'pk.test-token'}
          mapStyle={DEFAULT_MAP_STYLE}
          initialViewState={{
            latitude: -33.8688,
            longitude: 151.2093,
            zoom: 14,
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <Story />
        </Map>
      </div>
    ),
  ],
  args: {
    property: mockProperty,
    onClick: (property) => console.log('Clicked property:', property),
  },
};

export default meta;
type Story = StoryObj<typeof PropertyMapMarker>;

export const OnMarket: Story = {
  args: {
    property: {
      ...mockProperty,
      listingStatus: 'on_market',
      askingPrice: 1500000,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Add interaction tests here if needed
  },
};

export const OffMarket: Story = {
  args: {
    property: {
      ...mockProperty,
      listingStatus: 'off_market',
      askingPrice: 2300000,
    },
  },
};

export const PreMarket: Story = {
  args: {
    property: {
      ...mockProperty,
      listingStatus: 'pre_market',
      askingPrice: 1800000,
    },
  },
};

export const Sold: Story = {
  args: {
    property: {
      ...mockProperty,
      listingStatus: 'sold',
      askingPrice: 1650000,
    },
  },
};

export const Withdrawn: Story = {
  args: {
    property: {
      ...mockProperty,
      listingStatus: 'withdrawn',
      askingPrice: null,
    },
  },
};

export const Selected: Story = {
  args: {
    property: mockProperty,
    isSelected: true,
  },
};

export const PriceOnApplication: Story = {
  args: {
    property: {
      ...mockProperty,
      askingPrice: null,
    },
  },
};

export const HighPrice: Story = {
  args: {
    property: {
      ...mockProperty,
      askingPrice: 8500000,
    },
  },
};

export const LowPrice: Story = {
  args: {
    property: {
      ...mockProperty,
      askingPrice: 650000,
    },
  },
};

export const MultipleMarkers: Story = {
  render: (args) => (
    <>
      <PropertyMapMarker
        {...args}
        property={{
          ...mockProperty,
          id: 'prop-1',
          latitude: -33.8688,
          longitude: 151.2093,
          listingStatus: 'on_market',
          askingPrice: 1500000,
        }}
      />
      <PropertyMapMarker
        {...args}
        property={{
          ...mockProperty,
          id: 'prop-2',
          latitude: -33.8698,
          longitude: 151.2103,
          listingStatus: 'off_market',
          askingPrice: 2100000,
        }}
      />
      <PropertyMapMarker
        {...args}
        property={{
          ...mockProperty,
          id: 'prop-3',
          latitude: -33.8678,
          longitude: 151.2083,
          listingStatus: 'pre_market',
          askingPrice: 1800000,
        }}
        isSelected={true}
      />
      <PropertyMapMarker
        {...args}
        property={{
          ...mockProperty,
          id: 'prop-4',
          latitude: -33.8708,
          longitude: 151.2113,
          listingStatus: 'sold',
          askingPrice: 1950000,
        }}
      />
    </>
  ),
};
