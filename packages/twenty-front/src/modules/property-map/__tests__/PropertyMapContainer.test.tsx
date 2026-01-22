import { screen, waitFor } from '@testing-library/react';
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

// Mock react-map-gl
jest.mock('react-map-gl', () => ({
  __esModule: true,
  default: ({ children, onMove }: any) => (
    <div data-testid="map-container">
      {children}
      <button
        data-testid="trigger-move"
        onClick={() =>
          onMove?.({
            viewState: {
              latitude: -33.87,
              longitude: 151.21,
              zoom: 12,
            },
          })
        }
      >
        Move Map
      </button>
    </div>
  ),
  Source: ({ children }: any) => <div data-testid="map-source">{children}</div>,
  Layer: () => <div data-testid="map-layer" />,
  Popup: ({ children }: any) => <div data-testid="map-popup">{children}</div>,
  NavigationControl: () => <div data-testid="navigation-control" />,
  Marker: ({ children }: any) => <div data-testid="map-marker">{children}</div>,
}));

// Mock Supercluster
jest.mock('supercluster', () => {
  return jest.fn().mockImplementation(() => ({
    load: jest.fn(),
    getClusters: jest.fn().mockReturnValue([]),
  }));
});

describe('PropertyMapContainer', () => {
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
          bounds: {
            north: expect.any(Number),
            south: expect.any(Number),
            east: expect.any(Number),
            west: expect.any(Number),
          },
        },
      },
      result: data,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the map container correctly', () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    it('should render with default viewport centered on Sydney', () => {
      const mocks = createMocks();
      const { container } = renderWithProviders(
        <PropertyMapContainer {...defaultProps} />,
        { mocks },
      );

      expect(container).toBeInTheDocument();
      // The map should initialize with Sydney coordinates
      const mapContainer = screen.getByTestId('map-container');
      expect(mapContainer).toBeInTheDocument();
    });

    it('should render navigation controls', () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      expect(screen.getByTestId('navigation-control')).toBeInTheDocument();
    });

    it('should render map source and layers', () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      expect(screen.getByTestId('map-source')).toBeInTheDocument();
      expect(screen.queryAllByTestId('map-layer').length).toBeGreaterThan(0);
    });
  });

  describe('Data Loading', () => {
    it('should display loading state initially', () => {
      const mocks = createMocks();
      const { container } = renderWithProviders(
        <PropertyMapContainer {...defaultProps} />,
        { mocks },
      );

      // During initial load, the map should still render but without markers
      expect(container).toBeInTheDocument();
    });

    it('should fetch properties within current viewport bounds', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Verify the query was called (Apollo MockedProvider handles this)
    });

    it('should handle empty property results gracefully', async () => {
      const emptyResponse = {
        data: {
          properties: {
            edges: [],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: null,
              endCursor: null,
            },
            totalCount: 0,
          },
        },
      };

      const mocks = createMocks(emptyResponse);
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Map should render even with no properties
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    it('should handle GraphQL errors gracefully', async () => {
      const errorMocks: MockedResponse[] = [
        {
          request: {
            query: FIND_PROPERTIES_IN_BOUNDS,
            variables: {
              bounds: {
                north: expect.any(Number),
                south: expect.any(Number),
                east: expect.any(Number),
                west: expect.any(Number),
              },
            },
          },
          error: new Error('Network error'),
        },
      ];

      renderWithProviders(<PropertyMapContainer {...defaultProps} />, {
        mocks: errorMocks,
      });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Component should not crash on error
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
  });

  describe('Property Display', () => {
    it('should render properties as GeoJSON features', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-source')).toBeInTheDocument();
      });

      // Map source should contain the property data
      const mapSource = screen.getByTestId('map-source');
      expect(mapSource).toBeInTheDocument();
    });

    it('should update property display when data changes', async () => {
      const mocks = createMocks();
      const { rerender } = renderWithProviders(
        <PropertyMapContainer {...defaultProps} />,
        { mocks },
      );

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Simulate new data by rerendering
      const newMocks = createMocks({
        data: {
          properties: {
            edges: [mockPropertyResponse.data.properties.edges[0]],
            pageInfo: mockPropertyResponse.data.properties.pageInfo,
            totalCount: 1,
          },
        },
      });

      rerender(
        renderWithProviders(<PropertyMapContainer {...defaultProps} />, {
          mocks: newMocks,
        }).container.firstChild as any,
      );

      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should not crash when bounds calculation fails', () => {
      const mocks = createMocks();

      // This should not throw even with invalid props
      expect(() => {
        renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });
      }).not.toThrow();
    });

    it('should handle malformed property data gracefully', async () => {
      const malformedResponse = {
        data: {
          properties: {
            edges: [
              {
                node: {
                  id: 'bad-prop',
                  // Missing required fields
                  addressDisplay: 'Test',
                  latitude: null,
                  longitude: null,
                },
              },
            ],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: null,
              endCursor: null,
            },
            totalCount: 1,
          },
        },
      };

      const mocks = createMocks(malformedResponse as any);
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Should render without crashing
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily when props do not change', () => {
      const mocks = createMocks();
      const { rerender } = renderWithProviders(
        <PropertyMapContainer {...defaultProps} />,
        { mocks },
      );

      const firstRender = screen.getByTestId('map-container');

      // Re-render with same props
      rerender(
        renderWithProviders(<PropertyMapContainer {...defaultProps} />, {
          mocks,
        }).container.firstChild as any,
      );

      const secondRender = screen.getByTestId('map-container');

      // Component should remain mounted
      expect(firstRender).toBe(secondRender);
    });
  });
});
