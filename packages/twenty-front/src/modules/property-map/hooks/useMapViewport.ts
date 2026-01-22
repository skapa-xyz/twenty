import { useCallback, useEffect } from 'react';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import type { ViewStateChangeEvent } from 'react-map-gl';

import { mapViewportState, type MapViewport } from '../states/mapViewportState';
import { mapBoundsState, type MapBounds } from '../states/mapBoundsState';

/**
 * Calculate bounding box coordinates from viewport center and zoom level
 * Uses Web Mercator projection approximation for viewport bounds
 */
const calculateBounds = (viewport: MapViewport): MapBounds => {
  const { latitude, longitude, zoom } = viewport;

  // Calculate approximate lat/lng ranges based on zoom level
  // At zoom level 0, the entire world is visible (360 degrees longitude, 180 degrees latitude)
  // Each zoom level halves the visible area
  const latRange = 180 / Math.pow(2, zoom);
  const lngRange = 360 / Math.pow(2, zoom);

  return {
    minLat: latitude - latRange / 2,
    maxLat: latitude + latRange / 2,
    minLng: longitude - lngRange / 2,
    maxLng: longitude + lngRange / 2,
  };
};

export const useMapViewport = () => {
  const [viewport, setViewportState] = useRecoilState(mapViewportState);
  const setBounds = useSetRecoilState(mapBoundsState);
  const bounds = useRecoilValue(mapBoundsState);

  // Update bounds whenever viewport changes
  useEffect(() => {
    const newBounds = calculateBounds(viewport);
    setBounds(newBounds);
  }, [viewport, setBounds]);

  /**
   * Update viewport state from map interaction
   * Designed to work with react-map-gl's onMove event
   */
  const handleViewportChange = useCallback(
    (event: ViewStateChangeEvent) => {
      const { latitude, longitude, zoom } = event.viewState;
      setViewportState({
        latitude,
        longitude,
        zoom,
      });
    },
    [setViewportState],
  );

  /**
   * Programmatically set viewport to specific coordinates and zoom
   */
  const setViewport = useCallback(
    (newViewport: Partial<MapViewport>) => {
      setViewportState((prev) => ({
        ...prev,
        ...newViewport,
      }));
    },
    [setViewportState],
  );

  return {
    viewport,
    bounds,
    setViewport,
    handleViewportChange,
  };
};
