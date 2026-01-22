import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { PropertySpatialService, PropertyFilters } from '../property-spatial.service';
import { PropertyEntity, ListingStatus } from '../../entities/property.entity';

describe('PropertySpatialService Integration', () => {
  let service: PropertySpatialService;
  let propertyRepository: Repository<PropertyEntity>;

  const SYDNEY_CBD = { lat: -33.8688, lng: 151.2093 };

  // Test fixtures
  const testProperties: Partial<PropertyEntity>[] = [
    {
      id: 'prop-1',
      addressDisplay: '1 George St, Sydney NSW 2000',
      addressSuburb: 'Sydney',
      location: {
        type: 'Point',
        coordinates: [151.2093, -33.8688],
      },
      workspaceId: 'test-workspace-id',
      listingStatus: ListingStatus.ON_MARKET,
      attributes: { bedrooms: 3, bathrooms: 2 },
      deletedAt: null,
    },
    {
      id: 'prop-2',
      addressDisplay: '100 Pitt St, Sydney NSW 2000',
      addressSuburb: 'Sydney',
      location: {
        type: 'Point',
        coordinates: [151.2100, -33.8700],
      },
      workspaceId: 'test-workspace-id',
      listingStatus: ListingStatus.ON_MARKET,
      attributes: { bedrooms: 2, bathrooms: 1 },
      deletedAt: null,
    },
    {
      id: 'prop-3',
      addressDisplay: '1 Main St, Parramatta NSW 2150',
      addressSuburb: 'Parramatta',
      location: {
        type: 'Point',
        coordinates: [151.0011, -33.8150],
      },
      workspaceId: 'test-workspace-id',
      listingStatus: ListingStatus.ON_MARKET,
      attributes: { bedrooms: 4, bathrooms: 3 },
      deletedAt: null,
    },
    {
      id: 'prop-deleted',
      addressDisplay: '50 Deleted St, Sydney NSW 2000',
      addressSuburb: 'Sydney',
      location: {
        type: 'Point',
        coordinates: [151.2093, -33.8688],
      },
      workspaceId: 'test-workspace-id',
      listingStatus: ListingStatus.ON_MARKET,
      attributes: { bedrooms: 3, bathrooms: 2 },
      deletedAt: new Date('2025-01-01'),
    },
  ];

  // Mock query builder factory
  const createMockQueryBuilder = (mockResults: any[] = []): Partial<SelectQueryBuilder<PropertyEntity>> => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(mockResults),
  });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertySpatialService,
        {
          provide: getRepositoryToken(PropertyEntity),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PropertySpatialService>(PropertySpatialService);
    propertyRepository = module.get(getRepositoryToken(PropertyEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findWithinRadius', () => {
    it('should return properties within specified radius', async () => {
      const mockBuilder = createMockQueryBuilder([
        testProperties[0],
        testProperties[1],
      ]);

      jest.spyOn(propertyRepository, 'createQueryBuilder').mockReturnValue(
        mockBuilder as SelectQueryBuilder<PropertyEntity>
      );

      const results = await service.findWithinRadius(
        SYDNEY_CBD.lat,
        SYDNEY_CBD.lng,
        5, // 5km radius
      );

      expect(results.length).toBe(2);
      expect(propertyRepository.createQueryBuilder).toHaveBeenCalledWith('property');
      expect(mockBuilder.where).toHaveBeenCalledWith(
        expect.stringContaining('ST_DWithin'),
        expect.objectContaining({
          lat: SYDNEY_CBD.lat,
          lng: SYDNEY_CBD.lng,
          radiusMeters: 5000,
        })
      );
      expect(mockBuilder.andWhere).toHaveBeenCalledWith('property.deletedAt IS NULL');
    });

    it('should apply property filters correctly', async () => {
      const mockBuilder = createMockQueryBuilder([testProperties[0]]);
      jest.spyOn(propertyRepository, 'createQueryBuilder').mockReturnValue(
        mockBuilder as SelectQueryBuilder<PropertyEntity>
      );

      const filters: PropertyFilters = {
        minBedrooms: 3,
        minBathrooms: 2,
        minPrice: 500000,
        maxPrice: 1000000,
        listingStatus: [ListingStatus.ON_MARKET],
      };

      await service.findWithinRadius(
        SYDNEY_CBD.lat,
        SYDNEY_CBD.lng,
        5,
        filters,
      );

      expect(mockBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('bedrooms'),
        expect.objectContaining({ minBedrooms: 3 })
      );
      expect(mockBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('bathrooms'),
        expect.objectContaining({ minBathrooms: 2 })
      );
      expect(mockBuilder.andWhere).toHaveBeenCalledWith(
        'property.askingPrice >= :minPrice',
        { minPrice: 500000 }
      );
      expect(mockBuilder.andWhere).toHaveBeenCalledWith(
        'property.askingPrice <= :maxPrice',
        { maxPrice: 1000000 }
      );
    });

    it('should exclude deleted properties', async () => {
      const mockBuilder = createMockQueryBuilder([
        testProperties[0],
        testProperties[1],
      ]);
      jest.spyOn(propertyRepository, 'createQueryBuilder').mockReturnValue(
        mockBuilder as SelectQueryBuilder<PropertyEntity>
      );

      await service.findWithinRadius(
        SYDNEY_CBD.lat,
        SYDNEY_CBD.lng,
        5,
      );

      expect(mockBuilder.andWhere).toHaveBeenCalledWith('property.deletedAt IS NULL');
    });

    it('should return empty array when no properties in radius', async () => {
      const mockBuilder = createMockQueryBuilder([]);
      jest.spyOn(propertyRepository, 'createQueryBuilder').mockReturnValue(
        mockBuilder as SelectQueryBuilder<PropertyEntity>
      );

      const results = await service.findWithinRadius(
        0, 0, // Middle of ocean
        1,
      );

      expect(results).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      const mockBuilder = createMockQueryBuilder(
        Array.from({ length: 50 }, (_, i) => ({
          ...testProperties[0],
          id: `prop-${i}`,
        }))
      );
      jest.spyOn(propertyRepository, 'createQueryBuilder').mockReturnValue(
        mockBuilder as SelectQueryBuilder<PropertyEntity>
      );

      await service.findWithinRadius(
        SYDNEY_CBD.lat,
        SYDNEY_CBD.lng,
        50,
        undefined,
        50, // limit
      );

      expect(mockBuilder.limit).toHaveBeenCalledWith(50);
    });

    it('should add distance calculation in SELECT', async () => {
      const mockBuilder = createMockQueryBuilder([testProperties[0]]);
      jest.spyOn(propertyRepository, 'createQueryBuilder').mockReturnValue(
        mockBuilder as SelectQueryBuilder<PropertyEntity>
      );

      await service.findWithinRadius(
        SYDNEY_CBD.lat,
        SYDNEY_CBD.lng,
        5,
      );

      expect(mockBuilder.addSelect).toHaveBeenCalledWith(
        expect.stringContaining('ST_Distance'),
        'distance_km'
      );
    });

    it('should order results by distance ascending', async () => {
      const mockBuilder = createMockQueryBuilder([
        testProperties[0],
        testProperties[1],
      ]);
      jest.spyOn(propertyRepository, 'createQueryBuilder').mockReturnValue(
        mockBuilder as SelectQueryBuilder<PropertyEntity>
      );

      await service.findWithinRadius(
        SYDNEY_CBD.lat,
        SYDNEY_CBD.lng,
        5,
      );

      expect(mockBuilder.orderBy).toHaveBeenCalledWith('distance_km', 'ASC');
    });
  });

  describe('findInBoundingBox', () => {
    it('should return properties within bounding box', async () => {
      const mockBuilder = createMockQueryBuilder([
        testProperties[0],
        testProperties[1],
      ]);
      jest.spyOn(propertyRepository, 'createQueryBuilder').mockReturnValue(
        mockBuilder as SelectQueryBuilder<PropertyEntity>
      );

      const results = await service.findInBoundingBox(
        -34.0, 151.0, -33.5, 151.5, // Sydney region (minLat, minLng, maxLat, maxLng)
      );

      expect(results.length).toBe(2);
      expect(mockBuilder.where).toHaveBeenCalledWith(
        expect.stringContaining('ST_MakeEnvelope'),
        expect.objectContaining({
          minLat: -34.0,
          minLng: 151.0,
          maxLat: -33.5,
          maxLng: 151.5,
        })
      );
    });

    it('should handle very small bounding box', async () => {
      const mockBuilder = createMockQueryBuilder([testProperties[0]]);
      jest.spyOn(propertyRepository, 'createQueryBuilder').mockReturnValue(
        mockBuilder as SelectQueryBuilder<PropertyEntity>
      );

      const results = await service.findInBoundingBox(
        -33.869, 151.209, -33.868, 151.210,
      );

      expect(results.length).toBeLessThanOrEqual(1);
      expect(mockBuilder.where).toHaveBeenCalled();
    });

    it('should apply filters to bounding box query', async () => {
      const mockBuilder = createMockQueryBuilder([testProperties[0]]);
      jest.spyOn(propertyRepository, 'createQueryBuilder').mockReturnValue(
        mockBuilder as SelectQueryBuilder<PropertyEntity>
      );

      const filters: PropertyFilters = {
        minBedrooms: 3,
        propertyTypes: ['house', 'apartment'],
      };

      await service.findInBoundingBox(
        -34.0, 151.0, -33.5, 151.5,
        filters,
      );

      expect(mockBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('bedrooms'),
        expect.objectContaining({ minBedrooms: 3 })
      );
      expect(mockBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('propertyType'),
        expect.objectContaining({ types: ['house', 'apartment'] })
      );
    });

    it('should respect limit parameter for bounding box', async () => {
      const mockBuilder = createMockQueryBuilder([]);
      jest.spyOn(propertyRepository, 'createQueryBuilder').mockReturnValue(
        mockBuilder as SelectQueryBuilder<PropertyEntity>
      );

      await service.findInBoundingBox(
        -34.0, 151.0, -33.5, 151.5,
        undefined,
        200, // custom limit
      );

      expect(mockBuilder.limit).toHaveBeenCalledWith(200);
    });
  });

  describe('findInPolygon', () => {
    it('should return properties within polygon', async () => {
      const polygon: [number, number][] = [
        [151.0, -33.9],
        [151.3, -33.9],
        [151.3, -33.7],
        [151.0, -33.7],
        [151.0, -33.9], // Close the polygon
      ];

      const mockBuilder = createMockQueryBuilder([
        testProperties[0],
        testProperties[1],
      ]);
      jest.spyOn(propertyRepository, 'createQueryBuilder').mockReturnValue(
        mockBuilder as SelectQueryBuilder<PropertyEntity>
      );

      const results = await service.findInPolygon(polygon);

      expect(results.length).toBeGreaterThan(0);
      expect(mockBuilder.where).toHaveBeenCalledWith(
        expect.stringContaining('ST_Within'),
        expect.objectContaining({
          polygon: expect.stringContaining('POLYGON'),
        })
      );
    });

    it('should handle complex polygon shapes', async () => {
      const complexPolygon: [number, number][] = [
        [151.0, -33.9],
        [151.2, -33.85],
        [151.3, -33.9],
        [151.25, -33.8],
        [151.1, -33.75],
        [151.0, -33.9],
      ];

      const mockBuilder = createMockQueryBuilder([]);
      jest.spyOn(propertyRepository, 'createQueryBuilder').mockReturnValue(
        mockBuilder as SelectQueryBuilder<PropertyEntity>
      );

      const results = await service.findInPolygon(complexPolygon);

      expect(Array.isArray(results)).toBe(true);
      expect(mockBuilder.where).toHaveBeenCalledWith(
        expect.stringContaining('ST_Within'),
        expect.any(Object)
      );
    });

    it('should automatically close unclosed polygon', async () => {
      const unclosedPolygon: [number, number][] = [
        [151.0, -33.9],
        [151.3, -33.9],
        [151.3, -33.7],
        [151.0, -33.7],
        // Not closed - service should add closing point
      ];

      const mockBuilder = createMockQueryBuilder([]);
      const whereSpy = jest.spyOn(mockBuilder, 'where').mockReturnThis();

      jest.spyOn(propertyRepository, 'createQueryBuilder').mockReturnValue(
        mockBuilder as SelectQueryBuilder<PropertyEntity>
      );

      await service.findInPolygon(unclosedPolygon);

      // Verify the polygon WKT includes the closing point
      // Note: Numbers may be simplified (151.0 -> 151) in WKT format
      expect(whereSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          polygon: expect.stringMatching(/^POLYGON\(\(151(?:\.0)? -33\.9.*151(?:\.0)? -33\.9\)\)$/), // Should start and end with same coords
        })
      );
    });

    it('should apply filters to polygon query', async () => {
      const polygon: [number, number][] = [
        [151.0, -33.9],
        [151.3, -33.9],
        [151.3, -33.7],
        [151.0, -33.7],
        [151.0, -33.9],
      ];

      const mockBuilder = createMockQueryBuilder([]);
      jest.spyOn(propertyRepository, 'createQueryBuilder').mockReturnValue(
        mockBuilder as SelectQueryBuilder<PropertyEntity>
      );

      const filters: PropertyFilters = {
        listingStatus: [ListingStatus.ON_MARKET, ListingStatus.PRE_MARKET],
        minPrice: 600000,
      };

      await service.findInPolygon(polygon, filters);

      expect(mockBuilder.andWhere).toHaveBeenCalledWith(
        'property.listingStatus IN (:...statuses)',
        { statuses: [ListingStatus.ON_MARKET, ListingStatus.PRE_MARKET] }
      );
      expect(mockBuilder.andWhere).toHaveBeenCalledWith(
        'property.askingPrice >= :minPrice',
        { minPrice: 600000 }
      );
    });

    it('should exclude deleted properties from polygon search', async () => {
      const polygon: [number, number][] = [
        [151.0, -33.9],
        [151.3, -33.9],
        [151.3, -33.7],
        [151.0, -33.7],
        [151.0, -33.9],
      ];

      const mockBuilder = createMockQueryBuilder([]);
      jest.spyOn(propertyRepository, 'createQueryBuilder').mockReturnValue(
        mockBuilder as SelectQueryBuilder<PropertyEntity>
      );

      await service.findInPolygon(polygon);

      expect(mockBuilder.andWhere).toHaveBeenCalledWith('property.deletedAt IS NULL');
    });
  });

  describe('performance', () => {
    it('should handle large result sets with limit parameter', async () => {
      const manyProperties = Array.from({ length: 100 }, (_, i) => ({
        ...testProperties[0],
        id: `prop-${i}`,
      }));

      const mockBuilder = createMockQueryBuilder(manyProperties.slice(0, 50));
      jest.spyOn(propertyRepository, 'createQueryBuilder').mockReturnValue(
        mockBuilder as SelectQueryBuilder<PropertyEntity>
      );

      const results = await service.findWithinRadius(
        SYDNEY_CBD.lat,
        SYDNEY_CBD.lng,
        50,
        undefined,
        50, // limit
      );

      expect(results.length).toBeLessThanOrEqual(50);
      expect(mockBuilder.limit).toHaveBeenCalledWith(50);
    });

    it('should use default limit of 100 for radius queries', async () => {
      const mockBuilder = createMockQueryBuilder([]);
      jest.spyOn(propertyRepository, 'createQueryBuilder').mockReturnValue(
        mockBuilder as SelectQueryBuilder<PropertyEntity>
      );

      await service.findWithinRadius(
        SYDNEY_CBD.lat,
        SYDNEY_CBD.lng,
        5,
      );

      expect(mockBuilder.limit).toHaveBeenCalledWith(100);
    });

    it('should use default limit of 500 for bounding box queries', async () => {
      const mockBuilder = createMockQueryBuilder([]);
      jest.spyOn(propertyRepository, 'createQueryBuilder').mockReturnValue(
        mockBuilder as SelectQueryBuilder<PropertyEntity>
      );

      await service.findInBoundingBox(
        -34.0, 151.0, -33.5, 151.5,
      );

      expect(mockBuilder.limit).toHaveBeenCalledWith(500);
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined filters gracefully', async () => {
      const mockBuilder = createMockQueryBuilder([testProperties[0]]);
      jest.spyOn(propertyRepository, 'createQueryBuilder').mockReturnValue(
        mockBuilder as SelectQueryBuilder<PropertyEntity>
      );

      await service.findWithinRadius(
        SYDNEY_CBD.lat,
        SYDNEY_CBD.lng,
        5,
        undefined,
      );

      // Should only have the base where clause and deletedAt check
      expect(mockBuilder.where).toHaveBeenCalledTimes(1);
      expect(mockBuilder.andWhere).toHaveBeenCalledWith('property.deletedAt IS NULL');
    });

    it('should handle empty filter arrays', async () => {
      const mockBuilder = createMockQueryBuilder([]);
      jest.spyOn(propertyRepository, 'createQueryBuilder').mockReturnValue(
        mockBuilder as SelectQueryBuilder<PropertyEntity>
      );

      const filters: PropertyFilters = {
        listingStatus: [],
        propertyTypes: [],
      };

      await service.findWithinRadius(
        SYDNEY_CBD.lat,
        SYDNEY_CBD.lng,
        5,
        filters,
      );

      // Empty arrays should not add filter conditions
      expect(mockBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('listingStatus'),
        expect.any(Object)
      );
    });

    it('should handle zero radius gracefully', async () => {
      const mockBuilder = createMockQueryBuilder([]);
      jest.spyOn(propertyRepository, 'createQueryBuilder').mockReturnValue(
        mockBuilder as SelectQueryBuilder<PropertyEntity>
      );

      const results = await service.findWithinRadius(
        SYDNEY_CBD.lat,
        SYDNEY_CBD.lng,
        0, // zero radius
      );

      expect(mockBuilder.where).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ radiusMeters: 0 })
      );
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
