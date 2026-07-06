import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FortuneHistory, FortuneHistoryDocument } from './fortune-telling.schema';
import * as fortunesData from './data/fortunes.json';

interface FortuneEntry {
  symbols: string[];
  fortune: string;
}

interface FortunesMap {
  [key: string]: FortuneEntry;
}

const fortunes = fortunesData as FortunesMap;

@Injectable()
export class FortuneTellingService {
  constructor(
    @InjectModel(FortuneHistory.name)
    private readonly fortuneHistoryModel: Model<FortuneHistoryDocument>,
  ) {}

  private normalizeSymbols(symbols: string[]): string {
    return [...symbols]
      .map((s) => s.trim().toUpperCase())
      .sort()
      .join(',');
  }

  async reveal(userId: string, symbols: string[]): Promise<{ fortune: string; symbols: string[] }> {
    const normalized = symbols.map((s) => s.trim().toUpperCase());

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingToday = await this.fortuneHistoryModel
      .findOne({
        userId,
        createdAt: { $gte: today, $lt: tomorrow },
      })
      .exec();

    if (existingToday) {
      throw new ForbiddenException('You have already received your fortune today. Come back tomorrow.');
    }

    const key = this.normalizeSymbols(normalized);
    const entry = fortunes[key];

    if (!entry) {
      throw new BadRequestException('No fortune found for the given combination of symbols.');
    }

    const history = new this.fortuneHistoryModel({
      userId,
      symbols: normalized,
      fortune: entry.fortune,
    });
    await history.save();

    return {
      fortune: entry.fortune,
      symbols: normalized,
    };
  }

  async getUserHistory(userId: string): Promise<FortuneHistoryDocument[]> {
    return this.fortuneHistoryModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getAllHistory(): Promise<FortuneHistoryDocument[]> {
    return this.fortuneHistoryModel
      .find()
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }
}
