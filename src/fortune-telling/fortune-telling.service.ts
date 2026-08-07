import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  FortuneDefinition,
  FortuneDefinitionDocument,
} from './fortune-definition.schema';
import {
  FortuneHistory,
  FortuneHistoryDocument,
} from './fortune-telling.schema';
import fortunesJson from './data/fortunes.json';
import { UpdateFortuneDefinitionDto } from './dto/update-fortune-definition.dto';

interface FortuneEntry {
  symbols: string[];
  fortune: string;
}

interface FortunesMap {
  [key: string]: FortuneEntry;
}

const fortunes = resolveFortunesMap(fortunesJson);

@Injectable()
export class FortuneTellingService implements OnModuleInit {
  private seedPromise: Promise<void> | null = null;

  constructor(
    @InjectModel(FortuneDefinition.name)
    private readonly fortuneDefinitionModel: Model<FortuneDefinitionDocument>,
    @InjectModel(FortuneHistory.name)
    private readonly fortuneHistoryModel: Model<FortuneHistoryDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedFortuneDefinitionsIfNeeded();
  }

  private normalizeSymbolValues(symbols: string[]): string[] {
    if (!Array.isArray(symbols)) {
      throw new BadRequestException(
        'Fortune symbols must be provided as an array.',
      );
    }

    return symbols.map((symbol) => symbol.trim().toUpperCase());
  }

  private normalizeSymbols(symbols: string[]): string {
    return [...this.normalizeSymbolValues(symbols)]
      .map((symbol) => (symbol === 'ZIGGY' ? 'ZIGI' : symbol))
      .sort()
      .join(',');
  }

  private async seedFortuneDefinitionsIfNeeded(): Promise<void> {
    if (this.seedPromise) {
      await this.seedPromise;
      return;
    }

    this.seedPromise = this.seedFortuneDefinitions();
    await this.seedPromise;
  }

  private async seedFortuneDefinitions(): Promise<void> {
    const definitionsCount =
      await this.fortuneDefinitionModel.estimatedDocumentCount();

    if (definitionsCount > 0) {
      this.seedPromise = null;
      return;
    }

    const definitions = Object.entries(fortunes).map(([key, entry], index) => {
      if (
        !entry ||
        !Array.isArray(entry.symbols) ||
        typeof entry.fortune !== 'string'
      ) {
        throw new BadRequestException(
          `Invalid fortune definition for key "${key}" in fortunes.json.`,
        );
      }

      return {
        combinationKey: key,
        symbols: this.normalizeSymbolValues(entry.symbols),
        fortune: entry.fortune,
        sequence: index + 1,
      };
    });

    await this.fortuneDefinitionModel.insertMany(definitions);
    this.seedPromise = null;
  }

  private async findFortuneDefinitionBySymbols(
    symbols: string[],
  ): Promise<FortuneDefinitionDocument | null> {
    await this.seedFortuneDefinitionsIfNeeded();
    const combinationKey = this.normalizeSymbols(symbols);

    return this.fortuneDefinitionModel.findOne({ combinationKey }).exec();
  }

  async reveal(
    userId: string,
    symbols: string[],
  ): Promise<{ fortune: string; symbols: string[] }> {
    const normalized = this.normalizeSymbolValues(symbols);

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
      throw new ForbiddenException(
        'You have already received your fortune today. Come back tomorrow.',
      );
    }

    const definition = await this.findFortuneDefinitionBySymbols(normalized);

    if (!definition) {
      throw new BadRequestException(
        'No fortune found for the given combination of symbols.',
      );
    }

    const history = new this.fortuneHistoryModel({
      userId,
      symbols: normalized,
      fortune: definition.fortune,
    });
    await history.save();

    return {
      fortune: definition.fortune,
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

  async getAllFortuneDefinitions(): Promise<FortuneDefinitionDocument[]> {
    await this.seedFortuneDefinitionsIfNeeded();

    return this.fortuneDefinitionModel.find().sort({ sequence: 1 }).exec();
  }

  async updateFortuneDefinition(
    id: string,
    dto: UpdateFortuneDefinitionDto,
  ): Promise<FortuneDefinitionDocument> {
    await this.seedFortuneDefinitionsIfNeeded();

    if (dto.symbols === undefined && dto.fortune === undefined) {
      throw new BadRequestException(
        'Provide fortune text or symbols to update.',
      );
    }

    const definition = await this.fortuneDefinitionModel.findById(id).exec();

    if (!definition) {
      throw new NotFoundException('Fortune definition not found.');
    }

    if (dto.symbols) {
      const normalizedSymbols = this.normalizeSymbolValues(dto.symbols);
      definition.symbols = normalizedSymbols;
      definition.combinationKey = this.normalizeSymbols(normalizedSymbols);
    }

    if (dto.fortune !== undefined) {
      const trimmedFortune = dto.fortune.trim();

      if (!trimmedFortune) {
        throw new BadRequestException('Fortune text cannot be empty.');
      }

      definition.fortune = trimmedFortune;
    }

    try {
      return await definition.save();
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new BadRequestException(
          'A fortune already exists for this symbol combination.',
        );
      }

      throw error;
    }
  }
}

function resolveFortunesMap(rawData: unknown): FortunesMap {
  if (isFortunesMap(rawData)) {
    return rawData;
  }

  if (
    rawData &&
    typeof rawData === 'object' &&
    'default' in rawData &&
    isFortunesMap((rawData as { default?: unknown }).default)
  ) {
    return (rawData as { default: FortunesMap }).default;
  }

  throw new Error(
    'Unable to load fortunes.json in the expected object format.',
  );
}

function isFortunesMap(value: unknown): value is FortunesMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(
    (entry) =>
      entry &&
      typeof entry === 'object' &&
      !Array.isArray(entry) &&
      Array.isArray((entry as FortuneEntry).symbols) &&
      typeof (entry as FortuneEntry).fortune === 'string',
  );
}
