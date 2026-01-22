import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Point } from 'geojson';
import { Field, ObjectType, ID, Int, Float } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-scalars';

export enum BriefPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

@ObjectType('Brief')
@Entity({ name: 'brief', schema: 'core' })
@Index('IDX_BRIEF_WORKSPACE', ['workspaceId'])
@Index('IDX_BRIEF_BUYER', ['buyerId'])
export class BriefEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'uuid' })
  workspaceId: string;

  @Field()
  @Column({ type: 'uuid' })
  buyerId: string;

  @Field()
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  minBudget: number | null;

  @Field(() => Int)
  @Column({ type: 'int' })
  maxBudget: number;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  minBedrooms: number | null;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  minBathrooms: number | null;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  minCarSpaces: number | null;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  minLandSize: number | null;

  @Field(() => [String])
  @Column({ type: 'jsonb', default: [] })
  preferredSuburbs: string[];

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  searchCenterPoint: Point | null;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  searchRadiusKm: number | null;

  @Field(() => [String])
  @Column({ type: 'jsonb', default: [] })
  propertyTypes: string[];

  @Field(() => [String])
  @Column({ type: 'jsonb', default: [] })
  mustHaveFeatures: string[];

  @Field(() => [String])
  @Column({ type: 'jsonb', default: [] })
  niceToHaveFeatures: string[];

  @Field(() => [String])
  @Column({ type: 'jsonb', default: [] })
  dealBreakers: string[];

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Field()
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Field()
  @Column({
    type: 'enum',
    enum: BriefPriority,
    default: BriefPriority.MEDIUM,
  })
  priority: BriefPriority;

  @Field()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
