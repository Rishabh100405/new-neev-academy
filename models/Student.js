const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const feeSchema = new mongoose.Schema(
  {
    month: { type: String, required: true, enum: MONTHS },
    year: { type: Number, required: true },
    amount: { type: Number, required: true, default: 0 },
    status: { type: String, required: true, enum: ["paid", "pending"], default: "pending" },
    paidOn: { type: Date },
    remarks: { type: String },
  },
  { _id: true, timestamps: true }
);

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String, trim: true },
    className: { type: String, trim: true }, // e.g. "Class 10", "Batch A"
    fees: [feeSchema],
  },
  { timestamps: true }
);

// Hash password whenever it's set/changed
studentSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

studentSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Virtual helpers for quick summaries
studentSchema.methods.pendingFees = function () {
  return this.fees.filter((f) => f.status === "pending");
};

studentSchema.methods.paidFees = function () {
  return this.fees.filter((f) => f.status === "paid");
};

studentSchema.statics.MONTHS = MONTHS;

module.exports = mongoose.model("Student", studentSchema);
