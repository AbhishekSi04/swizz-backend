import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import courseRoutes from "./routes/courses.js";
import studentRoutes from "./routes/students.js";

dotenv.config();

const app = express();

// ✅ CORS Setup
app.use(
  cors({
    origin: [
      "https://swizz-emt1.vercel.app", // frontend (deployed)
      "http://localhost:5173",         // frontend (local dev)
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());

// ✅ Root route (so Vercel shows something)
app.get("/", (req, res) => {
  res.send("✅ Backend server is running successfully on Vercel 🚀");
});

// ✅ MongoDB Connection
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/eduport";
mongoose
  .connect(mongoUri)
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => {
    console.error("MongoDB connection error ❌", err);
    process.exit(1);
  });

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/students", studentRoutes);

// ✅ Health route
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// ✅ Error handling
app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

// ✅ Vercel export (IMPORTANT)
export default app;
