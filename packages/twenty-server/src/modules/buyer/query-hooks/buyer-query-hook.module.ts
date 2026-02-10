import { Module } from '@nestjs/common';

import { BuyerNameGeneratorService } from 'src/modules/buyer/services/buyer-name-generator.service';
import { BuyerNameCreateOnePostQueryHook } from 'src/modules/buyer/query-hooks/buyer-name.create-one.post-query-hook';
import { BuyerNameUpdateOnePostQueryHook } from 'src/modules/buyer/query-hooks/buyer-name.update-one.post-query-hook';
import { PersonBuyerNameCreateOnePostQueryHook } from 'src/modules/buyer/query-hooks/person-buyer-name.create-one.post-query-hook';
import { PersonBuyerNameUpdateOnePostQueryHook } from 'src/modules/buyer/query-hooks/person-buyer-name.update-one.post-query-hook';

@Module({
  providers: [
    BuyerNameGeneratorService,
    BuyerNameCreateOnePostQueryHook,
    BuyerNameUpdateOnePostQueryHook,
    PersonBuyerNameCreateOnePostQueryHook,
    PersonBuyerNameUpdateOnePostQueryHook,
  ],
})
export class BuyerQueryHookModule {}
