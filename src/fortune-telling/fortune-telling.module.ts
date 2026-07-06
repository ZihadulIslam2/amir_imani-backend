import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FortuneHistory, FortuneHistorySchema } from './fortune-telling.schema';
import { FortuneTellingService } from './fortune-telling.service';
import { FortuneTellingController } from './fortune-telling.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FortuneHistory.name, schema: FortuneHistorySchema },
    ]),
  ],
  controllers: [FortuneTellingController],
  providers: [FortuneTellingService],
})
export class FortuneTellingModule {}
