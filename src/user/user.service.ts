import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
import * as bcrypt from 'bcrypt';
import { IUser } from './user.interface';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) readonly userModel: Model<UserDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(data: Partial<User>): Promise<UserDocument> {
    const hashedPassword = data.password
      ? await bcrypt.hash(data.password, 10)
      : undefined;
    const user = new this.userModel({
      ...data,
      ...(hashedPassword && { password: hashedPassword }),
    });
    return user.save(); // ✅ returns a full Mongoose Document with toObject()
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email });
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel
      .findById(id)
      .select('-verificationInfo -password')
      .exec();
  }

  async updateUser(
    id: string,
    updateData: { [key: string]: any },
    avatarFile?: Express.Multer.File,
  ): Promise<IUser | null> {
    const avatarUpload = avatarFile
      ? await this.cloudinaryService.uploadImage(avatarFile)
      : null;
    const updatedUser = await this.userModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...updateData,
          ...(avatarUpload?.secure_url && { avatar: avatarUpload.secure_url }),
        },
      },
      {
        new: true, // return updated document
        runValidators: true, // validate schema rules on update
        select:
          '_id firstName lastName email role avatar phoneNum address dateOfBirth gender',
      },
    );

    return updatedUser ? (updatedUser.toObject() as unknown as IUser) : null;
  }
}
