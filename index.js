import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import studentRoutes from './routes/students.js';

dotenv.config();

const app = express();
// Use exact origins (no trailing slash) so the browser Origin header matches
const allowedOrigins = [
  "https://swizz-eight.vercel.app",
  "http://localhost:5173",
  "https://swizz-backend.onrender.com"
];

// Helper to normalize origin value
const normalizeOrigin = (o) => (o || '').replace(/\/$/, '');

app.use(
  cors({
    origin: function (origin, callback) {
      const normalized = normalizeOrigin(origin);
      if (!origin || allowedOrigins.includes(normalized)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 204,
  })
);

// This helps with preflight requests
app.options("*", cors());
app.use(express.json());

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eduport';
const port = process.env.PORT || 4000;

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((err) => {
    console.error('MongoDB connection error', err);
    process.exit(1);
  });

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/students', studentRoutes);

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Server error' });
});

app.get("/", (req, res) => {
  res.send("Backend server is running successfully 🚀");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});


