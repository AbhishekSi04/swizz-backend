import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['student', 'instructor', 'admin'], default: 'student', index: true },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    aboutMe: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);


