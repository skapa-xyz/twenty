import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PropertyMatchEntity } from './entities/property-match.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyMatchEntity])],
  exports: [TypeOrmModule],
})
export class PropertyMatchModule {}
