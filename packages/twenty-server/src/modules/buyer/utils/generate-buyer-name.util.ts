type ContactName = {
  firstName: string;
  lastName: string;
};

const BUYER_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: 'Individual',
  COUPLE: 'Couple',
  COMPANY: 'Company',
  TRUST: 'Trust',
  SMSF: 'SMSF',
};

const MONTH_ABBREVIATIONS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Formats contact names for display in a buyer name.
 *
 * Examples:
 *   1 contact: "John Smith"
 *   2 contacts, same surname: "John & Jane Smith"
 *   2 contacts, different surnames: "John Smith & Jane Doe"
 *   3+ contacts: "John Smith, Jane Doe & Bob Jones"
 */
export const formatContactNames = (contacts: ContactName[]): string => {
  if (contacts.length === 0) {
    return '';
  }

  if (contacts.length === 1) {
    return [contacts[0].firstName, contacts[0].lastName]
      .filter(Boolean)
      .join(' ');
  }

  const lastNames = contacts.map((c) => c.lastName).filter(Boolean);
  const allSameLastName =
    lastNames.length === contacts.length &&
    new Set(lastNames).size === 1 &&
    contacts.length === 2;

  if (allSameLastName) {
    const firstNames = contacts
      .map((c) => c.firstName)
      .filter(Boolean)
      .join(' & ');

    return `${firstNames} ${contacts[0].lastName}`.trim();
  }

  const fullNames = contacts.map((c) =>
    [c.firstName, c.lastName].filter(Boolean).join(' '),
  );

  if (fullNames.length === 2) {
    return fullNames.join(' & ');
  }

  const last = fullNames.pop()!;

  return `${fullNames.join(', ')} & ${last}`;
};

export const generateBuyerName = ({
  contacts,
  buyerType,
  createdAt,
}: {
  contacts: ContactName[];
  buyerType?: string;
  createdAt?: Date;
}): string => {
  const date = createdAt ?? new Date();
  const contactDisplay = formatContactNames(contacts);
  const buyerTypeLabel = buyerType
    ? (BUYER_TYPE_LABELS[buyerType] ?? buyerType)
    : '';
  const month = MONTH_ABBREVIATIONS[date.getMonth()];
  const year = date.getFullYear();

  return [contactDisplay, buyerTypeLabel, month, String(year)]
    .filter(Boolean)
    .join(' - ');
};
