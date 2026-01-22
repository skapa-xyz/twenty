import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver, Float, Int, InputType, Field } from '@nestjs/graphql';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { PropertySpatialService, PropertyFilters } from '../services/property-spatial.service';
import { PropertyEntity } from '../entities/property.entity';

/**
 * Input type for filtering properties in spatial queries.
 * Allows filtering by property attributes, price range, listing status, and property types.
 */
@InputType()
export class PropertyFiltersInput {
  @Field(() => Int, { nullable: true, description: 'Minimum number of bedrooms' })
  minBedrooms?: number;

  @Field(() => Int, { nullable: true, description: 'Minimum number of bathrooms' })
  minBathrooms?: number;

  @Field(() => Int, { nullable: true, description: 'Minimum price in base currency' })
  minPrice?: number;

  @Field(() => Int, { nullable: true, description: 'Maximum price in base currency' })
  maxPrice?: number;

  @Field(() => [String], { nullable: true, description: 'Filter by listing status (e.g., on_market, off_market)' })
  listingStatus?: string[];

  @Field(() => [String], { nullable: true, description: 'Filter by property types (e.g., house, apartment, townhouse)' })
  propertyTypes?: string[];
}

/**
 * Input type for coordinate pairs used in polygon queries.
 */
@InputType()
export class CoordinateInput {
  @Field(() => Float, description: 'Longitude')
  lng: number;

  @Field(() => Float, description: 'Latitude')
  lat: number;
}

/**
 * GraphQL resolver for spatial property queries.
 * Provides three types of spatial searches:
 * 1. Radius-based search around a point
 * 2. Bounding box search within a rectangular area
 * 3. Polygon-based search within an arbitrary shape
 *
 * All queries support optional filtering by property attributes
 * and are protected by workspace authentication.
 */
@Resolver(() => PropertyEntity)
@UseGuards(WorkspaceAuthGuard)
export class PropertySpatialResolver {
  constructor(
    private readonly propertySpatialService: PropertySpatialService,
  ) {}

  /**
   * Find all properties within a specified radius from a center point.
   * Uses PostGIS ST_DWithin for efficient spatial queries.
   *
   * @param latitude - Center point latitude (WGS84)
   * @param longitude - Center point longitude (WGS84)
   * @param radiusKm - Search radius in kilometers
   * @param filters - Optional property filters (bedrooms, price, etc.)
   * @param limit - Maximum number of results (default: 100)
   * @returns Array of matching properties
   */
  @Query(() => [PropertyEntity], {
    description: 'Find properties within a radius from a center point',
  })
  async propertiesWithinRadius(
    @Args('latitude', { type: () => Float, description: 'Center latitude' }) latitude: number,
    @Args('longitude', { type: () => Float, description: 'Center longitude' }) longitude: number,
    @Args('radiusKm', { type: () => Float, description: 'Radius in kilometers' }) radiusKm: number,
    @Args('filters', { type: () => PropertyFiltersInput, nullable: true, description: 'Optional property filters' })
    filters?: PropertyFiltersInput,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 100, description: 'Maximum number of results' })
    limit?: number,
  ): Promise<PropertyEntity[]> {
    return this.propertySpatialService.findWithinRadius(
      latitude,
      longitude,
      radiusKm,
      filters as PropertyFilters,
      limit,
    );
  }

  /**
   * Find all properties within a rectangular bounding box.
   * Uses PostGIS ST_MakeEnvelope for efficient spatial queries.
   *
   * @param minLat - Southwest corner latitude (WGS84)
   * @param minLng - Southwest corner longitude (WGS84)
   * @param maxLat - Northeast corner latitude (WGS84)
   * @param maxLng - Northeast corner longitude (WGS84)
   * @param filters - Optional property filters (bedrooms, price, etc.)
   * @param limit - Maximum number of results (default: 500)
   * @returns Array of matching properties
   */
  @Query(() => [PropertyEntity], {
    description: 'Find properties within a bounding box defined by southwest and northeast corners',
  })
  async propertiesInBoundingBox(
    @Args('minLat', { type: () => Float, description: 'Southwest corner latitude' }) minLat: number,
    @Args('minLng', { type: () => Float, description: 'Southwest corner longitude' }) minLng: number,
    @Args('maxLat', { type: () => Float, description: 'Northeast corner latitude' }) maxLat: number,
    @Args('maxLng', { type: () => Float, description: 'Northeast corner longitude' }) maxLng: number,
    @Args('filters', { type: () => PropertyFiltersInput, nullable: true, description: 'Optional property filters' })
    filters?: PropertyFiltersInput,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 500, description: 'Maximum number of results' })
    limit?: number,
  ): Promise<PropertyEntity[]> {
    return this.propertySpatialService.findInBoundingBox(
      minLat,
      minLng,
      maxLat,
      maxLng,
      filters as PropertyFilters,
      limit,
    );
  }

  /**
   * Find all properties within an arbitrary polygon.
   * Uses PostGIS ST_Within for efficient spatial queries.
   *
   * @param coordinates - Array of [longitude, latitude] coordinate pairs defining the polygon.
   *                      The polygon is automatically closed (first point = last point).
   * @param filters - Optional property filters (bedrooms, price, etc.)
   * @param limit - Maximum number of results (default: 500)
   * @returns Array of matching properties
   *
   * Example coordinates: [[lng1, lat1], [lng2, lat2], [lng3, lat3]]
   */
  @Query(() => [PropertyEntity], {
    description: 'Find properties within a polygon defined by coordinate array',
  })
  async propertiesInPolygon(
    @Args('coordinates', {
      type: () => [[Float]],
      description: 'Array of [longitude, latitude] pairs defining the polygon boundary'
    })
    coordinates: [number, number][],
    @Args('filters', { type: () => PropertyFiltersInput, nullable: true, description: 'Optional property filters' })
    filters?: PropertyFiltersInput,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 500, description: 'Maximum number of results' })
    limit?: number,
  ): Promise<PropertyEntity[]> {
    return this.propertySpatialService.findInPolygon(
      coordinates,
      filters as PropertyFilters,
      limit,
    );
  }
}
