import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { sendResponse } from '../common/utils/sendResponse';
import { BlogService } from './blog.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiConsumes } from '@nestjs/swagger';

@ApiTags('Blogs')
@Controller('blogs')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  @UseInterceptors(FileInterceptor('img'))
  @ApiOperation({ summary: 'Create a new blog post with an optional cover image' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Blog created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid payload.' })
  async create(
    @Body() dto: CreateBlogDto,
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    const blog = await this.blogService.create(dto, file);
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Blog created successfully',
      data: blog,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all blog posts' })
  @ApiResponse({ status: 200, description: 'Blogs retrieved successfully.' })
  async findAll(@Res() res: Response) {
    const blogs = await this.blogService.findAll();
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Blogs retrieved successfully',
      data: blogs,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single blog post by ID' })
  @ApiParam({ name: 'id', description: 'The MongoDB blog post ID', example: '60d21b4667d0d8992e610c85' })
  @ApiResponse({ status: 200, description: 'Blog retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Blog post not found.' })
  async findOne(@Param('id') id: string, @Res() res: Response) {
    const blog = await this.blogService.findOne(id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Blog retrieved successfully',
      data: blog,
    });
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('img'))
  @ApiOperation({ summary: 'Update an existing blog post' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'The MongoDB blog post ID', example: '60d21b4667d0d8992e610c85' })
  @ApiResponse({ status: 200, description: 'Blog updated successfully.' })
  @ApiResponse({ status: 404, description: 'Blog post not found.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBlogDto,
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    const blog = await this.blogService.update(id, dto, file);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Blog updated successfully',
      data: blog,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a blog post by ID' })
  @ApiParam({ name: 'id', description: 'The MongoDB blog post ID', example: '60d21b4667d0d8992e610c85' })
  @ApiResponse({ status: 200, description: 'Blog deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Blog post not found.' })
  async remove(@Param('id') id: string, @Res() res: Response) {
    const result = await this.blogService.remove(id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: result.message,
      data: null,
    });
  }
}
