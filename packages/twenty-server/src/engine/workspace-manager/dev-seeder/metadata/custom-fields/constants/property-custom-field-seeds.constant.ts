import { FieldMetadataType } from 'twenty-shared/types';

import { type FieldMetadataSeed } from 'src/engine/workspace-manager/dev-seeder/metadata/types/field-metadata-seed.type';

export const PROPERTY_CUSTOM_FIELD_SEEDS: FieldMetadataSeed[] = [
  // Address Fields
  {
    type: FieldMetadataType.TEXT,
    label: 'Street Address',
    name: 'streetAddress',
    icon: 'IconMapPin',
  },
  {
    type: FieldMetadataType.TEXT,
    label: 'Suburb',
    name: 'suburb',
    icon: 'IconMapPin',
  },
  {
    type: FieldMetadataType.TEXT,
    label: 'State',
    name: 'state',
    icon: 'IconMapPin',
  },
  {
    type: FieldMetadataType.TEXT,
    label: 'Postcode',
    name: 'postcode',
    icon: 'IconMapPin',
  },

  // Property Details
  {
    type: FieldMetadataType.SELECT,
    label: 'Property Type',
    name: 'propertyType',
    icon: 'IconBuilding',
    options: [
      { label: 'House', value: 'HOUSE', position: 0, color: 'blue' },
      { label: 'Apartment', value: 'APARTMENT', position: 1, color: 'purple' },
      { label: 'Townhouse', value: 'TOWNHOUSE', position: 2, color: 'green' },
      { label: 'Land', value: 'LAND', position: 3, color: 'yellow' },
      { label: 'Villa', value: 'VILLA', position: 4, color: 'orange' },
      { label: 'Unit', value: 'UNIT', position: 5, color: 'pink' },
      { label: 'Other', value: 'OTHER', position: 6, color: 'gray' },
    ],
  },
  {
    type: FieldMetadataType.NUMBER,
    label: 'Bedrooms',
    name: 'bedrooms',
    icon: 'IconBed',
  },
  {
    type: FieldMetadataType.NUMBER,
    label: 'Bathrooms',
    name: 'bathrooms',
    icon: 'IconBath',
  },
  {
    type: FieldMetadataType.NUMBER,
    label: 'Car Spaces',
    name: 'carSpaces',
    icon: 'IconCar',
  },
  {
    type: FieldMetadataType.NUMBER,
    label: 'Land Size',
    name: 'landSize',
    icon: 'IconRuler',
  },
  {
    type: FieldMetadataType.NUMBER,
    label: 'Building Size',
    name: 'buildingSize',
    icon: 'IconRuler',
  },
  {
    type: FieldMetadataType.NUMBER,
    label: 'Year Built',
    name: 'yearBuilt',
    icon: 'IconCalendar',
  },

  // Pricing
  {
    type: FieldMetadataType.CURRENCY,
    label: 'Price',
    name: 'price',
    icon: 'IconCurrencyDollar',
  },
  {
    type: FieldMetadataType.TEXT,
    label: 'Price Guide',
    name: 'priceGuide',
    icon: 'IconCurrencyDollar',
  },

  // Listing Status
  {
    type: FieldMetadataType.SELECT,
    label: 'Listing Status',
    name: 'listingStatus',
    icon: 'IconTag',
    options: [
      { label: 'On Market', value: 'ON_MARKET', position: 0, color: 'green' },
      { label: 'Off Market', value: 'OFF_MARKET', position: 1, color: 'blue' },
      {
        label: 'Pre-Market',
        value: 'PRE_MARKET',
        position: 2,
        color: 'purple',
      },
      {
        label: 'Under Contract',
        value: 'UNDER_CONTRACT',
        position: 3,
        color: 'orange',
      },
      { label: 'Sold', value: 'SOLD', position: 4, color: 'red' },
      { label: 'Withdrawn', value: 'WITHDRAWN', position: 5, color: 'gray' },
    ],
    defaultValue: "'ON_MARKET'",
  },
  {
    type: FieldMetadataType.CURRENCY,
    label: 'Sold Price',
    name: 'soldPrice',
    icon: 'IconCurrencyDollar',
  },
  {
    type: FieldMetadataType.DATE,
    label: 'Sold Date',
    name: 'soldDate',
    icon: 'IconCalendar',
  },

  // External Links
  {
    type: FieldMetadataType.LINKS,
    label: 'Google Maps Link',
    name: 'googleMapsLink',
    icon: 'IconMap',
  },
  {
    type: FieldMetadataType.LINKS,
    label: 'Realestate.com.au Link',
    name: 'realestateComAuLink',
    icon: 'IconLink',
  },
  {
    type: FieldMetadataType.LINKS,
    label: 'Domain Link',
    name: 'domainLink',
    icon: 'IconLink',
  },

  // Notes
  {
    type: FieldMetadataType.RICH_TEXT,
    label: 'Notes',
    name: 'notes',
    icon: 'IconNotes',
  },
];
