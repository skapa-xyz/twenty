import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { BriefModule } from './brief/brief.module';
import { MatchingEngineModule } from './matching-engine/matching-engine.module';
import { WorkspaceContextMiddleware } from './middleware/workspace-context.middleware';
import { PropertyMatchModule } from './property-match/property-match.module';
import { PropertyModule } from './property/property.module';

@Module({
  imports: [PropertyModule, BriefModule, PropertyMatchModule, MatchingEngineModule],
  providers: [WorkspaceContextMiddleware],
  exports: [PropertyModule, BriefModule, PropertyMatchModule, MatchingEngineModule],
})
export class RealEstateModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(WorkspaceContextMiddleware).forRoutes('*');
  }
}
