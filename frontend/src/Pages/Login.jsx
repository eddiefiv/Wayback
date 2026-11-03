import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api.js";
import "./css/Login.css";

function Login({ onLogin, user }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const authData = await login(email, password);
      onLogin(authData);
      navigate("/browse");
    } catch (requestError) {
      console.error("Login failed:", requestError);
      setError(requestError.message || "Could not log in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (user) {
    return (
      <main className="login-page">
        <h2>You are logged in</h2>
        <p>Signed in as {user.email}.</p>
      </main>
    );
  }

  return (
    <main className="login-page">
      <h2>Log in to WayBack</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {error && <p className="error-message" role="alert">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p>New to WayBack? <Link to="/register">Create an account</Link></p>
    </main>
  );
}

export default Login;
