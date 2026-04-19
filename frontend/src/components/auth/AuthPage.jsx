import { useState } from "react";
import Login from "./Login";
import Register from "./Register";

function AuthPage({ onAuthSuccess, initialTab = "login", onBack }) {
  const [isLogin, setIsLogin] = useState(initialTab !== "register");

  const handleAuth = (user, token, remember) => {
    if (onAuthSuccess) onAuthSuccess(user, token, remember);
  };

  return isLogin ? (
    <Login
      onLogin={handleAuth}
      onSwitchToRegister={() => setIsLogin(false)}
      onBack={onBack}
    />
  ) : (
    <Register
      onRegister={handleAuth}
      onSwitchToLogin={() => setIsLogin(true)}
      onBack={onBack}
    />
  );
}

export default AuthPage;
