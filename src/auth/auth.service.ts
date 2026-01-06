import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { EmailService } from '../email/email.service';
import { randomInt } from 'crypto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private emailService: EmailService,
    private jwtService: JwtService,
  ) {}

  async register(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    address: string,
    phoneNum: string,
  ) {
    const existing = await this.userService.findByEmail(email);
    if (existing) throw new BadRequestException('Email already registered');

    // 1️⃣ Create the user
    const user = await this.userService.create({
      firstName,
      lastName,
      email,
      password,
      address,
      phoneNum,
    });

    // 2️⃣ Generate OTP
    const otp = this.generateOtp();

    // 3️⃣ Save OTP in verificationInfo
    user.verificationInfo.token = otp;
    await user.save();

    // 4️⃣ Send OTP email
    // this.emailService.sendOtpMail(email, otp);

    return {
      message: 'User registered successfully. OTP sent to email.',
      userId: user._id,
    };
  }

  private generateOtp(): string {
    // 6-digit OTP
    return randomInt(100000, 999999).toString();
  }

  async verifyOtp({ email, token }: VerifyOtpDto) {
    const user = await this.userService.findByEmail(email);

    if (!user) throw new BadRequestException('User not found');
    if (!user.verificationInfo?.token)
      throw new BadRequestException('No OTP found. Please register again');

    if (user.verificationInfo.token !== token)
      throw new BadRequestException('Invalid OTP');

    // ✅ OTP matches, mark user as verified
    user.verificationInfo.verified = true;
    user.verificationInfo.token = undefined; // remove OTP after verification
    await user.save();

    return { message: 'Email verified successfully' };
  }

  async login(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    const payload = {
      sub: (user as unknown as { _id: string })._id,
      role: user.role,
      name: user.firstName + ' ' + user.lastName,
    };
    const token = await this.jwtService.signAsync(payload);
    return { token };
  }

  // 🟡 STEP 1: send otp
  async sendPasswordResetOtp(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    await this.userService.updateUser((user as any)._id, {
      'verificationInfo.resetOtp': otp,
      'verificationInfo.resetOtpExpiry': expiry,
    });

    await this.emailService.sendOtpMail(email, otp);
    return { message: 'OTP sent to email' };
  }

  // 🟢 STEP 2: verify otp and issue reset token
  async verifyResetOtp(email: string, otp: string) {
    console.log(2, email, otp);
    const user = await this.userService.findByEmail(email);
    if (!user || user.verificationInfo.resetOtp !== otp)
      throw new BadRequestException('Invalid OTP');

    // if ( user?.verificationInfo?.resetOtpExpiry < new Date())
    //   throw new BadRequestException('OTP expired');
    if (
      user?.verificationInfo?.resetOtpExpiry &&
      new Date(user.verificationInfo.resetOtpExpiry) < new Date()
    ) {
      throw new BadRequestException('OTP expired');
    }

    // 🪙 issue temporary reset token
    const resetToken = await this.jwtService.signAsync(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      { sub: (user as any)._id, type: 'reset' },
      { expiresIn: '10m' }, // 10 minutes
    );

    // clear OTP (optional)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    await this.userService.updateUser((user as any)._id, {
      'verificationInfo.resetOtp': null,
      'verificationInfo.resetOtpExpiry': null,
    });

    return { message: 'OTP verified', resetToken };
  }

  // 🔐 STEP 3: reset password using reset token
  async resetPasswordWithToken(userId: string, newPassword: string) {
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.userService.updateUser(userId, { password: hashed });
    return { message: 'Password reset successful' };
  }

  // utility to verify reset token
  async verifyResetToken(token: string): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const payload = await this.jwtService.verifyAsync(token);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (payload.type !== 'reset')
        throw new UnauthorizedException('Invalid token');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return payload.sub;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    // find user by Id
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // verify old password
    const isMatched = await bcrypt.compare(oldPassword, user.password);
    if (!isMatched) {
      throw new BadRequestException('Old password is incorrect');
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    await user.save();

    // return response message
    return { message: 'password changed successfull' };
  }
}
