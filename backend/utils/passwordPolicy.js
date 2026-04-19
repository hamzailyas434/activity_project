const POLICY =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/;

exports.isStrongPassword = (pw) => POLICY.test(pw);
exports.msg =
  "Password must be 8+ characters with uppercase, lowercase, number, and special character";
