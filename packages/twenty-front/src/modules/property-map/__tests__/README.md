# Property Map Integration Tests

This directory contains comprehensive integration tests for the Property Map feature, covering component rendering, user interactions, clustering, and viewport-based data fetching.

## Test Files

### 1. PropertyMapContainer.test.tsx
Tests the main map container component functionality:
- **Component Rendering**: Verifies map renders correctly with default props
- **Data Loading**: Tests initial data fetch and loading states
- **Property Display**: Ensures properties render as GeoJSON features
- **Error Handling**: Tests graceful degradation on errors
- **Performance**: Validates efficient re-rendering behavior

### 2. PropertySelection.test.tsx
Tests property selection and interaction flows:
- **Property Selection**: Click-to-select marker functionality
- **Property Details**: Display of property information in sidebar/popup
- **Keyboard Navigation**: ESC key to close, tab navigation
- **Selection State**: Maintaining/clearing selection on viewport changes
- **Multiple Selection**: Replacing previous selection with new selection

### 3. ClusterInteraction.test.tsx
Tests clustering behavior using Supercluster:
- **Cluster Display**: Proper clustering of nearby properties
- **Cluster Visual**: Count badges, size scaling, color coding
- **Cluster Expansion**: Zoom-in behavior on cluster click
- **Performance**: Efficient clustering with large datasets (1000+ properties)
- **Edge Cases**: Boundary clusters, single-property clusters

### 4. ViewportDataFetch.test.tsx
Tests viewport-based data fetching:
- **Initial Fetch**: Data loading on component mount
- **Pan Events**: Fetching new data when user pans the map
- **Zoom Events**: Data updates on zoom level changes
- **Debouncing**: Preventing excessive API calls during rapid interactions
- **Bounds Calculation**: Correct bounding box from viewport coordinates
- **Caching**: Apollo Client caching of previously fetched data
- **Error Handling**: Retry logic and error states

## Test Utilities

### testUtils.tsx
Provides common testing utilities:
- `AllTheProviders`: Wraps components with required providers (Apollo, Recoil, Theme)
- `renderWithProviders`: Custom render function with all providers
- `createMockViewState`: Factory for viewport state objects
- `createMockBounds`: Factory for bounding box objects

### Mock Data

#### mockPropertyData.ts
- `mockProperties`: Array of 5 sample properties with complete field data
- `mockPropertyResponse`: GraphQL response structure for property queries
- `createMockProperty`: Factory function for creating test properties with custom overrides

#### mapConfig.ts (mocked)
Mocked map configuration constants to avoid import.meta.env issues in tests:
- `MAPBOX_ACCESS_TOKEN`: Test token
- `DEFAULT_CENTER`: Sydney coordinates [-33.8688, 151.2093]
- `DEFAULT_ZOOM`: 11
- `CLUSTER_RADIUS`: 50px
- `CLUSTER_MAX_ZOOM`: 14

## Running the Tests

```bash
# Run all property-map tests
npx nx test twenty-front --testPathPattern=property-map

# Run a specific test file
npx nx test twenty-front --testPathPattern=property-map/__tests__/PropertyMapContainer

# Run tests in watch mode
npx nx test twenty-front --testPathPattern=property-map --watch

# Run with coverage
npx nx test twenty-front --testPathPattern=property-map --coverage
```

## Mocking Strategy

### External Dependencies
- **react-map-gl**: Fully mocked with test-friendly implementations
  - Map component provides trigger buttons for simulating pan/zoom
  - Source, Layer, Marker components render with test IDs
  - Popup component includes close button for testing

- **Supercluster**: Mocked with controllable behavior
  - `getClusters`: Returns configurable cluster arrays
  - `getClusterExpansionZoom`: Returns preset zoom levels
  - `getLeaves`: Returns mock property features

- **mapbox-gl CSS**: Mocked to prevent import errors

### Internal Dependencies
- **usePropertyMapData**: Mocked hook returning controllable data
  - Default: Empty properties array, loading=false
  - Can be overridden per-test to simulate different states

## Test Coverage

The test suite covers:
- ✅ Component mounting and rendering
- ✅ User interactions (click, hover, keyboard)
- ✅ Data fetching and loading states
- ✅ Error handling and edge cases
- ✅ Performance with large datasets
- ✅ Clustering behavior at different zoom levels
- ✅ Viewport change triggers
- ✅ Property selection flow
- ✅ Responsive updates to data changes

## Known Limitations

1. **Map Library**: react-map-gl is fully mocked, so actual Mapbox GL JS rendering is not tested
2. **Network Layer**: GraphQL queries are mocked with MockedProvider, no actual network calls
3. **Browser APIs**: Geolocation and other browser APIs are not tested
4. **Visual Regression**: These are functional tests, not visual regression tests

## Adding New Tests

When adding new tests to this suite:

1. **Import Required Mocks**: Always include the mock setup at the top of the file
```typescript
jest.mock('../constants/mapConfig', () => require('../__mocks__/mapConfig'));
jest.mock('mapbox-gl/dist/mapbox-gl.css', () => ({}));
jest.mock('../hooks/usePropertyMapData', () => ({
  usePropertyMapData: jest.fn(() => ({
    properties: [],
    loading: false,
    error: null,
  })),
}));
```

2. **Use Test Utilities**: Import from `./testUtils` for consistent setup
3. **Create Proper Mocks**: Use `createMocks()` helper for GraphQL mocks
4. **Test User Perspective**: Focus on what users see and interact with, not implementation details
5. **Include Edge Cases**: Test error states, empty states, and boundary conditions

## Integration with CI/CD

These tests run as part of the standard Jest test suite and are included in:
- Pre-commit hooks (via husky/lint-staged)
- Pull request checks
- CI/CD pipeline (via GitHub Actions)

Test failures will block merges to main branch.

## Future Improvements

- [ ] Add visual regression tests using Storybook
- [ ] Add E2E tests using Playwright for actual map interactions
- [ ] Test with real Mapbox GL JS in a headless browser
- [ ] Add performance benchmarks for clustering large datasets
- [ ] Test with real GraphQL server using integration test database
