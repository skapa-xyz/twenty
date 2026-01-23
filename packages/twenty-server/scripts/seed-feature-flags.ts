import { rawDataSource } from 'src/database/typeorm/raw/raw.datasource';

import { performQuery } from './utils';

// Feature flags to seed for all workspaces
const FEATURE_FLAGS = [
  { key: 'IS_UNIQUE_INDEXES_ENABLED', value: false },
  { key: 'IS_AI_ENABLED', value: true },
  { key: 'IS_APPLICATION_ENABLED', value: true },
  { key: 'IS_PAGE_LAYOUT_ENABLED', value: true },
  { key: 'IS_RECORD_PAGE_LAYOUT_ENABLED', value: false },
  { key: 'IS_PUBLIC_DOMAIN_ENABLED', value: true },
  { key: 'IS_EMAILING_DOMAIN_ENABLED', value: true },
  { key: 'IS_DASHBOARD_V2_ENABLED', value: true },
  { key: 'IS_TIMELINE_ACTIVITY_MIGRATED', value: true },
  { key: 'IS_ROW_LEVEL_PERMISSION_PREDICATES_ENABLED', value: true },
  { key: 'IS_IF_ELSE_ENABLED', value: true },
  { key: 'IS_JUNCTION_RELATIONS_ENABLED', value: true },
  { key: 'IS_SSE_DB_EVENTS_ENABLED', value: true },
  { key: 'IS_FILES_FIELD_ENABLED', value: true },
  { key: 'IS_JSON_FILTER_ENABLED', value: true },
  { key: 'IS_COMMAND_MENU_ITEM_ENABLED', value: true },
];

rawDataSource
  .initialize()
  .then(async () => {
    // Get all workspace IDs
    const workspaces = await rawDataSource.query(
      'SELECT id FROM core.workspace WHERE "deletedAt" IS NULL',
    );

    if (workspaces.length === 0) {
      console.log('No workspaces found. Skipping feature flag seeding.');
      return;
    }

    console.log(`Found ${workspaces.length} workspace(s). Seeding feature flags...`);

    for (const workspace of workspaces) {
      const workspaceId = workspace.id;
      console.log(`\nSeeding feature flags for workspace: ${workspaceId}`);

      for (const flag of FEATURE_FLAGS) {
        const query = `
          INSERT INTO core."featureFlag" (id, key, "workspaceId", value, "createdAt", "updatedAt")
          VALUES (
            uuid_generate_v4(),
            '${flag.key}',
            '${workspaceId}',
            ${flag.value},
            NOW(),
            NOW()
          )
          ON CONFLICT (key, "workspaceId") DO NOTHING
        `;

        try {
          const result = await rawDataSource.query(query);
          if (result[1] > 0) {
            console.log(`  + ${flag.key} = ${flag.value}`);
          }
        } catch (error) {
          // Check if it's a unique constraint violation (already exists)
          if (error.code === '23505') {
            // Already exists, skip
          } else {
            console.error(`  ! Failed to seed ${flag.key}: ${error.message}`);
          }
        }
      }
    }

    // Verify the flags
    const flagCount = await rawDataSource.query(
      'SELECT COUNT(*) as count FROM core."featureFlag"',
    );
    console.log(`\nTotal feature flags in database: ${flagCount[0].count}`);

    console.log('\nFeature flag seeding complete!');
  })
  .catch((err) => {
    console.error('Error during feature flag seeding:', err);
    process.exit(1);
  })
  .finally(() => {
    rawDataSource.destroy();
  });
