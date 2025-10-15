import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';

const router = express.Router();

// Enroll in a course (student)
router.post('/enroll/:courseId', requireAuth, requireRole(['student', 'admin']), async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course || !course.published) return res.status(404).json({ error: 'Course not found' });
    const enrollment = await Enrollment.findOneAndUpdate(
      { student: req.user.id, course: course._id },
      { $setOnInsert: { student: req.user.id, course: course._id } },
      { upsert: true, new: true }
    );
    res.status(201).json(enrollment);
  } catch (err) {
    next(err);
  }
});

// List my enrollments
router.get('/me/enrollments', requireAuth, requireRole(['student', 'admin']), async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({ student: req.user.id }).populate('course');
    res.json(enrollments);
  } catch (err) {
    next(err);
  }
});

// Mark lesson complete/incomplete
router.post('/progress/:courseId/:lessonId', requireAuth, requireRole(['student', 'admin']), async (req, res, next) => {
  try {
    const { completed } = req.body; // boolean
    const enrollment = await Enrollment.findOne({ student: req.user.id, course: req.params.courseId });
    if (!enrollment) return res.status(404).json({ error: 'Not enrolled' });
    enrollment.progressByLessonId.set(req.params.lessonId, Boolean(completed));
    await enrollment.save();
    res.json(enrollment);
  } catch (err) {
    next(err);
  }
});

export default router;


