import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
import * as bcrypt from 'bcrypt';
import { IUser } from './user.interface';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) readonly userModel: Model<UserDocument>,
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
  ): Promise<IUser | null> {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      id,
      { $set: updateData }, // ✅ ensures nested fields like verificationInfo.resetOtp are properly updated
      {
        new: true, // return updated document
        runValidators: true, // validate schema rules on update
        select: '_id firstName lastName email role verificationInfo', // optional: select what you want
      },
    );

    return updatedUser ? (updatedUser.toObject() as unknown as IUser) : null;
  }
}
