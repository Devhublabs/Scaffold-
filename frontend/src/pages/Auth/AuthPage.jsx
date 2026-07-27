import { useState } from "react";

import { login, signup } from "../../services/auth";


function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const session =
        mode === "signup"
          ? await signup(form)
          : await login({ email: form.email, password: form.password });
      onAuthenticated(session);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <header>
          <p className="brand">Scaffold</p>
          <h1>{mode === "login" ? "Sign in" : "Create account"}</h1>
        </header>

        <div className="segmented-control" aria-label="Authentication mode">
          <button
            type="button"
            aria-pressed={mode === "login"}
            onClick={() => setMode("login")}
          >
            Sign in
          </button>
          <button
            type="button"
            aria-pressed={mode === "signup"}
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={submit}>
          {mode === "signup" && (
            <label>
              Username
              <input
                name="username"
                minLength="3"
                maxLength="40"
                value={form.username}
                onChange={updateField}
                autoComplete="username"
                required
              />
            </label>
          )}
          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              minLength="8"
              maxLength="128"
              value={form.password}
              onChange={updateField}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              required
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Please wait"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default AuthPage;
