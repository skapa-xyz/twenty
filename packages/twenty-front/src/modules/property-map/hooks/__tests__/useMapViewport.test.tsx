import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { RecoilRoot, useRecoilValue } from 'recoil';

import { useMapViewport } from '@/property-map/hooks/useMapViewport';
import { mapViewportState } from '@/property-map/states/mapViewportState';
import { mapBoundsState } from '@/property-map/states/mapBoundsState';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <RecoilRoot>{children}</RecoilRoot>
);

const renderHooks = () => {
  const { result } = renderHook(
    () => {
      const mapViewport = useMapViewport();
      const viewport = useRecoilValue(mapViewportState);
      const bounds = useRecoilValue(mapBoundsState);

      return {
        mapViewport,
        viewport,
        bounds,
      };
    },
    {
      wrapper: Wrapper,
    },
  );
  return { result };
};

describe('useMapViewport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default Sydney viewport', () => {
    const { result } = renderHooks();

    expect(result.current.viewport).toEqual({
      latitude: -33.8688,
      longitude: 151.2093,
      zoom: 11,
    });
  });

  it('should calculate bounds from initial viewport', () => {
    const { result } = renderHooks();

    expect(result.current.bounds).not.toBeNull();
    expect(result.current.bounds).toHaveProperty('minLat');
    expect(result.current.bounds).toHaveProperty('maxLat');
    expect(result.current.bounds).toHaveProperty('minLng');
    expect(result.current.bounds).toHaveProperty('maxLng');
  });

  it('should update viewport programmatically', () => {
    const { result } = renderHooks();

    act(() => {
      result.current.mapViewport.setViewport({
        latitude: -37.8136,
        longitude: 144.9631,
        zoom: 12,
      });
    });

    expect(result.current.viewport).toEqual({
      latitude: -37.8136,
      longitude: 144.9631,
      zoom: 12,
    });
  });

  it('should handle partial viewport updates', () => {
    const { result } = renderHooks();

    act(() => {
      result.current.mapViewport.setViewport({
        zoom: 14,
      });
    });

    expect(result.current.viewport).toEqual({
      latitude: -33.8688,
      longitude: 151.2093,
      zoom: 14,
    });
  });

  it('should update bounds when viewport changes', () => {
    const { result } = renderHooks();

    const initialBounds = result.current.bounds;

    act(() => {
      result.current.mapViewport.setViewport({
        zoom: 15,
      });
    });

    expect(result.current.bounds).not.toEqual(initialBounds);
  });

  it('should handle viewport change events from map', () => {
    const { result } = renderHooks();

    const mockEvent = {
      viewState: {
        latitude: -27.4698,
        longitude: 153.0251,
        zoom: 13,
        bearing: 0,
        pitch: 0,
        padding: { top: 0, bottom: 0, left: 0, right: 0 },
      },
      target: {} as any,
      type: 'move',
      originalEvent: {} as any,
    };

    act(() => {
      result.current.mapViewport.handleViewportChange(mockEvent);
    });

    expect(result.current.viewport).toEqual({
      latitude: -27.4698,
      longitude: 153.0251,
      zoom: 13,
    });
  });

  it('should calculate correct bounds for different zoom levels', () => {
    const { result } = renderHooks();

    // Zoom out (should have larger bounds)
    act(() => {
      result.current.mapViewport.setViewport({
        latitude: 0,
        longitude: 0,
        zoom: 1,
      });
    });

    const zoomLevel1Bounds = result.current.bounds;
    const zoomLevel1Range =
      zoomLevel1Bounds!.maxLat - zoomLevel1Bounds!.minLat;

    // Zoom in (should have smaller bounds)
    act(() => {
      result.current.mapViewport.setViewport({
        latitude: 0,
        longitude: 0,
        zoom: 10,
      });
    });

    const zoomLevel10Bounds = result.current.bounds;
    const zoomLevel10Range =
      zoomLevel10Bounds!.maxLat - zoomLevel10Bounds!.minLat;

    expect(zoomLevel1Range).toBeGreaterThan(zoomLevel10Range);
  });
});
