import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class NotifySubscribersDto {
  @ApiProperty({
    description: 'Email notification subject',
    example: 'New Game Update Released',
  })
  @IsString()
  @MinLength(3)
  messageSubject: string;

  @ApiProperty({
    description: 'Email notification message body',
    example: 'We have published a new update for your subscribed game.',
  })
  @IsString()
  @MinLength(10)
  messageDescription: string;
}
