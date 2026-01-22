// packages/twenty-server/src/modules/real-estate/property/services/property-spatial.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PropertyEntity } from '../entities/property.entity';

export interface PropertyFilters {
  minBedrooms?: number;
  minBathrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  listingStatus?: string[];
  propertyTypes?: string[];
}

@Injectable()
export class PropertySpatialService {
  constructor(
    @InjectRepository(PropertyEntity)
    private readonly propertyRepository: Repository<PropertyEntity>,
  ) {}

  async findWithinRadius(
    lat: number,
    lng: number,
    radiusKm: number,
    filters?: PropertyFilters,
    limit = 100,
  ): Promise<PropertyEntity[]> {
    const query = this.propertyRepository
      .createQueryBuilder('property')
      .where(
        `ST_DWithin(
          property.location::geography,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
          :radiusMeters
        )`,
        {
          lat,
          lng,
          radiusMeters: radiusKm * 1000,
        },
      )
      .addSelect(
        `ST_Distance(
          property.location::geography,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
        ) / 1000`,
        'distance_km',
      )
      .andWhere('property.deletedAt IS NULL')
      .orderBy('distance_km', 'ASC')
      .limit(limit);

    if (filters) {
      this.applyFilters(query, filters);
    }

    return query.getMany();
  }

  async findInBoundingBox(
    minLat: number,
    minLng: number,
    maxLat: number,
    maxLng: number,
    filters?: PropertyFilters,
    limit = 500,
  ): Promise<PropertyEntity[]> {
    const query = this.propertyRepository
      .createQueryBuilder('property')
      .where(
        `property.location && ST_MakeEnvelope(:minLng, :minLat, :maxLng, :maxLat, 4326)`,
        { minLat, minLng, maxLat, maxLng },
      )
      .andWhere('property.deletedAt IS NULL')
      .limit(limit);

    if (filters) {
      this.applyFilters(query, filters);
    }

    return query.getMany();
  }

  async findInPolygon(
    coordinates: [number, number][],
    filters?: PropertyFilters,
    limit = 500,
  ): Promise<PropertyEntity[]> {
    const polygonWkt = this.coordinatesToPolygonWkt(coordinates);

    const query = this.propertyRepository
      .createQueryBuilder('property')
      .where(
        `ST_Within(property.location, ST_GeomFromText(:polygon, 4326))`,
        { polygon: polygonWkt },
      )
      .andWhere('property.deletedAt IS NULL')
      .limit(limit);

    if (filters) {
      this.applyFilters(query, filters);
    }

    return query.getMany();
  }

  private applyFilters(
    query: any,
    filters: PropertyFilters,
  ): void {
    if (filters.minBedrooms) {
      query.andWhere(
        `(property.attributes->>'bedrooms')::int >= :minBedrooms`,
        { minBedrooms: filters.minBedrooms },
      );
    }

    if (filters.minBathrooms) {
      query.andWhere(
        `(property.attributes->>'bathrooms')::int >= :minBathrooms`,
        { minBathrooms: filters.minBathrooms },
      );
    }

    if (filters.minPrice) {
      query.andWhere('property.askingPrice >= :minPrice', {
        minPrice: filters.minPrice,
      });
    }

    if (filters.maxPrice) {
      query.andWhere('property.askingPrice <= :maxPrice', {
        maxPrice: filters.maxPrice,
      });
    }

    if (filters.listingStatus?.length) {
      query.andWhere('property.listingStatus IN (:...statuses)', {
        statuses: filters.listingStatus,
      });
    }

    if (filters.propertyTypes?.length) {
      query.andWhere(
        `property.attributes->>'propertyType' IN (:...types)`,
        { types: filters.propertyTypes },
      );
    }
  }

  private coordinatesToPolygonWkt(coords: [number, number][]): string {
    // Ensure polygon is closed
    const closedCoords = [...coords];
    if (
      coords[0][0] !== coords[coords.length - 1][0] ||
      coords[0][1] !== coords[coords.length - 1][1]
    ) {
      closedCoords.push(coords[0]);
    }

    const points = closedCoords.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
    return `POLYGON((${points}))`;
  }
}
