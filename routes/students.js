import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';

const router = express.Router();

// List available courses for students (published only)
router.get('/courses', requireAuth, requireRole(['student', 'admin']), async (req, res, next) => {
  try {
    const { q } = req.query;
    const filter = { published: true };
    if (q) filter.title = { $regex: q, $options: 'i' };
    const courses = await Course.find(filter).sort({ createdAt: -1 }).select('-__v');
    res.json(courses);
  } catch (err) {
    next(err);
  }
});

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

// Instructor: list enrollments for my courses (detailed per enrollment)
router.get('/instructor/enrollments', requireAuth, requireRole(['instructor', 'admin']), async (req, res, next) => {
  try {
    const { courseId, q } = req.query;
    const instructorId = req.user.role === 'admin' && req.query.instructorId ? req.query.instructorId : req.user.id;

    const courseFilter = { instructor: instructorId };
    if (courseId) courseFilter._id = courseId;
    const courses = await Course.find(courseFilter).select('_id title lessons');
    const courseMap = new Map(courses.map((c) => [String(c._id), c]));
    const courseIds = courses.map((c) => c._id);
    if (courseIds.length === 0) return res.json([]);

    const enrollments = await Enrollment.find({ course: { $in: courseIds } })
      .populate('student', 'name email location avatarUrl')
      .populate('course', 'title lessons createdAt');

    const filtered = q
      ? enrollments.filter((e) =>
          e.student?.name?.toLowerCase().includes(String(q).toLowerCase()) ||
          e.student?.email?.toLowerCase().includes(String(q).toLowerCase())
        )
      : enrollments;

    const withProgress = filtered.map((e) => {
      const course = courseMap.get(String(e.course._id)) || e.course;
      const totalLessons = Array.isArray(course?.lessons) ? course.lessons.length : 0;
      const completedCount = Array.from((e.progressByLessonId || new Map()).values()).filter(Boolean).length;
      const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      return {
        id: String(e._id),
        enrolledAt: e.createdAt,
        progressPercent,
        student: e.student,
        course: { _id: e.course._id, title: course?.title },
      };
    });

    res.json(withProgress);
  } catch (err) {
    next(err);
  }
});

// Instructor: aggregated students across my courses (one row per student)
router.get('/instructor/students', requireAuth, requireRole(['instructor', 'admin']), async (req, res, next) => {
  try {
    const { q } = req.query;
    const instructorId = req.user.role === 'admin' && req.query.instructorId ? req.query.instructorId : req.user.id;

    const courses = await Course.find({ instructor: instructorId }).select('_id title lessons');
    const courseIds = courses.map((c) => c._id);
    const courseMap = new Map(courses.map((c) => [String(c._id), c]));
    if (courseIds.length === 0) return res.json([]);

    const enrollments = await Enrollment.find({ course: { $in: courseIds } })
      .populate('student', 'name email city avatarUrl')
      .populate('course', 'title lessons createdAt');

    // Compute per-enrollment progress then aggregate by student
    const rows = enrollments.map((e) => {
      const course = courseMap.get(String(e.course._id)) || e.course;
      const totalLessons = Array.isArray(course?.lessons) ? course.lessons.length : 0;
      const completedCount = Array.from((e.progressByLessonId || new Map()).values()).filter(Boolean).length;
      const progressPercent = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;
      return { student: e.student, enrolledAt: e.createdAt, progressPercent };
    });

    const mapByStudent = new Map();
    for (const r of rows) {
      const key = String(r.student._id);
      const prev = mapByStudent.get(key);
      if (!prev) {
        mapByStudent.set(key, { student: r.student, courseCount: 1, latestEnrolledAt: r.enrolledAt, avgProgressSum: r.progressPercent, avgProgressCount: 1 });
      } else {
        prev.courseCount += 1;
        prev.latestEnrolledAt = prev.latestEnrolledAt > r.enrolledAt ? prev.latestEnrolledAt : r.enrolledAt;
        prev.avgProgressSum += r.progressPercent;
        prev.avgProgressCount += 1;
      }
    }

    let result = Array.from(mapByStudent.values()).map((v) => ({
      student: v.student,
      courseCount: v.courseCount,
      latestEnrolledAt: v.latestEnrolledAt,
      avgProgressPercent: Math.round(v.avgProgressSum / v.avgProgressCount) || 0,
    }));

    if (q) {
      const qLower = String(q).toLowerCase();
      result = result.filter((r) => r.student?.name?.toLowerCase().includes(qLower) || r.student?.email?.toLowerCase().includes(qLower));
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;


