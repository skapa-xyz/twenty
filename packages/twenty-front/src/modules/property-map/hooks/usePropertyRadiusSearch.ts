import { useQuery } from '@apollo/client';
import { PROPERTIES_WITHIN_RADIUS } from '../graphql/queries';
import type { Property } from '../types/property-map.types';
import type { PropertyFilters } from './usePropertyMapData';

export interface UsePropertyRadiusSearchOptions {
  lat: number;
  lng: number;
  radiusKm: number;
  filters?: PropertyFilters;
  limit?: number;
  skip?: boolean;
}

export interface UsePropertyRadiusSearchResult {
  properties: Property[];
  loading: boolean;
  error?: Error;
  refetch: () => void;
}

/**
 * Hook to fetch properties within a radius from a center point
 * Useful for "search near me" or location-based property searches
 *
 * @param options - Search parameters including center point, radius, and filters
 * @returns Property data, loading state, and refetch function
 *
 * @example
 * ```typescript
 * const { properties, loading } = usePropertyRadiusSearch({
 *   lat: -33.8688,
 *   lng: 151.2093,
 *   radiusKm: 5,
 *   filters: {
 *     minBedrooms: 2,
 *     maxPrice: 800000
 *   }
 * });
 * ```
 */
export const usePropertyRadiusSearch = (
  options: UsePropertyRadiusSearchOptions,
): UsePropertyRadiusSearchResult => {
  const { lat, lng, radiusKm, filters, limit = 100, skip = false } = options;

  const { data, loading, error, refetch } = useQuery(PROPERTIES_WITHIN_RADIUS, {
    variables: {
      lat,
      lng,
      radiusKm,
      filters,
      limit,
    },
    skip,
    fetchPolicy: 'cache-and-network',
  });

  return {
    properties: data?.propertiesWithinRadius ?? [],
    loading,
    error: error as Error | undefined,
    refetch,
  };
};
