import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BriefEntity } from '../brief/entities/brief.entity';
import { PropertyMatchEntity } from '../property-match/entities/property-match.entity';
import { PropertyEntity } from '../property/entities/property.entity';

import { PropertyMatchProcessor } from './jobs/property-match.job';
import { PropertyCreatedListener } from './listeners/property-created.listener';
import { MatchScorerService } from './services/match-scorer.service';
import { MatchingEngineService } from './services/matching-engine.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [BriefEntity, PropertyMatchEntity, PropertyEntity],
      'core',
    ),
  ],
  providers: [
    MatchingEngineService,
    MatchScorerService,
    PropertyCreatedListener,
    PropertyMatchProcessor,
  ],
  exports: [MatchingEngineService, MatchScorerService],
})
export class MatchingEngineModule {}
