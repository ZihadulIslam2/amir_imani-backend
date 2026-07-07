import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
} from '@nestjs/common';

import { createQrDto } from './dto/createQrcode.dto';
import { updateQrcodeDto } from './dto/updateQrcode.dto';
import { QrcodesService } from './qrcodes.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('QR Codes')
@Controller('qrcodes')
export class QrcodesController {
  constructor(private readonly verificationInfoService: QrcodesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new QR redirection code' })
  @ApiResponse({ status: 201, description: 'QR redirect created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid payload.' })
  create(@Body() dto: createQrDto) {
    return this.verificationInfoService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve list of all QR codes with optional search' })
  @ApiQuery({ name: 'search', description: 'Search query for game names', required: false })
  @ApiResponse({ status: 200, description: 'QR codes retrieved successfully.' })
  findAll(@Query('search') search?: string) {
    return this.verificationInfoService.findAll(search);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing QR code redirect config' })
  @ApiParam({ name: 'id', description: 'The MongoDB QR code config ID', example: '60d21b4667d0d8992e610c85' })
  @ApiResponse({ status: 200, description: 'QR code updated successfully.' })
  @ApiResponse({ status: 404, description: 'QR code not found.' })
  update(@Param('id') id: string, @Body() dto: updateQrcodeDto) {
    return this.verificationInfoService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a QR code redirection config' })
  @ApiParam({ name: 'id', description: 'The MongoDB QR code config ID', example: '60d21b4667d0d8992e610c85' })
  @ApiResponse({ status: 200, description: 'QR code configuration deleted successfully.' })
  @ApiResponse({ status: 404, description: 'QR code configuration not found.' })
  delete(@Param('id') id: string) {
    return this.verificationInfoService.delete(id);
  }

  @Get(':code')
  @ApiOperation({ summary: 'Handle QR code redirect action' })
  @ApiParam({ name: 'code', description: 'The unique shortcode identifier', example: 'abcd12' })
  @ApiResponse({ status: 302, description: 'Redirecting to target destination URL.' })
  @ApiResponse({ status: 404, description: 'Redirect code not found.' })
  async handleRedirect(@Param('code') code: string, @Res() res: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.verificationInfoService.handleRedirect(code, res);
  }
}
