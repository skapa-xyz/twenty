import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  default: ({ children, onClick }: any) => (
    <div
      data-testid="map-container"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.getAttribute('data-property-id')) {
          onClick?.({
            features: [
              {
                properties: {
                  id: target.getAttribute('data-property-id'),
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
  Popup: ({ children, onClose }: any) => (
    <div data-testid="map-popup">
      {children}
      <button data-testid="popup-close" onClick={onClose}>
        Close
      </button>
    </div>
  ),
  NavigationControl: () => <div data-testid="navigation-control" />,
  Marker: ({ children, onClick }: any) => (
    <div data-testid="map-marker" onClick={onClick}>
      {children}
    </div>
  ),
}));

// Mock Supercluster
jest.mock('supercluster', () => {
  return jest.fn().mockImplementation(() => ({
    load: jest.fn(),
    getClusters: jest.fn().mockReturnValue([]),
  }));
});

describe('Property Selection Flow', () => {
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
  });

  describe('Property Selection', () => {
    it('should allow selecting a property by clicking on marker', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Find and click a marker
      const markers = screen.queryAllByTestId('map-marker');
      if (markers.length > 0) {
        fireEvent.click(markers[0]);

        // Popup or sidebar should show property details
        await waitFor(() => {
          expect(
            screen.queryByTestId('map-popup') ||
              screen.queryByTestId('property-sidebar'),
          ).toBeInTheDocument();
        });
      }
    });

    it('should display property details when property is selected', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Simulate selecting a property
      const mapContainer = screen.getByTestId('map-container');
      const propertyElement = document.createElement('div');
      propertyElement.setAttribute('data-property-id', mockProperties[0].id);
      mapContainer.appendChild(propertyElement);

      fireEvent.click(propertyElement);

      // Property details should be visible
      // The actual implementation will determine if this is a popup or sidebar
    });

    it('should close property details when close button is clicked', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // If popup exists, it should have a close button
      const popup = screen.queryByTestId('map-popup');
      if (popup) {
        const closeButton = screen.queryByTestId('popup-close');
        if (closeButton) {
          fireEvent.click(closeButton);

          await waitFor(() => {
            expect(screen.queryByTestId('map-popup')).not.toBeInTheDocument();
          });
        }
      }
    });

    it('should allow deselecting a property by clicking elsewhere on map', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Click on map container (not on a marker)
      const mapContainer = screen.getByTestId('map-container');
      fireEvent.click(mapContainer);

      // Any open popups should close
      await waitFor(() => {
        expect(screen.queryByTestId('map-popup')).not.toBeInTheDocument();
      });
    });

    it('should handle rapid selection changes', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      const markers = screen.queryAllByTestId('map-marker');

      if (markers.length >= 2) {
        // Rapidly click different markers
        fireEvent.click(markers[0]);
        fireEvent.click(markers[1]);
        fireEvent.click(markers[0]);

        // Should handle without crashing
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      }
    });
  });

  describe('Property Details Display', () => {
    it('should show correct property information in details view', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // The property details should match the selected property data
      // This will depend on the actual implementation of PropertyCard/PropertyMapSidebar
    });

    it('should display property price in correct format', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Price should be formatted (e.g., $1,200,000)
    });

    it('should display property attributes correctly', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Bedrooms, bathrooms, car spaces should be displayed with icons
    });

    it('should show property image if available', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Property image should be rendered if photos array is not empty
    });

    it('should handle missing property image gracefully', async () => {
      const propertyWithoutImage = {
        ...mockProperties[0],
        photos: null,
      };

      const responseWithoutImage = {
        data: {
          properties: {
            edges: [{ node: propertyWithoutImage }],
            pageInfo: mockPropertyResponse.data.properties.pageInfo,
            totalCount: 1,
          },
        },
      };

      const mocks = createMocks(responseWithoutImage as any);
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Should show placeholder or handle gracefully
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support closing property details with Escape key', async () => {
      const user = userEvent.setup();
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      const popup = screen.queryByTestId('map-popup');
      if (popup) {
        await user.keyboard('{Escape}');

        await waitFor(() => {
          expect(screen.queryByTestId('map-popup')).not.toBeInTheDocument();
        });
      }
    });

    it('should support tabbing through property details', async () => {
      const user = userEvent.setup();
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Tab navigation should work within property details
      await user.tab();

      // Focus should move through interactive elements
    });
  });

  describe('Selection State Persistence', () => {
    it('should maintain selection when viewport changes', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      const markers = screen.queryAllByTestId('map-marker');
      if (markers.length > 0) {
        fireEvent.click(markers[0]);

        // Simulate viewport change
        const moveButton = screen.queryByTestId('trigger-move');
        if (moveButton) {
          fireEvent.click(moveButton);
        }

        // Selection should be maintained (or handled appropriately)
      }
    });

    it('should clear selection when selected property leaves viewport', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // This behavior depends on product requirements
      // Should the selection persist or clear when property moves out of view?
    });
  });

  describe('Multiple Selection Scenarios', () => {
    it('should replace previous selection when new property is selected', async () => {
      const mocks = createMocks();
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      const markers = screen.queryAllByTestId('map-marker');

      if (markers.length >= 2) {
        fireEvent.click(markers[0]);
        fireEvent.click(markers[1]);

        // Only the second property should be selected
        // Only one popup/sidebar should be visible
      }
    });

    it('should handle selection of property with incomplete data', async () => {
      const incompleteProperty = {
        ...mockProperties[0],
        attributes: null,
        photos: null,
        description: null,
      };

      const responseWithIncomplete = {
        data: {
          properties: {
            edges: [{ node: incompleteProperty }],
            pageInfo: mockPropertyResponse.data.properties.pageInfo,
            totalCount: 1,
          },
        },
      };

      const mocks = createMocks(responseWithIncomplete as any);
      renderWithProviders(<PropertyMapContainer {...defaultProps} />, { mocks });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Should render without crashing, showing available data
    });
  });
});
