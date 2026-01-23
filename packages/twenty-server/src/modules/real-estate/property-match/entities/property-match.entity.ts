import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Field, ObjectType, ID, Int } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { PropertyEntity } from '../../property/entities/property.entity';
import { BriefEntity } from '../../brief/entities/brief.entity';

/**
 * Status lifecycle for property matches
 * - new: Initial match created by the matching engine
 * - viewed: Agent or buyer has viewed the match details
 * - shortlisted: Match is actively being considered
 * - rejected: Match has been rejected
 * - expired: Match is no longer relevant (e.g., property sold)
 */
export enum PropertyMatchStatus {
  NEW = 'new',
  VIEWED = 'viewed',
  SHORTLISTED = 'shortlisted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

/**
 * Detailed breakdown of how the match score was calculated
 * Each component contributes to the overall match score
 */
export interface ScoreBreakdown {
  priceScore: number;
  locationScore: number;
  attributeScore: number;
  featureScore: number;
  details: string[];
}

/**
 * PropertyMatch entity represents a match between a property and a buyer's brief
 *
 * This entity tracks:
 * - The relationship between properties and buyer briefs
 * - Match quality through scoring (0-100)
 * - Match status throughout the engagement lifecycle
 * - Agent notes and tracking data
 *
 * Key features:
 * - Unique constraint ensures one match per property-brief pair
 * - Indexed on workspaceId for multi-tenancy queries
 * - Indexed on matchScore for sorted retrieval
 * - JSONB scoreBreakdown provides transparency into matching algorithm
 */
@ObjectType('PropertyMatch')
@Entity({ name: 'propertyMatch', schema: 'core' })
@Index('IDX_PROPERTY_MATCH_WORKSPACE', ['workspaceId'])
@Index('IDX_PROPERTY_MATCH_SCORE', ['matchScore'])
@Unique(['propertyId', 'briefId'])
export class PropertyMatchEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'uuid' })
  workspaceId: string;

  @Field()
  @Column({ type: 'uuid' })
  propertyId: string;

  @Field()
  @Column({ type: 'uuid' })
  briefId: string;

  @Field()
  @Column({ type: 'uuid' })
  buyerId: string;

  /**
   * Match score from 0-100 indicating quality of match
   * Higher scores indicate better matches based on brief criteria
   */
  @Field(() => Int)
  @Column({ type: 'int' })
  matchScore: number;

  /**
   * Detailed breakdown of how the match score was calculated
   * Stored as JSONB for flexibility and query capabilities
   */
  @Field(() => GraphQLJSON)
  @Column({ type: 'jsonb', default: {} })
  scoreBreakdown: ScoreBreakdown;

  /**
   * Current status of the match in the engagement workflow
   */
  @Field()
  @Column({
    type: 'enum',
    enum: PropertyMatchStatus,
    default: PropertyMatchStatus.NEW,
  })
  status: PropertyMatchStatus;

  /**
   * Notes added by agents during the matching process
   * Used for context and follow-up actions
   */
  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  agentNotes: string | null;

  /**
   * Timestamp when the match was first viewed
   * Used for engagement tracking and analytics
   */
  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  viewedAt: Date | null;

  @Field()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  /**
   * The property being matched
   * CASCADE delete: if property is deleted, matches are removed
   */
  @ManyToOne(() => PropertyEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property: PropertyEntity;

  /**
   * The buyer's brief defining search criteria
   * CASCADE delete: if brief is deleted, matches are removed
   */
  @ManyToOne(() => BriefEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'briefId' })
  brief: BriefEntity;
}
