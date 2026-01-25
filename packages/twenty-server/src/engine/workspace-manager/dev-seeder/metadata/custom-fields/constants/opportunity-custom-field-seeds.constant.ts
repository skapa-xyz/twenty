import { FieldMetadataType } from 'twenty-shared/types';

import { type FieldMetadataSeed } from 'src/engine/workspace-manager/dev-seeder/metadata/types/field-metadata-seed.type';

export const OPPORTUNITY_CUSTOM_FIELD_SEEDS: FieldMetadataSeed[] = [
  {
    type: FieldMetadataType.TEXT,
    label: 'Property Address',
    name: 'propertyAddress',
    icon: 'IconMapPin',
  },
  {
    type: FieldMetadataType.CURRENCY,
    label: 'Engagement Fee',
    name: 'engagementFee',
    icon: 'IconReceipt',
  },
  {
    type: FieldMetadataType.CURRENCY,
    label: 'Purchase Price',
    name: 'purchasePrice',
    icon: 'IconCurrencyDollar',
  },
  {
    type: FieldMetadataType.NUMBER,
    label: 'Commission Rate',
    name: 'commissionRate',
    icon: 'IconPercentage',
  },
  {
    type: FieldMetadataType.DATE,
    label: 'Exchange Date',
    name: 'exchangeDate',
    icon: 'IconCalendar',
  },
  {
    type: FieldMetadataType.DATE,
    label: 'Settlement Date',
    name: 'settlementDate',
    icon: 'IconCalendar',
  },
  {
    type: FieldMetadataType.TEXT,
    label: 'Xero Engagement Invoice ID',
    name: 'xeroEngagementInvoiceId',
    icon: 'IconFileInvoice',
  },
  {
    type: FieldMetadataType.TEXT,
    label: 'Xero Success Fee Invoice ID',
    name: 'xeroSuccessFeeInvoiceId',
    icon: 'IconFileInvoice',
  },
];
