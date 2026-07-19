require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const methodOverride = require("method-override");

const connectDB = require("./config/db");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");

const app = express();

connectDB();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret_change_me",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

// Make session info available in all views
app.use((req, res, next) => {
  res.locals.adminLoggedIn = !!req.session.isAdmin;
  res.locals.studentLoggedIn = !!req.session.studentId;
  next();
});

app.get("/", (req, res) => {
  res.render("home");
});

app.use("/admin", adminRoutes);
app.use("/student", studentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render("404");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Tuition portal running on http://localhost:${PORT}`);
});
