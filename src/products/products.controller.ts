import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { sendResponse } from '../common/utils/sendResponse';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiConsumes, ApiQuery } from '@nestjs/swagger';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('imgs'))
  @ApiOperation({ summary: 'Create a new product with optional image uploads' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Product created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid payload.' })
  async createProduct(
    @Body() dto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Res() res: Response,
  ) {
    const product = await this.productsService.createProduct(dto, files);

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all products with optional filters' })
  @ApiQuery({ name: 'type', description: 'Filter products by type (card/marchandice)', required: false })
  @ApiQuery({ name: 'search', description: 'Search products by name (case-insensitive regex match)', required: false })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully.' })
  async getAllProducts(
    @Res() res: Response,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    const products = await this.productsService.getAllProducts(type, search);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Products retrieved successfully',
      data: products,
    });
  }

  @Get('purchased/:userId')
  @ApiOperation({ summary: 'Retrieve all purchased products for a user' })
  @ApiParam({ name: 'userId', description: 'The MongoDB user ID', example: '60d21b4667d0d8992e610c85' })
  @ApiResponse({ status: 200, description: 'Purchased products retrieved successfully.' })
  async getPurchasedProducts(
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    const products = await this.productsService.findPurchasedProducts(userId);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Purchased products retrieved successfully',
      data: products,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve details of a single product' })
  @ApiParam({ name: 'id', description: 'The MongoDB product ID', example: '60d21b4667d0d8992e610c85' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async getProductById(@Param('id') id: string, @Res() res: Response) {
    const product = await this.productsService.getProductById(id);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Product retrieved successfully',
      data: product,
    });
  }

  @Put(':id')
  @UseInterceptors(FilesInterceptor('imgs'))
  @ApiOperation({ summary: 'Update an existing product' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'The MongoDB product ID', example: '60d21b4667d0d8992e610c85' })
  @ApiResponse({ status: 200, description: 'Product updated successfully.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Res() res: Response,
  ) {
    const product = await this.productsService.updateProduct(id, dto, files);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product by ID' })
  @ApiParam({ name: 'id', description: 'The MongoDB product ID', example: '60d21b4667d0d8992e610c85' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async deleteProduct(@Param('id') id: string, @Res() res: Response) {
    const result = await this.productsService.deleteProduct(id);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: result.message,
    });
  }
}
