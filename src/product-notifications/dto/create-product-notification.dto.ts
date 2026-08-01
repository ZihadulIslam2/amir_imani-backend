import { IsEmail, IsMongoId } from 'class-validator';

export class CreateProductNotificationDto {
  @IsMongoId()
  productId: string;

  @IsEmail()
  email: string;
}
