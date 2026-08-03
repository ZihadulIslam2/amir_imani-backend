import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { createQrDto } from './createQrcode.dto';
import { updateQrcodeDto } from './updateQrcode.dto';

const localhostProductVideoUrl =
  'http://localhost:3000/product/695057098548e119f5fa7cfd#game-video';

describe('QR code URL DTOs', () => {
  it('accepts a localhost destination URL with a section hash when creating a QR code', async () => {
    const dto = plainToInstance(createQrDto, {
      gameName: 'Game video',
      finalUrl: localhostProductVideoUrl,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('accepts a localhost destination URL with a section hash when updating a QR code', async () => {
    const dto = plainToInstance(updateQrcodeDto, {
      finalUrl: localhostProductVideoUrl,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
