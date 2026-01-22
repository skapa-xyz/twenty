// Xero Contact Types based on Xero API specification
// https://developer.xero.com/documentation/api/accounting/contacts

export type XeroContactStatus = 'ACTIVE' | 'ARCHIVED' | 'GDPRREQUEST';

export type XeroAddressType = 'POBOX' | 'STREET';

export type XeroPhoneType = 'DEFAULT' | 'DDI' | 'MOBILE' | 'FAX';

export interface XeroAddress {
  addressType?: XeroAddressType;
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  addressLine4?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  attentionTo?: string;
}

export interface XeroPhone {
  phoneType?: XeroPhoneType;
  phoneNumber?: string;
  phoneAreaCode?: string;
  phoneCountryCode?: string;
}

export interface XeroContactPerson {
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  includeInEmails?: boolean;
}

export interface XeroContact {
  contactID?: string;
  contactNumber?: string;
  accountNumber?: string;
  contactStatus?: XeroContactStatus;
  name: string;
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  skypeUserName?: string;
  contactPersons?: XeroContactPerson[];
  bankAccountDetails?: string;
  taxNumber?: string;
  accountsReceivableTaxType?: string;
  accountsPayableTaxType?: string;
  addresses?: XeroAddress[];
  phones?: XeroPhone[];
  isSupplier?: boolean;
  isCustomer?: boolean;
  defaultCurrency?: string;
  updatedDateUTC?: string;
  contactGroups?: Array<{ contactGroupID: string; name: string }>;
  website?: string;
  brandingTheme?: { brandingThemeID: string };
  batchPayments?: { bankAccountNumber: string; bankAccountName: string };
  discount?: number;
  balances?: {
    accountsReceivable?: {
      outstanding?: number;
      overdue?: number;
    };
    accountsPayable?: {
      outstanding?: number;
      overdue?: number;
    };
  };
  hasAttachments?: boolean;
  hasValidationErrors?: boolean;
}

export interface XeroContactResponse {
  contacts: XeroContact[];
  status?: string;
}

export interface CreateXeroContactInput {
  name: string;
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  phones?: XeroPhone[];
  addresses?: XeroAddress[];
  isCustomer?: boolean;
  isSupplier?: boolean;
}

export interface UpdateXeroContactInput {
  name?: string;
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  phones?: XeroPhone[];
  addresses?: XeroAddress[];
  contactStatus?: XeroContactStatus;
}

export interface CRMContactData {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  companyName?: string | null;
}
