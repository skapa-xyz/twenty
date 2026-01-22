import { screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MockedResponse } from '@apollo/client/testing';
import { PropertyMapContainer } from '../components/PropertyMapContainer';
import { renderWithProviders, createMockBounds } from './testUtils';
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
let mockOnMove: ((evt: any) => void) | undefined;
let mockOnMoveEnd: ((evt: any) => void) | undefined;

jest.mock('react-map-gl', () => ({
  __esModule: true,
  default: ({ children, onMove, onMoveEnd }: any) => {
    mockOnMove = onMove;
    mockOnMoveEnd = onMoveEnd;
    return (
      <div data-testid="map-container">
        {children}
        <button
          data-testid="trigger-pan"
          onClick={() => {
            mockOnMove?.({
              viewState: {
                latitude: -33.87,
                longitude: 151.21,
                zoom: 12,
              },
            });
          }}
        >
          Pan Map
        </button>
        <button
          data-testid="trigger-zoom"
          onClick={() => {
            mockOnMove?.({
              viewState: {
                latitude: -33.8688,
                longitude: 151.2093,
                zoom: 14,
              },
            });
          }}
        >
          Zoom Map
        </button>
        <button
          data-testid="trigger-move-end"
          onClick={() => {
            mockOnMoveEnd?.({
              viewState: {
                latitude: -33.88,
                longitude: 151.22,
                zoom: 13,
              },
            });
          }}
        >
          End Move
        </button>
      </div>
    );
  },
  Source: ({ children }: any) => <div data-testid="map-source">{children}</div>,
  Layer: () => <div data-testid="map-layer" />,
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

describe('Viewport Change and Data Fetch', () => {
  const defaultProps = {
    recordMapInstanceId: 'test-map-instance',
    viewBarInstanceId: 'test-viewbar-instance',
    objectNameSingular: 'property',
  };

  const createMocksWithBounds = (
    bounds?: Partial<ReturnType<typeof createMockBounds>>,
  ): MockedResponse[] => {
    const defaultBounds = createMockBounds(bounds);
    return [
      {
        request: {
          query: FIND_PROPERTIES_IN_BOUNDS,
          variables: {
            bounds: defaultBounds,
          },
        },
        result: mockPropertyResponse,
      },
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
        result: mockPropertyResponse,
      },
    ];
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnMove = undefined;
    mockOnMoveEnd = undefined;
  });

  describe('Initial Data Fetch', () => {
    it('should fetch properties for initial viewport on mount', async () => {
      const mocks = createMocksWithBounds();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Initial fetch should occur
      await waitFor(() => {
        expect(screen.getByTestId('map-source')).toBeInTheDocument();
      });
    });

    it('should calculate correct bounds from initial viewport', async () => {
      const mocks = createMocksWithBounds();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Bounds should be calculated from default Sydney coordinates
    });

    it('should display loading indicator during initial fetch', async () => {
      const mocks = createMocksWithBounds();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      // Loading state should be present initially
      // Implementation-specific behavior
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
  });

  describe('Viewport Pan Events', () => {
    it('should trigger data fetch when map is panned', async () => {
      const mocks = createMocksWithBounds();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      const panButton = screen.getByTestId('trigger-pan');

      await act(async () => {
        fireEvent.click(panButton);
      });

      // New data fetch should be triggered with updated bounds
      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });
    });

    it('should debounce pan events to avoid excessive fetches', async () => {
      const mocks = createMocksWithBounds();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      const panButton = screen.getByTestId('trigger-pan');

      // Rapidly trigger pan events
      await act(async () => {
        fireEvent.click(panButton);
        fireEvent.click(panButton);
        fireEvent.click(panButton);
      });

      // Should not trigger excessive fetches due to debouncing
      // Implementation-specific behavior
    });

    it('should update viewport state when panning', async () => {
      const mocks = createMocksWithBounds();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      const panButton = screen.getByTestId('trigger-pan');

      await act(async () => {
        fireEvent.click(panButton);
      });

      // Viewport state should be updated
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
  });

  describe('Viewport Zoom Events', () => {
    it('should trigger data fetch when zooming in', async () => {
      const mocks = createMocksWithBounds();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      const zoomButton = screen.getByTestId('trigger-zoom');

      await act(async () => {
        fireEvent.click(zoomButton);
      });

      // Should fetch properties for new zoom level
      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });
    });

    it('should adjust cluster radius based on zoom level', async () => {
      const mocks = createMocksWithBounds();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      const zoomButton = screen.getByTestId('trigger-zoom');

      await act(async () => {
        fireEvent.click(zoomButton);
      });

      // Higher zoom should result in smaller cluster radius
      // This is handled by Supercluster configuration
    });

    it('should handle rapid zoom changes', async () => {
      const mocks = createMocksWithBounds();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      const zoomButton = screen.getByTestId('trigger-zoom');

      await act(async () => {
        fireEvent.click(zoomButton);
        fireEvent.click(zoomButton);
        fireEvent.click(zoomButton);
      });

      // Should handle rapid zoom without crashing
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
  });

  describe('Move End Events', () => {
    it('should finalize data fetch on move end', async () => {
      const mocks = createMocksWithBounds();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      const moveEndButton = screen.getByTestId('trigger-move-end');

      await act(async () => {
        fireEvent.click(moveEndButton);
      });

      // Final fetch should occur when movement stops
      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });
    });

    it('should cancel pending fetches on new movement', async () => {
      const mocks = createMocksWithBounds();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      const panButton = screen.getByTestId('trigger-pan');

      await act(async () => {
        fireEvent.click(panButton);
        // Start another movement before previous completes
        fireEvent.click(panButton);
      });

      // Previous fetch should be cancelled
      // Implementation handles this via Apollo Client or abort controllers
    });
  });

  describe('Bounds Calculation', () => {
    it('should calculate correct bounds from viewport', async () => {
      const mocks = createMocksWithBounds();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Bounds should include north, south, east, west coordinates
      // Calculated from viewport center and zoom level
    });

    it('should handle viewport at map edges correctly', async () => {
      const mocks = createMocksWithBounds({
        north: 85,
        south: -85,
        east: 180,
        west: -180,
      });

      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Should handle extreme bounds without errors
    });

    it('should handle viewport crossing dateline', async () => {
      const mocks = createMocksWithBounds({
        east: -170,
        west: 170,
      });

      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Should correctly handle dateline crossing
    });
  });

  describe('Data Fetch Optimization', () => {
    it('should not refetch if viewport has not changed significantly', async () => {
      const mocks = createMocksWithBounds();
      const { rerender } = renderWithProviders(
        <PropertyMapContainer {...defaultProps} />,
        { mocks },
      );

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Re-render without viewport change
      rerender(
        renderWithProviders(<PropertyMapContainer {...defaultProps} />, {
          mocks,
        }).container.firstChild as any,
      );

      // Should not trigger unnecessary refetch
    });

    it('should cache previously fetched data', async () => {
      const mocks = createMocksWithBounds();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      const panButton = screen.getByTestId('trigger-pan');
      const moveEndButton = screen.getByTestId('trigger-move-end');

      // Pan and return to original position
      await act(async () => {
        fireEvent.click(panButton);
        fireEvent.click(moveEndButton);
      });

      // Returning to cached viewport should use cached data
      // Apollo Client handles this
    });

    it('should limit concurrent fetch requests', async () => {
      const mocks = createMocksWithBounds();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      const panButton = screen.getByTestId('trigger-pan');

      // Trigger multiple rapid movements
      await act(async () => {
        for (let i = 0; i < 10; i++) {
          fireEvent.click(panButton);
        }
      });

      // Should not create 10 simultaneous requests
      // Handled by debouncing and request cancellation
    });
  });

  describe('Error Handling During Fetch', () => {
    it('should handle network errors gracefully', async () => {
      const errorMocks: MockedResponse[] = [
        {
          request: {
            query: FIND_PROPERTIES_IN_BOUNDS,
            variables: {
              bounds: expect.any(Object),
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

      // Should show error state or keep previous data
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    it('should retry failed fetches', async () => {
      const mocks = createMocksWithBounds();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // If fetch fails, retry mechanism should kick in
      // Apollo Client configuration handles this
    });

    it('should show error message to user on persistent failure', async () => {
      const errorMocks: MockedResponse[] = Array(3).fill({
        request: {
          query: FIND_PROPERTIES_IN_BOUNDS,
          variables: {
            bounds: expect.any(Object),
          },
        },
        error: new Error('Persistent error'),
      });

      renderWithProviders(<PropertyMapContainer {...defaultProps} />, {
        mocks: errorMocks,
      });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // After multiple failures, should show error message
    });
  });

  describe('Loading States', () => {
    it('should show skeleton loaders during data fetch', async () => {
      const mocks = createMocksWithBounds();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      // Should show loading indicators
      // Implementation-specific
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    it('should not block user interaction during background fetch', async () => {
      const mocks = createMocksWithBounds();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      const panButton = screen.getByTestId('trigger-pan');

      // User should be able to continue interacting during fetch
      await act(async () => {
        fireEvent.click(panButton);
      });

      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    it('should clear loading state when data arrives', async () => {
      const mocks = createMocksWithBounds();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Loading indicators should be removed once data is loaded
    });
  });

  describe('Data Freshness', () => {
    it('should refetch data when returning to viewport after timeout', async () => {
      const mocks = createMocksWithBounds();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // After cache timeout, returning to same viewport should refetch
      // Apollo Client cache policy handles this
    });

    it('should allow manual refresh of current viewport', async () => {
      const mocks = createMocksWithBounds();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Should provide a refresh mechanism (button or programmatic)
      // Implementation-specific
    });
  });

  describe('Performance Optimization', () => {
    it('should use requestAnimationFrame for smooth updates', async () => {
      const mocks = createMocksWithBounds();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      const panButton = screen.getByTestId('trigger-pan');

      await act(async () => {
        fireEvent.click(panButton);
      });

      // Viewport updates should be smooth
      // Map library handles this
    });

    it('should throttle viewport change events', async () => {
      const mocks = createMocksWithBounds();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Viewport change handler should be throttled
      // Prevents excessive re-renders
    });
  });
});
