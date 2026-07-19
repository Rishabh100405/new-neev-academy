function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.redirect("/admin/login");
}

function requireStudent(req, res, next) {
  if (req.session && req.session.studentId) {
    return next();
  }
  return res.redirect("/student/login");
}

module.exports = { requireAdmin, requireStudent };
