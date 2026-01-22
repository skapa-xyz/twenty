import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PropertyEntity } from './entities/property.entity';
import { PropertySpatialResolver } from './resolvers/property-spatial.resolver';
import { PropertySpatialService } from './services/property-spatial.service';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyEntity], 'core')],
  providers: [PropertySpatialService, PropertySpatialResolver],
  exports: [PropertySpatialService, TypeOrmModule],
})
export class PropertyModule {}
