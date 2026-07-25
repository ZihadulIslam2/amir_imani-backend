import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  FortuneDefinition,
  FortuneDefinitionSchema,
} from './fortune-definition.schema';
import { FortuneHistory, FortuneHistorySchema } from './fortune-telling.schema';
import { FortuneTellingService } from './fortune-telling.service';
import { FortuneTellingController } from './fortune-telling.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FortuneDefinition.name, schema: FortuneDefinitionSchema },
      { name: FortuneHistory.name, schema: FortuneHistorySchema },
    ]),
  ],
  controllers: [FortuneTellingController],
  providers: [FortuneTellingService],
})
export class FortuneTellingModule {}
