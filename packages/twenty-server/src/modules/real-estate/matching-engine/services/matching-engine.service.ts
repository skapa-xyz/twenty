// packages/twenty-server/src/modules/real-estate/matching-engine/services/matching-engine.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PropertyEntity } from '../../property/entities/property.entity';
import { BriefEntity } from '../../brief/entities/brief.entity';
import { PropertyMatchEntity, ScoreBreakdown } from '../../property-match/entities/property-match.entity';
import { MatchScorerService } from './match-scorer.service';

export interface MatchResult {
  briefId: string;
  buyerId: string;
  score: number;
  scoreBreakdown: ScoreBreakdown;
}

@Injectable()
export class MatchingEngineService {
  private readonly logger = new Logger(MatchingEngineService.name);

  constructor(
    @InjectRepository(BriefEntity)
    private readonly briefRepository: Repository<BriefEntity>,
    @InjectRepository(PropertyMatchEntity)
    private readonly matchRepository: Repository<PropertyMatchEntity>,
    private readonly matchScorerService: MatchScorerService,
  ) {}

  async findMatchingBriefs(
    property: PropertyEntity,
    minScore = 75,
  ): Promise<MatchResult[]> {
    // Query briefs that could potentially match this property
    const candidateBriefs = await this.briefRepository
      .createQueryBuilder('brief')
      .where('brief.workspaceId = :workspaceId', {
        workspaceId: property.workspaceId,
      })
      .andWhere('brief.isActive = true')
      .andWhere('brief.deletedAt IS NULL')
      .andWhere('brief.maxBudget >= :price', {
        price: property.askingPrice ?? property.estimatedValue ?? 0,
      })
      .andWhere(
        `(
          brief."minBedrooms" IS NULL
          OR ((:attributes)::jsonb->>'bedrooms')::int >= brief."minBedrooms"
        )`,
        { attributes: JSON.stringify(property.attributes) },
      )
      .andWhere(
        `(
          brief."preferredSuburbs" = '[]'::jsonb
          OR brief."preferredSuburbs" ? :suburb
          OR (
            brief."searchCenterPoint" IS NOT NULL
            AND ST_DWithin(
              brief."searchCenterPoint"::geography,
              ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
              brief."searchRadiusKm" * 1000
            )
          )
        )`,
        {
          suburb: property.addressSuburb ?? '',
          lng: property.location?.coordinates[0] ?? 0,
          lat: property.location?.coordinates[1] ?? 0,
        },
      )
      .getMany();

    this.logger.log(
      `Found ${candidateBriefs.length} candidate briefs for property ${property.id}`,
    );

    // Score each candidate
    const results: MatchResult[] = [];

    for (const brief of candidateBriefs) {
      const { score, breakdown } = this.matchScorerService.calculateScore(
        property,
        brief,
      );

      if (score >= minScore) {
        results.push({
          briefId: brief.id,
          buyerId: brief.buyerId,
          score,
          scoreBreakdown: breakdown,
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  async createMatches(
    property: PropertyEntity,
    matches: MatchResult[],
  ): Promise<PropertyMatchEntity[]> {
    const createdMatches: PropertyMatchEntity[] = [];

    for (const match of matches) {
      // Check if match already exists
      const existing = await this.matchRepository.findOne({
        where: {
          propertyId: property.id,
          briefId: match.briefId,
        },
      });

      if (!existing) {
        const newMatch = this.matchRepository.create({
          workspaceId: property.workspaceId,
          propertyId: property.id,
          briefId: match.briefId,
          buyerId: match.buyerId,
          matchScore: match.score,
          scoreBreakdown: match.scoreBreakdown,
        });

        const saved = await this.matchRepository.save(newMatch);
        createdMatches.push(saved);
      }
    }

    return createdMatches;
  }
}
