import { Field, Float, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

import { IDField } from '@ptc-org/nestjs-query-graphql';
import GraphQLJSON from 'graphql-type-json';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity';

/**
 * Listing status enum for properties
 */
export enum ListingStatus {
  ON_MARKET = 'on_market',
  OFF_MARKET = 'off_market',
  PRE_MARKET = 'pre_market',
  SOLD = 'sold',
  WITHDRAWN = 'withdrawn',
}

registerEnumType(ListingStatus, {
  name: 'ListingStatus',
  description: 'The listing status of a property',
});

/**
 * Property attributes stored as JSONB
 */
export interface PropertyAttributes {
  bedrooms?: number;
  bathrooms?: number;
  carSpaces?: number;
  propertyType?: 'house' | 'apartment' | 'townhouse' | 'land' | 'villa' | 'other';
  features?: string[];
}

/**
 * GeoJSON Point interface for PostGIS geometry
 */
export interface Point {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

/**
 * Property entity representing real estate properties with PostGIS spatial support
 */
@Entity({ name: 'property', schema: 'core' })
@ObjectType('Property')
@Index('IDX_PROPERTY_LOCATION_GIST', ['location'], { spatial: true })
@Index('IDX_PROPERTY_WORKSPACE', ['workspaceId'])
@Index('IDX_PROPERTY_ATTRIBUTES_GIN', ['attributes'])
@Index('IDX_PROPERTY_ADDRESS_TRGM', ['addressDisplay'])
@Index('IDX_PROPERTY_SEARCH_FTS', ['searchVector'])
export class PropertyEntity extends WorkspaceRelatedEntity {
  // Primary key
  @IDField(() => UUIDScalarType)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Address fields
  @Field(() => String)
  @Column({ type: 'varchar', length: 500 })
  addressDisplay: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  addressStreet: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 100, nullable: true })
  addressSuburb: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 50, nullable: true })
  addressState: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 10, nullable: true })
  addressPostcode: string | null;

  // PostGIS geometry column - not exposed directly to GraphQL
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location: Point | null;

  // Computed latitude field for GraphQL
  @Field(() => Float, { nullable: true })
  get latitude(): number | null {
    return this.location?.coordinates[1] ?? null;
  }

  // Computed longitude field for GraphQL
  @Field(() => Float, { nullable: true })
  get longitude(): number | null {
    return this.location?.coordinates[0] ?? null;
  }

  // Property attributes
  @Field(() => GraphQLJSON)
  @Column({ type: 'jsonb', default: {} })
  attributes: PropertyAttributes;

  // Listing information
  @Field(() => ListingStatus)
  @Column({
    type: 'enum',
    enum: ListingStatus,
    enumName: 'property_listing_status_enum',
    default: ListingStatus.OFF_MARKET,
  })
  listingStatus: ListingStatus;

  @Field(() => UUIDScalarType, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  listingAgentId: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  listingAgentName: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 50, nullable: true })
  listingAgentPhone: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  listingAgentEmail: string | null;

  // Media
  @Field(() => [String])
  @Column({ type: 'jsonb', default: [] })
  photos: string[];

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  floorplanUrl: string | null;

  // Pricing
  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  estimatedValue: number | null;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  askingPrice: number | null;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  soldPrice: number | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'date', nullable: true })
  soldDate: Date | null;

  // Property dimensions
  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  landSize: number | null;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  buildingSize: number | null;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  yearBuilt: number | null;

  // Notes
  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // Full-text search vector (auto-updated by trigger)
  @Column({ type: 'tsvector', nullable: true, select: false })
  searchVector: string | null;

  // Timestamps
  @Field(() => Date)
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
