import express from 'express';
import Course from '../models/Course.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Public: list published courses
router.get('/', async (req, res, next) => {
  try {
    const { q } = req.query;
    const filter = { published: true };
    if (q) filter.title = { $regex: q, $options: 'i' };
    const courses = await Course.find(filter).populate('instructor', 'name');
    res.json(courses);
  } catch (err) {
    next(err);
  }
});

// Instructor: list my courses
router.get('/mine', requireAuth, requireRole(['instructor', 'admin']), async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { instructor: req.user.id };
    const courses = await Course.find(filter).sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    next(err);
  }
});

// Get by id (published or owner)
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id).populate('instructor', 'name');
    if (!course) return res.status(404).json({ error: 'Not found' });
    if (!course.published && String(course.instructor._id) !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(course);
  } catch (err) {
    next(err);
  }
});

// Instructor: create
router.post('/', requireAuth, requireRole(['instructor', 'admin']), async (req, res, next) => {
  try {
    const { title, description, price, category, lessons, published } = req.body;
    const course = await Course.create({
      title,
      description,
      price,
      category,
      lessons: Array.isArray(lessons) ? lessons : [],
      published: Boolean(published),
      instructor: req.user.id,
    });
    res.status(201).json(course);
  } catch (err) {
    next(err);
  }
});

// Instructor: update
router.put('/:id', requireAuth, requireRole(['instructor', 'admin']), async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && String(course.instructor) !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updatable = ['title', 'description', 'price', 'category', 'lessons', 'published'];
    for (const key of updatable) {
      if (key in req.body) course[key] = req.body[key];
    }
    await course.save();
    res.json(course);
  } catch (err) {
    next(err);
  }
});

// Instructor: delete
router.delete('/:id', requireAuth, requireRole(['instructor', 'admin']), async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && String(course.instructor) !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await course.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;


