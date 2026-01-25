import { type ObjectMetadataSeed } from 'src/engine/workspace-manager/dev-seeder/metadata/types/object-metadata-seed.type';

export const PROPERTY_SHORTLIST_CUSTOM_OBJECT_SEED: ObjectMetadataSeed = {
  labelPlural: 'Property Shortlists',
  labelSingular: 'Property Shortlist',
  namePlural: 'propertyShortlists',
  nameSingular: 'propertyShortlist',
  icon: 'IconHome',
  description:
    'Junction object tracking which properties a Buyer is interested in',
  skipNameField: true,
};
