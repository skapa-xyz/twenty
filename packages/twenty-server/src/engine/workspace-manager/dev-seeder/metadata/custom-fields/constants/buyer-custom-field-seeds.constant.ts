import { FieldMetadataType } from 'twenty-shared/types';

import { type FieldMetadataSeed } from 'src/engine/workspace-manager/dev-seeder/metadata/types/field-metadata-seed.type';

export const BUYER_CUSTOM_FIELD_SEEDS: FieldMetadataSeed[] = [
  {
    type: FieldMetadataType.SELECT,
    label: 'Status',
    name: 'status',
    icon: 'IconProgress',
    options: [
      { label: 'Active', value: 'ACTIVE', position: 0, color: 'green' },
      { label: 'Inactive', value: 'INACTIVE', position: 1, color: 'gray' },
      { label: 'Archived', value: 'ARCHIVED', position: 2, color: 'red' },
    ],
    defaultValue: "'ACTIVE'",
  },
  {
    type: FieldMetadataType.SELECT,
    label: 'Buyer Type',
    name: 'buyerType',
    icon: 'IconUsers',
    options: [
      { label: 'Individual', value: 'INDIVIDUAL', position: 0, color: 'blue' },
      { label: 'Couple', value: 'COUPLE', position: 1, color: 'purple' },
      { label: 'Company', value: 'COMPANY', position: 2, color: 'orange' },
      { label: 'Trust', value: 'TRUST', position: 3, color: 'yellow' },
      { label: 'SMSF', value: 'SMSF', position: 4, color: 'pink' },
    ],
  },
  {
    type: FieldMetadataType.EMAILS,
    label: 'Email',
    name: 'email',
    icon: 'IconMail',
  },
  {
    type: FieldMetadataType.PHONES,
    label: 'Phone',
    name: 'phone',
    icon: 'IconPhone',
  },
  {
    type: FieldMetadataType.CURRENCY,
    label: 'Budget Min',
    name: 'budgetMin',
    icon: 'IconCurrencyDollar',
  },
  {
    type: FieldMetadataType.CURRENCY,
    label: 'Budget Max',
    name: 'budgetMax',
    icon: 'IconCurrencyDollar',
  },
  {
    type: FieldMetadataType.TEXT,
    label: 'Preferred Suburbs',
    name: 'preferredSuburbs',
    icon: 'IconMapPin',
  },
  {
    type: FieldMetadataType.NUMBER,
    label: 'Min Bedrooms',
    name: 'minBedrooms',
    icon: 'IconBed',
  },
  {
    type: FieldMetadataType.NUMBER,
    label: 'Min Bathrooms',
    name: 'minBathrooms',
    icon: 'IconBath',
  },
  {
    type: FieldMetadataType.MULTI_SELECT,
    label: 'Property Types',
    name: 'propertyTypes',
    icon: 'IconBuilding',
    options: [
      { label: 'House', value: 'HOUSE', position: 0, color: 'blue' },
      { label: 'Apartment', value: 'APARTMENT', position: 1, color: 'purple' },
      { label: 'Townhouse', value: 'TOWNHOUSE', position: 2, color: 'green' },
      { label: 'Villa', value: 'VILLA', position: 3, color: 'orange' },
      { label: 'Land', value: 'LAND', position: 4, color: 'yellow' },
      { label: 'Rural', value: 'RURAL', position: 5, color: 'turquoise' },
    ],
  },
  {
    type: FieldMetadataType.TEXT,
    label: 'Must Have Features',
    name: 'mustHaveFeatures',
    icon: 'IconStar',
  },
  {
    type: FieldMetadataType.TEXT,
    label: 'Deal Breakers',
    name: 'dealBreakers',
    icon: 'IconBan',
  },
  {
    type: FieldMetadataType.CURRENCY,
    label: 'Pre-Approval Amount',
    name: 'preApprovalAmount',
    icon: 'IconCurrencyDollar',
  },
  {
    type: FieldMetadataType.DATE,
    label: 'Pre-Approval Expiry',
    name: 'preApprovalExpiry',
    icon: 'IconCalendarOff',
  },
  {
    type: FieldMetadataType.TEXT,
    label: 'Solicitor Name',
    name: 'solicitorName',
    icon: 'IconScale',
  },
  {
    type: FieldMetadataType.TEXT,
    label: 'Solicitor Contact',
    name: 'solicitorContact',
    icon: 'IconScale',
  },
  {
    type: FieldMetadataType.RICH_TEXT,
    label: 'Investment Goals',
    name: 'investmentGoals',
    icon: 'IconTarget',
  },
  {
    type: FieldMetadataType.TEXT,
    label: 'Timeline',
    name: 'timeline',
    icon: 'IconClock',
  },
  {
    type: FieldMetadataType.RICH_TEXT,
    label: 'Notes',
    name: 'notes',
    icon: 'IconNotes',
  },
  {
    type: FieldMetadataType.DATE,
    label: 'Engagement Signed Date',
    name: 'engagementSignedDate',
    icon: 'IconSignature',
  },
  {
    type: FieldMetadataType.CURRENCY,
    label: 'Engagement Fee',
    name: 'engagementFee',
    icon: 'IconReceipt',
  },
  {
    type: FieldMetadataType.NUMBER,
    label: 'Commission Rate',
    name: 'commissionRate',
    icon: 'IconPercentage',
  },
];
