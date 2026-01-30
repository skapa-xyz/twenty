import { Injectable, Logger } from '@nestjs/common';

import { FieldMetadataType, RelationType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { DataSourceService } from 'src/engine/metadata-modules/data-source/data-source.service';
import { FieldMetadataService } from 'src/engine/metadata-modules/field-metadata/services/field-metadata.service';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { buildObjectIdByNameMaps } from 'src/engine/metadata-modules/flat-object-metadata/utils/build-object-id-by-name-maps.util';
import { ObjectMetadataService } from 'src/engine/metadata-modules/object-metadata/object-metadata.service';
import { BUYER_CUSTOM_FIELD_SEEDS } from 'src/engine/workspace-manager/dev-seeder/metadata/custom-fields/constants/buyer-custom-field-seeds.constant';
import { PROPERTY_CUSTOM_FIELD_SEEDS } from 'src/engine/workspace-manager/dev-seeder/metadata/custom-fields/constants/property-custom-field-seeds.constant';
import { PROPERTY_SHORTLIST_CUSTOM_FIELD_SEEDS } from 'src/engine/workspace-manager/dev-seeder/metadata/custom-fields/constants/property-shortlist-custom-field-seeds.constant';
import { BUYER_CUSTOM_OBJECT_SEED } from 'src/engine/workspace-manager/dev-seeder/metadata/custom-objects/constants/buyer-custom-object-seed.constant';
import { PROPERTY_CUSTOM_OBJECT_SEED } from 'src/engine/workspace-manager/dev-seeder/metadata/custom-objects/constants/property-custom-object-seed.constant';
import { PROPERTY_SHORTLIST_CUSTOM_OBJECT_SEED } from 'src/engine/workspace-manager/dev-seeder/metadata/custom-objects/constants/property-shortlist-custom-object-seed.constant';
import { type FieldMetadataSeed } from 'src/engine/workspace-manager/dev-seeder/metadata/types/field-metadata-seed.type';
import { type ObjectMetadataSeed } from 'src/engine/workspace-manager/dev-seeder/metadata/types/object-metadata-seed.type';

type ObjectWithFields = {
  seed: ObjectMetadataSeed;
  fields?: FieldMetadataSeed[];
};

type JunctionFieldSeed = {
  sourceObjectName: string;
  name: string;
  label: string;
  icon: string;
  targetObjectName: string;
  targetFieldLabel: string;
  targetFieldIcon: string;
};

/**
 * Service to create Buyers Agent workflow objects (Property, Buyer, PropertyShortlist)
 * for ALL workspaces. This ensures these custom objects are available in every
 * workspace, not just the dev Apple workspace.
 */
@Injectable()
export class BuyersAgentObjectsService {
  private readonly logger = new Logger(BuyersAgentObjectsService.name);

  constructor(
    private readonly objectMetadataService: ObjectMetadataService,
    private readonly fieldMetadataService: FieldMetadataService,
    private readonly flatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
    private readonly dataSourceService: DataSourceService,
  ) {}

  /**
   * Objects to be created for Buyers Agent workflow
   */
  private readonly objects: ObjectWithFields[] = [
    {
      seed: PROPERTY_CUSTOM_OBJECT_SEED,
      fields: PROPERTY_CUSTOM_FIELD_SEEDS,
    },
    {
      seed: BUYER_CUSTOM_OBJECT_SEED,
      fields: BUYER_CUSTOM_FIELD_SEEDS,
    },
    {
      seed: PROPERTY_SHORTLIST_CUSTOM_OBJECT_SEED,
      fields: PROPERTY_SHORTLIST_CUSTOM_FIELD_SEEDS,
    },
  ];

  /**
   * Junction field relations for the Buyers Agent workflow
   */
  private readonly junctionFields: JunctionFieldSeed[] = [
    // Buyer -> PropertyShortlist
    {
      sourceObjectName: BUYER_CUSTOM_OBJECT_SEED.nameSingular,
      name: 'shortlistedProperties',
      label: 'Shortlisted Properties',
      icon: 'IconHome',
      targetObjectName: PROPERTY_SHORTLIST_CUSTOM_OBJECT_SEED.nameSingular,
      targetFieldLabel: 'Buyer',
      targetFieldIcon: 'IconUserDollar',
    },
    // Property -> PropertyShortlist (inverse side)
    {
      sourceObjectName: PROPERTY_CUSTOM_OBJECT_SEED.nameSingular,
      name: 'interestedBuyers',
      label: 'Interested Buyers',
      icon: 'IconUserDollar',
      targetObjectName: PROPERTY_SHORTLIST_CUSTOM_OBJECT_SEED.nameSingular,
      targetFieldLabel: 'Property',
      targetFieldIcon: 'IconHome',
    },
    // Buyer -> Opportunity
    {
      sourceObjectName: BUYER_CUSTOM_OBJECT_SEED.nameSingular,
      name: 'opportunities',
      label: 'Opportunities',
      icon: 'IconTargetArrow',
      targetObjectName: 'opportunity',
      targetFieldLabel: 'Buyer',
      targetFieldIcon: 'IconUserDollar',
    },
    // Buyer -> Person (primary contact)
    {
      sourceObjectName: BUYER_CUSTOM_OBJECT_SEED.nameSingular,
      name: 'primaryContact',
      label: 'Primary Contact',
      icon: 'IconUser',
      targetObjectName: 'person',
      targetFieldLabel: 'Buyer Account',
      targetFieldIcon: 'IconUserDollar',
    },
    // Buyer -> Company
    {
      sourceObjectName: BUYER_CUSTOM_OBJECT_SEED.nameSingular,
      name: 'company',
      label: 'Company',
      icon: 'IconBuilding',
      targetObjectName: 'company',
      targetFieldLabel: 'Buyers',
      targetFieldIcon: 'IconUserDollar',
    },
  ];

  /**
   * Ensures all Buyers Agent objects exist for a given workspace.
   * Creates them if they don't exist, skips if they already do.
   */
  async ensureObjectsExist(workspaceId: string): Promise<void> {
    this.logger.log(
      `Ensuring Buyers Agent objects exist for workspace ${workspaceId}`,
    );

    // Get the data source for this workspace
    const dataSource =
      await this.dataSourceService.getLastDataSourceMetadataFromWorkspaceIdOrFail(
        workspaceId,
      );

    // Get current object metadata maps
    const { flatObjectMetadataMaps } =
      await this.flatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId,
          flatMapsKeys: ['flatObjectMetadataMaps'],
        },
      );

    const { idByNameSingular } = buildObjectIdByNameMaps(
      flatObjectMetadataMaps,
    );

    // Create objects (fields are created in a separate pass after cache refresh)
    for (const { seed } of this.objects) {
      const existingObjectId = idByNameSingular[seed.nameSingular];

      if (isDefined(existingObjectId)) {
        this.logger.log(
          `Object "${seed.nameSingular}" already exists, skipping`,
        );
        continue;
      }

      this.logger.log(`Creating object "${seed.nameSingular}"...`);

      try {
        await this.objectMetadataService.createOneObject({
          createObjectInput: {
            labelPlural: seed.labelPlural,
            labelSingular: seed.labelSingular,
            namePlural: seed.namePlural,
            nameSingular: seed.nameSingular,
            icon: seed.icon,
            description: seed.description ?? `A ${seed.labelSingular}`,
            dataSourceId: dataSource.id,
          },
          workspaceId,
        });

        this.logger.log(`Created object "${seed.nameSingular}"`);
      } catch (error) {
        this.logger.error(
          `Failed to create object "${seed.nameSingular}": ${error.message}`,
        );
        throw error;
      }
    }

    // Invalidate cache after object creation
    await this.flatEntityMapsCacheService.invalidateFlatEntityMaps({
      workspaceId,
    });

    // Refresh the maps with new objects
    const refreshedMaps =
      await this.flatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId,
          flatMapsKeys: ['flatObjectMetadataMaps', 'flatFieldMetadataMaps'],
        },
      );

    const { idByNameSingular: refreshedIdByName } = buildObjectIdByNameMaps(
      refreshedMaps.flatObjectMetadataMaps,
    );

    // Create fields for each object
    for (const { seed, fields } of this.objects) {
      if (!fields?.length) continue;

      const objectId = refreshedIdByName[seed.nameSingular];

      if (!isDefined(objectId)) {
        this.logger.warn(
          `Object "${seed.nameSingular}" not found after creation, skipping fields`,
        );
        continue;
      }

      for (const fieldSeed of fields) {
        await this.createFieldIfNotExists(
          workspaceId,
          objectId,
          fieldSeed,
          refreshedMaps.flatFieldMetadataMaps,
        );
      }
    }

    // Create junction relations
    await this.createJunctionRelations(workspaceId);

    this.logger.log(
      `Successfully ensured Buyers Agent objects for workspace ${workspaceId}`,
    );
  }

  private async createFieldIfNotExists(
    workspaceId: string,
    objectMetadataId: string,
    fieldSeed: FieldMetadataSeed,
    flatFieldMetadataMaps: {
      byId: Record<
        string,
        { name: string; objectMetadataId: string } | undefined
      >;
    },
  ): Promise<void> {
    // Check if field already exists on this object
    const existingField = Object.values(flatFieldMetadataMaps.byId)
      .filter(isDefined)
      .find(
        (f) =>
          f.objectMetadataId === objectMetadataId && f.name === fieldSeed.name,
      );

    if (isDefined(existingField)) {
      this.logger.debug(`Field "${fieldSeed.name}" already exists, skipping`);

      return;
    }

    this.logger.log(`Creating field "${fieldSeed.name}"...`);

    try {
      await this.fieldMetadataService.createOneField({
        createFieldInput: {
          type: fieldSeed.type,
          name: fieldSeed.name,
          label: fieldSeed.label,
          icon: fieldSeed.icon ?? 'IconList',
          objectMetadataId,
          defaultValue: fieldSeed.defaultValue,
          options: fieldSeed.options,
        },
        workspaceId,
      });

      this.logger.log(`Created field "${fieldSeed.name}"`);
    } catch (error) {
      this.logger.error(
        `Failed to create field "${fieldSeed.name}": ${error.message}`,
      );
      // Don't throw - continue with other fields
    }
  }

  private async createJunctionRelations(workspaceId: string): Promise<void> {
    // Invalidate and refresh cache
    await this.flatEntityMapsCacheService.invalidateFlatEntityMaps({
      workspaceId,
    });

    const { flatObjectMetadataMaps, flatFieldMetadataMaps } =
      await this.flatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId,
          flatMapsKeys: ['flatObjectMetadataMaps', 'flatFieldMetadataMaps'],
        },
      );

    const { idByNameSingular } = buildObjectIdByNameMaps(
      flatObjectMetadataMaps,
    );

    for (const junctionField of this.junctionFields) {
      const sourceObjectId = idByNameSingular[junctionField.sourceObjectName];
      const targetObjectId = idByNameSingular[junctionField.targetObjectName];

      if (!isDefined(sourceObjectId) || !isDefined(targetObjectId)) {
        this.logger.warn(
          `Source or target object not found for junction field "${junctionField.name}"`,
        );
        continue;
      }

      // Check if relation already exists
      const existingField = Object.values(flatFieldMetadataMaps.byId)
        .filter(isDefined)
        .find(
          (f) =>
            f.objectMetadataId === sourceObjectId &&
            f.name === junctionField.name,
        );

      if (isDefined(existingField)) {
        this.logger.debug(
          `Junction field "${junctionField.name}" already exists, skipping`,
        );
        continue;
      }

      this.logger.log(`Creating junction relation "${junctionField.name}"...`);

      try {
        await this.fieldMetadataService.createOneField({
          createFieldInput: {
            type: FieldMetadataType.RELATION,
            name: junctionField.name,
            label: junctionField.label,
            icon: junctionField.icon,
            objectMetadataId: sourceObjectId,
            relationCreationPayload: {
              type: RelationType.ONE_TO_MANY,
              targetObjectMetadataId: targetObjectId,
              targetFieldLabel: junctionField.targetFieldLabel,
              targetFieldIcon: junctionField.targetFieldIcon,
            },
          },
          workspaceId,
        });

        this.logger.log(`Created junction relation "${junctionField.name}"`);
      } catch (error) {
        this.logger.error(
          `Failed to create junction relation "${junctionField.name}": ${error.message}`,
        );
        // Don't throw - continue with other relations
      }
    }
  }
}
