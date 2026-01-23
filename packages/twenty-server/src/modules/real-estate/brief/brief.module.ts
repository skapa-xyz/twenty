import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BriefEntity } from './entities/brief.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BriefEntity])],
  exports: [TypeOrmModule],
})
export class BriefModule {}
