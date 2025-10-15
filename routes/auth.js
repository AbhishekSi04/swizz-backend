import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function generateToken(user) {
  const payload = { id: user._id, role: user.role, email: user.email, name: user.name };
  const secret = process.env.JWT_SECRET || 'dev-secret';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already in use' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role: role === 'instructor' ? 'instructor' : 'student' });
    const token = generateToken(user);
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
});

router.post('/signin', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
});

// Get current user profile
router.get('/profile', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Update current user profile
router.put('/profile', requireAuth, async (req, res, next) => {
  try {
    const { name, email, phone, location, aboutMe } = req.body;
    const updateFields = { name, phone, location, aboutMe };

    // Only allow email change if it's not already taken by another user
    if (email && email !== req.user.email) {
      const existing = await User.findOne({ email });
      if (existing && existing._id.toString() !== req.user.id) {
        return res.status(409).json({ error: 'Email already in use by another account' });
      }
      updateFields.email = email;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) return res.status(404).json({ error: 'User not found' });

    // If email or name changed, generate a new token to reflect updated info
    const token = generateToken(user);

    res.json({ message: 'Profile updated', user: { id: user._id, name: user.name, email: user.email, role: user.role }, token });
  } catch (err) {
    next(err);
  }
});

export default router;


