const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const { requireAdmin } = require("../middleware/auth");

// ---------- Admin Auth ----------

router.get("/login", (req, res) => {
  if (req.session.isAdmin) return res.redirect("/admin/dashboard");
  res.render("admin/login", { error: null });
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    req.session.isAdmin = true;
    return res.redirect("/admin/dashboard");
  }

  res.render("admin/login", { error: "Invalid admin username or password" });
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/admin/login"));
});

// ---------- Dashboard ----------

router.get("/dashboard", requireAdmin, async (req, res) => {
  const students = await Student.find().sort({ name: 1 });

  const studentsWithSummary = students.map((s) => ({
    doc: s,
    pendingCount: s.fees.filter((f) => f.status === "pending").length,
    paidCount: s.fees.filter((f) => f.status === "paid").length,
  }));

  res.render("admin/dashboard", { students: studentsWithSummary });
});

// ---------- Add Student ----------

router.get("/students/new", requireAdmin, (req, res) => {
  res.render("admin/new-student", { error: null });
});

router.post("/students", requireAdmin, async (req, res) => {
  const { name, username, password, phone, className } = req.body;

  try {
    await Student.create({
      name,
      username: username.trim().toLowerCase(),
      password,
      phone,
      className,
      fees: [],
    });
    res.redirect("/admin/dashboard");
  } catch (err) {
    let message = "Could not create student.";
    if (err.code === 11000) {
      message = "That username is already taken. Please choose another.";
    }
    res.render("admin/new-student", { error: message });
  }
});

// ---------- Student Detail / Fee Management ----------

router.get("/students/:id", requireAdmin, async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.redirect("/admin/dashboard");

  const sortedFees = [...student.fees].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return Student.MONTHS.indexOf(b.month) - Student.MONTHS.indexOf(a.month);
  });

  res.render("admin/student-detail", {
    student,
    sortedFees,
    months: Student.MONTHS,
    error: null,
  });
});

// Add a new fee record (month/year entry) for a student
router.post("/students/:id/fees", requireAdmin, async (req, res) => {
  const { month, year, amount, status } = req.body;
  const student = await Student.findById(req.params.id);
  if (!student) return res.redirect("/admin/dashboard");

  student.fees.push({
    month,
    year: Number(year),
    amount: Number(amount) || 0,
    status,
    paidOn: status === "paid" ? new Date() : undefined,
  });

  await student.save();
  res.redirect(`/admin/students/${student._id}`);
});

// Update an existing fee record's status (mark paid/pending) or details
router.put("/students/:id/fees/:feeId", requireAdmin, async (req, res) => {
  const { status, amount, remarks } = req.body;
  const student = await Student.findById(req.params.id);
  if (!student) return res.redirect("/admin/dashboard");

  const fee = student.fees.id(req.params.feeId);
  if (fee) {
    fee.status = status;
    fee.amount = Number(amount) || fee.amount;
    fee.remarks = remarks;
    fee.paidOn = status === "paid" ? new Date() : undefined;
  }

  await student.save();
  res.redirect(`/admin/students/${student._id}`);
});

// Delete a fee record
router.delete("/students/:id/fees/:feeId", requireAdmin, async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.redirect("/admin/dashboard");

  student.fees.id(req.params.feeId)?.deleteOne();
  await student.save();
  res.redirect(`/admin/students/${student._id}`);
});

// Reset a student's password
router.post("/students/:id/reset-password", requireAdmin, async (req, res) => {
  const { newPassword } = req.body;
  const student = await Student.findById(req.params.id);
  if (!student) return res.redirect("/admin/dashboard");

  student.password = newPassword;
  await student.save();
  res.redirect(`/admin/students/${student._id}`);
});

// Delete a student entirely
router.delete("/students/:id", requireAdmin, async (req, res) => {
  await Student.findByIdAndDelete(req.params.id);
  res.redirect("/admin/dashboard");
});

module.exports = router;
