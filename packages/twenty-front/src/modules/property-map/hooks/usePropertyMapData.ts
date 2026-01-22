import { useMemo } from 'react';

import type { BoundingBox, Property } from '../types/property-map.types';

/**
 * Hook to fetch properties within the current map viewport
 * TODO: Implement GraphQL query to fetch properties from backend
 *
 * @param bounds - The current map viewport bounding box
 * @returns Object containing properties array and loading state
 */
export const usePropertyMapData = (bounds: BoundingBox) => {
  // TODO: Replace with actual GraphQL query
  // const { data, loading } = useQuery(PROPERTIES_WITHIN_BOUNDS_QUERY, {
  //   variables: { bounds },
  // });

  const properties = useMemo<Property[]>(() => {
    // Stub: Return empty array for now
    // In production, this would return data from GraphQL query
    return [];
  }, []);

  const loading = false;

  return {
    properties,
    loading,
  };
};
