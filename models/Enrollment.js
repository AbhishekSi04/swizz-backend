import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    // progress by lesson _id
    progressByLessonId: { type: Map, of: Boolean, default: {} },
  },
  { timestamps: true }
);

enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

export default mongoose.model('Enrollment', enrollmentSchema);


