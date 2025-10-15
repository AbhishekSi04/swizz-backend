import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, default: '' },
    durationMinutes: { type: Number, default: 0 },
  },
  { _id: true }
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, default: 0 },
    category: { type: String, default: 'general' },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lessons: { type: [lessonSchema], default: [] },
    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Course', courseSchema);


