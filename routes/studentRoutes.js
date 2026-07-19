const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const { requireStudent } = require("../middleware/auth");

// ---------- Student Auth ----------

router.get("/login", (req, res) => {
  if (req.session.studentId) return res.redirect("/student/dashboard");
  res.render("student/login", { error: null });
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const student = await Student.findOne({ username: (username || "").trim().toLowerCase() });
  if (!student) {
    return res.render("student/login", { error: "Invalid username or password" });
  }

  const match = await student.comparePassword(password);
  if (!match) {
    return res.render("student/login", { error: "Invalid username or password" });
  }

  req.session.studentId = student._id.toString();
  res.redirect("/student/dashboard");
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/student/login"));
});

// ---------- Dashboard ----------

router.get("/dashboard", requireStudent, async (req, res) => {
  const student = await Student.findById(req.session.studentId);
  if (!student) {
    req.session.destroy(() => {});
    return res.redirect("/student/login");
  }

  const sortedFees = [...student.fees].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return Student.MONTHS.indexOf(b.month) - Student.MONTHS.indexOf(a.month);
  });

  const paidFees = sortedFees.filter((f) => f.status === "paid");
  const pendingFees = sortedFees.filter((f) => f.status === "pending");

  res.render("student/dashboard", {
    student,
    sortedFees,
    paidFees,
    pendingFees,
  });
});

module.exports = router;
