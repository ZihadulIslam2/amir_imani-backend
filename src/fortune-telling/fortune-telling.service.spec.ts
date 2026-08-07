import { ForbiddenException } from '@nestjs/common';
import { FortuneTellingService } from './fortune-telling.service';

describe('FortuneTellingService', () => {
  it('rejects a second fortune reading on the same day', async () => {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: 'existing-reading' }),
    });
    const service = new FortuneTellingService(
      {} as never,
      { findOne } as never,
    );

    await expect(
      service.reveal('user-1', ['AHURA', 'ARES', 'ENKI']),
    ).rejects.toThrow(
      new ForbiddenException(
        'You have already received your fortune today. Come back tomorrow.',
      ),
    );
    expect(findOne).toHaveBeenCalledTimes(1);
  });
});
