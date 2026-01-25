import { FieldMetadataType } from 'twenty-shared/types';

import { type FieldMetadataSeed } from 'src/engine/workspace-manager/dev-seeder/metadata/types/field-metadata-seed.type';

export const PROPERTY_SHORTLIST_CUSTOM_FIELD_SEEDS: FieldMetadataSeed[] = [
  {
    type: FieldMetadataType.SELECT,
    label: 'Status',
    name: 'status',
    icon: 'IconProgress',
    options: [
      { label: 'Added', value: 'ADDED', position: 0, color: 'gray' },
      { label: 'Viewed', value: 'VIEWED', position: 1, color: 'blue' },
      { label: 'Interested', value: 'INTERESTED', position: 2, color: 'green' },
      {
        label: 'Offer Made',
        value: 'OFFER_MADE',
        position: 3,
        color: 'orange',
      },
      { label: 'Rejected', value: 'REJECTED', position: 4, color: 'red' },
      { label: 'Purchased', value: 'PURCHASED', position: 5, color: 'purple' },
    ],
    defaultValue: "'ADDED'",
  },
  {
    type: FieldMetadataType.SELECT,
    label: 'Interest Level',
    name: 'interestLevel',
    icon: 'IconFlame',
    options: [
      { label: 'Hot', value: 'HOT', position: 0, color: 'red' },
      { label: 'Warm', value: 'WARM', position: 1, color: 'orange' },
      { label: 'Cool', value: 'COOL', position: 2, color: 'blue' },
    ],
  },
  {
    type: FieldMetadataType.DATE,
    label: 'Viewing Date',
    name: 'viewingDate',
    icon: 'IconCalendar',
  },
  {
    type: FieldMetadataType.RICH_TEXT,
    label: 'Viewing Notes',
    name: 'viewingNotes',
    icon: 'IconNotes',
  },
  {
    type: FieldMetadataType.CURRENCY,
    label: 'Offer Amount',
    name: 'offerAmount',
    icon: 'IconCurrencyDollar',
  },
  {
    type: FieldMetadataType.DATE,
    label: 'Offer Date',
    name: 'offerDate',
    icon: 'IconCalendar',
  },
  {
    type: FieldMetadataType.TEXT,
    label: 'Rejection Reason',
    name: 'rejectionReason',
    icon: 'IconX',
  },
  {
    type: FieldMetadataType.DATE,
    label: 'Added At',
    name: 'addedAt',
    icon: 'IconCalendarPlus',
  },
];
