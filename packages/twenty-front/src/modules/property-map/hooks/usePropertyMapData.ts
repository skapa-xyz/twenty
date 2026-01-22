import { useQuery } from '@apollo/client';
import { useMemo } from 'react';
import { useDebounce } from 'use-debounce';

import { FIND_PROPERTIES_IN_BOUNDS } from '@/property-map/graphql/property-map.queries';
import type {
  BoundingBox,
  Property,
} from '@/property-map/types/property-map.types';

export interface UsePropertyMapDataResult {
  properties: Property[];
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

/**
 * Hook to fetch properties within the current map viewport
 * Debounces bounds changes to avoid excessive queries during pan/zoom
 *
 * @param bounds - The current map viewport bounding box
 * @returns Object containing properties array, loading state, error, and refetch function
 */
export const usePropertyMapData = (
  bounds: BoundingBox | null,
): UsePropertyMapDataResult => {
  // Debounce bounds changes to avoid excessive queries during pan/zoom
  const [debouncedBounds] = useDebounce(bounds, 300);

  const { data, loading, error, refetch } = useQuery(
    FIND_PROPERTIES_IN_BOUNDS,
    {
      variables: debouncedBounds
        ? {
            bounds: {
              minLat: debouncedBounds.minLat,
              maxLat: debouncedBounds.maxLat,
              minLng: debouncedBounds.minLng,
              maxLng: debouncedBounds.maxLng,
            },
          }
        : undefined,
      skip: !debouncedBounds,
      fetchPolicy: 'cache-and-network',
    },
  );

  const properties = useMemo<Property[]>(() => {
    if (!data?.propertiesInBoundingBox) {
      return [];
    }

    // GraphQL returns properties directly (not wrapped in edges/nodes)
    return data.propertiesInBoundingBox as Property[];
  }, [data]);

  return {
    properties,
    loading,
    error: error as Error | undefined,
    refetch,
  };
};
