import {
  Body,
  Controller,
  Post,
  Res,
  Headers,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { sendResponse } from '../common/utils/sendResponse';
import type { Response } from 'express';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader, ApiBody, ApiProperty } from '@nestjs/swagger';

// Temporary classes for documenting reset otp and password endpoints with body payloads
class ForgotPasswordDto {
  @ApiProperty({ description: 'The registered email address', example: 'john.doe@example.com' })
  email: string;
}

class VerifyResetOtpDto {
  @ApiProperty({ description: 'The registered email address', example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ description: 'The 6-digit OTP code', example: '123456' })
  otp: string;
}

class ResetPasswordDto {
  @ApiProperty({ description: 'The new password for the account (minimum 6 characters)', example: 'newpassword123' })
  newPassword: string;
}

class ChangePasswordDto {
  @ApiProperty({ description: 'The current password for verification', example: 'oldpassword123' })
  oldPassword: string;

  @ApiProperty({ description: 'The new password to set', example: 'newpassword123' })
  newPassword: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User registered successfully and verification OTP sent.' })
  @ApiResponse({ status: 400, description: 'Invalid payload or email already exists.' })
  async register(@Body() dto: RegisterDto, @Res() res: Response) {
    const result = await this.authService.register(
      dto.firstName,
      dto.lastName,
      dto.email,
      dto.password,
      dto.address,
      dto.phoneNum,
    );

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'User registered successfully',
      data: result,
    });
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify account registration OTP' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully and user account activated.' })
  @ApiResponse({ status: 400, description: 'Incorrect or expired OTP token.' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful. Returns access token.' })
  @ApiResponse({ status: 401, description: 'Unauthorized credentials.' })
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const result = await this.authService.login(dto.email, dto.password);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Login successful',
      data: result,
    });
  }

  /*******************
   * FORGET PASSWORD *
   *******************/
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset link/OTP' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset OTP sent successfully.' })
  @ApiResponse({ status: 404, description: 'Email not found.' })
  async forgotPassword(@Body('email') email: string, @Res() res: Response) {
    const result = await this.authService.sendPasswordResetOtp(email);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: result.message,
    });
  }

  /**************
   * VERIFY OTP *
   **************/
  @Post('reset/password/verify-otp')
  @ApiOperation({ summary: 'Verify password reset OTP code' })
  @ApiBody({ type: VerifyResetOtpDto })
  @ApiResponse({ status: 200, description: 'OTP verified. Returns a short-lived reset token.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP.' })
  async verifyOtp_reset_password(@Body() body: any, @Res() res: Response) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    const result = await this.authService.verifyResetOtp(body.email, body.otp);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: result.message,
      data: { resetToken: result.resetToken },
    });
  }

  /******************
   * RESET PASSWORD *
   ******************/
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with reset token' })
  @ApiHeader({ name: 'authorization', description: 'Bearer <resetToken>', required: true })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired reset token.' })
  async resetPassword(
    @Headers('authorization') authHeader: string,
    @Body('newPassword') newPassword: string,
    @Res() res: Response,
  ) {
    // Authorization: Bearer <token>
    const token = authHeader?.split(' ')[1];
    const userId = await this.authService.verifyResetToken(token);
    const result = await this.authService.resetPasswordWithToken(
      userId,
      newPassword,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: result.message,
    });
  }

  // change password
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('change-password')
  @ApiOperation({ summary: 'Change password for an authenticated user' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized or incorrect old password.' })
  async changePassword(
    @Req() req: Request,
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword: string,
    @Res() res: Response,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = (req as any).user?.userId;

    const result = await this.authService.changePassword(
      userId,
      oldPassword,
      newPassword,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: result.message,
    });
  }
}
