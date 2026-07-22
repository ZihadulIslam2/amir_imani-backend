// products.controller.ts
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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ProductCategory } from './product.schema';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('imgs'))
  @ApiOperation({
    summary: 'Create a new product with optional image uploads',
    description:
      'When productType is marchandice, category is required. Cards cannot have a category.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Product creation payload with new fields',
    schema: {
      type: 'object',
      properties: {
        productName: { type: 'string' },
        price: { type: 'number' },
        feature: { type: 'string' },
        description: { type: 'string' },
        productType: { type: 'string', enum: ['card', 'marchandice'] },
        category: { type: 'string', enum: Object.values(ProductCategory) },
        merchandiseBadge: { type: 'string' },
        videoLink: { type: 'string' },
        imgs: { type: 'array', items: { type: 'string', format: 'binary' } },
        existingImgs: { type: 'array', items: { type: 'string' } },
        color: { type: 'array', items: { type: 'string' } },
        size: { type: 'array', items: { type: 'string' } },
        quantity: { type: 'number' },
        ruleTitle: { type: 'string' },
        rulls: { type: 'array' },
        boardanatomyTitle: { type: 'string' },
        boardAnatomyDiscription: { type: 'string' },
        passandplayTittle: { type: 'string' },
        passandplay: { type: 'array' },
        garmentTitle: { type: 'string' },
        garmentsMATERIAL: { type: 'string' },
        garmentWEIGHT: { type: 'string' },
        garmentFit: { type: 'string' },
        garmentPRINT: { type: 'string' },
        garmentMADeIN: { type: 'string' },
        garmentCARE: { type: 'string' },
        addHome: { type: 'boolean' },
        ca_price: { type: 'number' },
        // New fields
        productFeatures: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              value: { type: 'string' },
            },
          },
        },
        gameSubtitle: { type: 'string' },
        players: { type: 'string' },
        age: { type: 'string' },
        minutes: { type: 'string' },
        cards: { type: 'string' },
        inTheBox: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            subtitle: { type: 'string' },
            boxnumbers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  number: { type: 'string' },
                  title: { type: 'string' },
                  subtitle: { type: 'string' },
                },
              },
            },
          },
        },
        homeImage: { type: 'string' },
      },
    },
  })
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
  @ApiQuery({
    name: 'type',
    description: 'Filter products by type (card/marchandice)',
    required: false,
  })
  @ApiQuery({
    name: 'category',
    description:
      'Public merchandise category filter. Only applies to marchandice products. Use ALL to return all merchandise products.',
    enum: ProductCategory,
    required: false,
  })
  @ApiQuery({
    name: 'search',
    description: 'Search products by name (case-insensitive regex match)',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully.' })
  async getAllProducts(
    @Res() res: Response,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('category') category?: ProductCategory,
  ) {
    const products = await this.productsService.getAllProducts(
      type,
      search,
      category,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Products retrieved successfully',
      data: products,
    });
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Retrieve all supported merchandise categories',
    description:
      'Returns the canonical merchandise category list used by the backend, including ALL.',
  })
  @ApiResponse({
    status: 200,
    description: 'Merchandise categories retrieved successfully.',
  })
  async getMerchandiseCategories(@Res() res: Response) {
    const categories = this.productsService.getMerchandiseCategories();

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Merchandise categories retrieved successfully',
      data: categories,
    });
  }

  @Get('purchased/:userId')
  @ApiOperation({ summary: 'Retrieve all purchased products for a user' })
  @ApiParam({
    name: 'userId',
    description: 'The MongoDB user ID',
    example: '60d21b4667d0d8992e610c85',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchased products retrieved successfully.',
  })
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
  @ApiParam({
    name: 'id',
    description: 'The MongoDB product ID',
    example: '60d21b4667d0d8992e610c85',
  })
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
  @ApiOperation({
    summary: 'Update an existing product',
    description:
      'Merchandise products can use category. If a product is changed to card, the merchandise category is removed.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'id',
    description: 'The MongoDB product ID',
    example: '60d21b4667d0d8992e610c85',
  })
  @ApiBody({
    description: 'Product update payload with new fields',
    schema: {
      type: 'object',
      properties: {
        productName: { type: 'string' },
        price: { type: 'number' },
        feature: { type: 'string' },
        description: { type: 'string' },
        productType: { type: 'string', enum: ['card', 'marchandice'] },
        category: { type: 'string', enum: Object.values(ProductCategory) },
        merchandiseBadge: { type: 'string' },
        videoLink: { type: 'string' },
        imgs: { type: 'array', items: { type: 'string', format: 'binary' } },
        existingImgs: { type: 'array', items: { type: 'string' } },
        color: { type: 'array', items: { type: 'string' } },
        size: { type: 'array', items: { type: 'string' } },
        quantity: { type: 'number' },
        ruleTitle: { type: 'string' },
        rulls: { type: 'array' },
        boardanatomyTitle: { type: 'string' },
        boardAnatomyDiscription: { type: 'string' },
        passandplayTittle: { type: 'string' },
        passandplay: { type: 'array' },
        garmentTitle: { type: 'string' },
        garmentsMATERIAL: { type: 'string' },
        garmentWEIGHT: { type: 'string' },
        garmentFit: { type: 'string' },
        garmentPRINT: { type: 'string' },
        garmentMADeIN: { type: 'string' },
        garmentCARE: { type: 'string' },
        addHome: { type: 'boolean' },
        ca_price: { type: 'number' },
        // New fields
        productFeatures: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              value: { type: 'string' },
            },
          },
        },
        gameSubtitle: { type: 'string' },
        players: { type: 'string' },
        age: { type: 'string' },
        minutes: { type: 'string' },
        cards: { type: 'string' },
        inTheBox: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            subtitle: { type: 'string' },
            boxnumbers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  number: { type: 'string' },
                  title: { type: 'string' },
                  subtitle: { type: 'string' },
                },
              },
            },
          },
        },
        homeImage: { type: 'string' },
      },
    },
  })
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
  @ApiParam({
    name: 'id',
    description: 'The MongoDB product ID',
    example: '60d21b4667d0d8992e610c85',
  })
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
