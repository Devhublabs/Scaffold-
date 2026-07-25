import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const userSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

const User = models.User || model('User', userSchema);
export default User;
