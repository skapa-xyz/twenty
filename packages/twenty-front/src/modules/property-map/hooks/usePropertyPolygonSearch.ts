import { useQuery } from '@apollo/client';
import { PROPERTIES_IN_POLYGON } from '../graphql/queries';
import type { Property } from '../types/property-map.types';
import type { PropertyFilters } from './usePropertyMapData';

export type PolygonCoordinate = [number, number]; // [lng, lat]

export interface UsePropertyPolygonSearchOptions {
  coordinates: PolygonCoordinate[];
  filters?: PropertyFilters;
  limit?: number;
  skip?: boolean;
}

export interface UsePropertyPolygonSearchResult {
  properties: Property[];
  loading: boolean;
  error?: Error;
  refetch: () => void;
}

/**
 * Hook to fetch properties within a custom polygon boundary
 * Useful for drawing custom search areas on the map
 *
 * @param options - Search parameters including polygon coordinates and filters
 * @returns Property data, loading state, and refetch function
 *
 * @example
 * ```typescript
 * const { properties, loading } = usePropertyPolygonSearch({
 *   coordinates: [
 *     [151.20, -33.87],
 *     [151.22, -33.87],
 *     [151.22, -33.88],
 *     [151.20, -33.88],
 *     [151.20, -33.87] // Close the polygon
 *   ],
 *   filters: {
 *     listingStatus: ['on_market']
 *   }
 * });
 * ```
 */
export const usePropertyPolygonSearch = (
  options: UsePropertyPolygonSearchOptions,
): UsePropertyPolygonSearchResult => {
  const { coordinates, filters, limit = 100, skip = false } = options;

  const { data, loading, error, refetch } = useQuery(PROPERTIES_IN_POLYGON, {
    variables: {
      coordinates,
      filters,
      limit,
    },
    skip,
    fetchPolicy: 'cache-and-network',
  });

  return {
    properties: data?.propertiesInPolygon ?? [],
    loading,
    error: error as Error | undefined,
    refetch,
  };
};
