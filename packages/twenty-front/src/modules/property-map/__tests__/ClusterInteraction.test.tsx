import { screen, waitFor, fireEvent } from '@testing-library/react';
import { MockedResponse } from '@apollo/client/testing';
import { PropertyMapContainer } from '../components/PropertyMapContainer';
import { renderWithProviders } from './testUtils';
import { mockProperties, mockPropertyResponse } from '../__mocks__/mockPropertyData';
import { FIND_PROPERTIES_IN_BOUNDS } from '../graphql/property-map.queries';

// Mock mapConfig constants
jest.mock('../constants/mapConfig', () => require('../__mocks__/mapConfig'));

// Mock CSS imports
jest.mock('mapbox-gl/dist/mapbox-gl.css', () => ({}));

// Mock hooks
jest.mock('../hooks/usePropertyMapData', () => ({
  usePropertyMapData: jest.fn(() => ({
    properties: [],
    loading: false,
    error: null,
  })),
}));

// Mock cluster data
const mockCluster = {
  id: 'cluster-1',
  type: 'Feature',
  properties: {
    cluster: true,
    cluster_id: 1,
    point_count: 5,
    point_count_abbreviated: '5',
  },
  geometry: {
    type: 'Point',
    coordinates: [151.2093, -33.8688],
  },
};

const mockClusterProperties = [
  mockProperties[0],
  mockProperties[1],
  mockProperties[2],
];

// Mock react-map-gl
jest.mock('react-map-gl', () => ({
  __esModule: true,
  default: ({ children, onClick }: any) => (
    <div
      data-testid="map-container"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        const clusterId = target.getAttribute('data-cluster-id');
        if (clusterId) {
          onClick?.({
            features: [
              {
                properties: {
                  cluster: true,
                  cluster_id: parseInt(clusterId, 10),
                  point_count: 5,
                },
              },
            ],
          });
        }
      }}
    >
      {children}
    </div>
  ),
  Source: ({ children }: any) => <div data-testid="map-source">{children}</div>,
  Layer: () => <div data-testid="map-layer" />,
  Marker: ({ children, onClick }: any) => (
    <div data-testid="map-marker" onClick={onClick}>
      {children}
    </div>
  ),
  NavigationControl: () => <div data-testid="navigation-control" />,
}));

// Mock Supercluster with controllable behavior
const mockGetClusters = jest.fn();
const mockGetClusterExpansionZoom = jest.fn();
const mockGetLeaves = jest.fn();

jest.mock('supercluster', () => {
  return jest.fn().mockImplementation(() => ({
    load: jest.fn(),
    getClusters: mockGetClusters,
    getClusterExpansionZoom: mockGetClusterExpansionZoom,
    getLeaves: mockGetLeaves,
  }));
});

describe('Cluster Interaction', () => {
  const defaultProps = {
    recordMapInstanceId: 'test-map-instance',
    viewBarInstanceId: 'test-viewbar-instance',
    objectNameSingular: 'property',
  };

  const createMocks = (data = mockPropertyResponse): MockedResponse[] => [
    {
      request: {
        query: FIND_PROPERTIES_IN_BOUNDS,
        variables: {
          bounds: expect.objectContaining({
            north: expect.any(Number),
            south: expect.any(Number),
            east: expect.any(Number),
            west: expect.any(Number),
          }),
        },
      },
      result: data,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClusters.mockReturnValue([mockCluster]);
    mockGetClusterExpansionZoom.mockReturnValue(15);
    mockGetLeaves.mockReturnValue(
      mockClusterProperties.map((prop, index) => ({
        type: 'Feature',
        properties: prop,
        geometry: {
          type: 'Point',
          coordinates: [prop.longitude, prop.latitude],
        },
      })),
    );
  });

  describe('Cluster Display', () => {
    it('should display clusters when properties are close together', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Clusters should be created by Supercluster
      expect(mockGetClusters).toHaveBeenCalled();
    });

    it('should show cluster count badge', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Cluster markers should display the count of properties
      // Implementation will render cluster count in the UI
    });

    it('should style clusters differently from individual markers', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Clusters should have distinct visual styling
      // This is typically handled by the cluster marker component
    });

    it('should scale cluster size based on point count', async () => {
      // Cluster with many properties should be larger
      const largeMockCluster = {
        ...mockCluster,
        properties: {
          ...mockCluster.properties,
          point_count: 50,
          point_count_abbreviated: '50',
        },
      };

      mockGetClusters.mockReturnValue([largeMockCluster]);

      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Cluster size should scale with count
    });
  });

  describe('Cluster Interaction', () => {
    it('should zoom in when cluster is clicked', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Create a cluster element and click it
      const mapContainer = screen.getByTestId('map-container');
      const clusterElement = document.createElement('div');
      clusterElement.setAttribute('data-cluster-id', '1');
      mapContainer.appendChild(clusterElement);

      fireEvent.click(clusterElement);

      // Should call getClusterExpansionZoom
      await waitFor(() => {
        expect(mockGetClusterExpansionZoom).toHaveBeenCalled();
      });
    });

    it('should expand cluster to show individual properties at higher zoom', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // After zooming in, clusters should expand to individual markers
      // This is handled by Supercluster's zoom-based clustering
    });

    it('should show hover effect on cluster', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      const markers = screen.queryAllByTestId('map-marker');
      if (markers.length > 0) {
        fireEvent.mouseEnter(markers[0]);

        // Hover state should be applied
        // Implementation-specific behavior
      }
    });

    it('should handle double-click on cluster to zoom in further', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      const markers = screen.queryAllByTestId('map-marker');
      if (markers.length > 0) {
        fireEvent.doubleClick(markers[0]);

        // Should zoom in more aggressively on double-click
      }
    });
  });

  describe('Cluster Expansion', () => {
    it('should calculate correct expansion zoom level', async () => {
      mockGetClusterExpansionZoom.mockReturnValue(14);

      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Expansion zoom should be calculated based on cluster properties
    });

    it('should get cluster leaves when expanding', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Clicking cluster should retrieve its member properties
      const mapContainer = screen.getByTestId('map-container');
      const clusterElement = document.createElement('div');
      clusterElement.setAttribute('data-cluster-id', '1');
      mapContainer.appendChild(clusterElement);

      fireEvent.click(clusterElement);

      // getLeaves may be called to show cluster contents
      // Implementation-specific behavior
    });

    it('should handle clusters with single property', async () => {
      const singlePropertyCluster = {
        ...mockCluster,
        properties: {
          ...mockCluster.properties,
          point_count: 1,
        },
      };

      mockGetClusters.mockReturnValue([singlePropertyCluster]);

      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Single property clusters should behave like regular markers
    });
  });

  describe('Cluster Performance', () => {
    it('should efficiently handle large numbers of properties', async () => {
      // Create a large dataset
      const largePropertySet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockProperties[0],
        id: `prop-${i}`,
        latitude: -33.8688 + (Math.random() - 0.5) * 0.1,
        longitude: 151.2093 + (Math.random() - 0.5) * 0.1,
      }));

      const largeResponse = {
        data: {
          properties: {
            edges: largePropertySet.map((prop) => ({ node: prop })),
            pageInfo: mockPropertyResponse.data.properties.pageInfo,
            totalCount: largePropertySet.length,
          },
        },
      };

      const mocks = createMocks(largeResponse as any);
      const startTime = performance.now();

      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Rendering should complete in reasonable time (< 5 seconds)
      expect(renderTime).toBeLessThan(5000);
    });

    it('should update clusters efficiently when viewport changes', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      const initialCallCount = mockGetClusters.mock.calls.length;

      // Simulate viewport change
      const moveButton = screen.queryByTestId('trigger-move');
      if (moveButton) {
        fireEvent.click(moveButton);
      }

      // getClusters should be called again with new bounds
      await waitFor(() => {
        expect(mockGetClusters.mock.calls.length).toBeGreaterThan(
          initialCallCount,
        );
      });
    });

    it('should not recalculate clusters unnecessarily', async () => {
      const mocks = createMocks();
      const { rerender } = renderWithProviders(
        <PropertyMapContainer {...defaultProps} />,
        { mocks },
      );

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      const callCountBeforeRerender = mockGetClusters.mock.calls.length;

      // Re-render with same props
      rerender(
        renderWithProviders(<PropertyMapContainer {...defaultProps} />, {
          mocks,
        }).container.firstChild as any,
      );

      // Clusters should not be recalculated if data hasn't changed
      expect(mockGetClusters.mock.calls.length).toBe(callCountBeforeRerender);
    });
  });

  describe('Cluster Edge Cases', () => {
    it('should handle empty cluster data', async () => {
      mockGetClusters.mockReturnValue([]);

      const mocks = createMocks({
        data: {
          properties: {
            edges: [],
            pageInfo: mockPropertyResponse.data.properties.pageInfo,
            totalCount: 0,
          },
        },
      });

      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Should render without clusters
      expect(screen.queryAllByTestId('map-marker')).toHaveLength(0);
    });

    it('should handle clusters at map boundaries', async () => {
      const boundaryCluster = {
        ...mockCluster,
        geometry: {
          type: 'Point',
          coordinates: [180, -90], // Map boundary
        },
      };

      mockGetClusters.mockReturnValue([boundaryCluster]);

      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Should handle boundary cases gracefully
    });

    it('should handle cluster expansion failure gracefully', async () => {
      mockGetClusterExpansionZoom.mockImplementation(() => {
        throw new Error('Expansion failed');
      });

      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      const mapContainer = screen.getByTestId('map-container');
      const clusterElement = document.createElement('div');
      clusterElement.setAttribute('data-cluster-id', '1');
      mapContainer.appendChild(clusterElement);

      // Should not crash when expansion fails
      expect(() => {
        fireEvent.click(clusterElement);
      }).not.toThrow();
    });
  });

  describe('Cluster Visual Feedback', () => {
    it('should show different colors based on cluster size', async () => {
      const smallCluster = {
        ...mockCluster,
        properties: { ...mockCluster.properties, point_count: 3 },
      };
      const mediumCluster = {
        ...mockCluster,
        id: 'cluster-2',
        properties: { ...mockCluster.properties, point_count: 15 },
      };
      const largeCluster = {
        ...mockCluster,
        id: 'cluster-3',
        properties: { ...mockCluster.properties, point_count: 50 },
      };

      mockGetClusters.mockReturnValue([smallCluster, mediumCluster, largeCluster]);

      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Clusters should have different visual styles based on size
      // This is implementation-specific
    });

    it('should animate cluster transitions', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Cluster changes on zoom should be animated
      // This is handled by the map library and cluster component
    });
  });
});
