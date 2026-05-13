import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { C } from "../../constants";
import { Input, Btn } from "../../components/UI";
import LogoMark from "../../components/LogoMark";

function AuthCard({ children, title, subtitle, onBack }) {
  const authStyles = `
    @keyframes authFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes authSlideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    @keyframes authScaleIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    @keyframes shimmerAuth {
      0% { background-position: -1000px 0; }
      100% { background-position: 1000px 0; }
    }

    @keyframes authFloat {
      0% { transform: translate3d(0, 0, 0) scale(1); }
      50% { transform: translate3d(0, -12px, 0) scale(1.05); }
      100% { transform: translate3d(0, 0, 0) scale(1); }
    }

    @keyframes authDrift {
      0% { transform: translate3d(0, 0, 0); }
      50% { transform: translate3d(12px, -10px, 0); }
      100% { transform: translate3d(0, 0, 0); }
    }

    @keyframes authGlowPulse {
      0%, 100% { opacity: 0.35; }
      50% { opacity: 0.72; }
    }

    .auth-container {
      animation: authFadeIn 0.6s ease-out;
    }

    .auth-title {
      animation: authSlideUp 0.7s ease-out 0.1s both;
    }

    .auth-subtitle {
      animation: authSlideUp 0.7s ease-out 0.15s both;
    }

    .auth-card {
      animation: authScaleIn 0.6s ease-out 0.2s both;
      position: relative;
      overflow: hidden;
    }

    .auth-card::before {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(120deg, transparent 0%, rgba(120, 176, 255, 0.12) 22%, transparent 38%);
      transform: translateX(-120%);
      animation: shimmerAuth 8s linear infinite;
      pointer-events: none;
    }

    .auth-card::after {
      content: "";
      position: absolute;
      inset: 1px;
      border-radius: 27px;
      border: 1px solid rgba(168, 203, 255, 0.06);
      pointer-events: none;
    }

    .auth-orb {
      position: absolute;
      border-radius: 999px;
      pointer-events: none;
      filter: blur(2px);
      mix-blend-mode: screen;
      z-index: 0;
    }

    .auth-orb.one {
      width: 140px;
      height: 140px;
      top: -54px;
      right: -44px;
      background: radial-gradient(circle, rgba(95, 164, 255, 0.42) 0%, rgba(95, 164, 255, 0.08) 62%, transparent 74%);
      animation: authFloat 7.5s ease-in-out infinite;
    }

    .auth-orb.two {
      width: 94px;
      height: 94px;
      left: -28px;
      top: 120px;
      background: radial-gradient(circle, rgba(141, 198, 255, 0.28) 0%, rgba(141, 198, 255, 0.05) 62%, transparent 74%);
      animation: authDrift 9s ease-in-out infinite;
    }

    .auth-orb.three {
      width: 74px;
      height: 74px;
      right: 14%;
      bottom: 18%;
      background: radial-gradient(circle, rgba(100, 220, 255, 0.24) 0%, rgba(100, 220, 255, 0.05) 64%, transparent 78%);
      animation: authGlowPulse 3.6s ease-in-out infinite;
    }

    .auth-sparkline {
      position: absolute;
      inset: auto 20px 18px 20px;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(145, 192, 255, 0.48), transparent);
      animation: authGlowPulse 4.8s ease-in-out infinite;
      pointer-events: none;
      z-index: 0;
    }

    .auth-body {
      position: relative;
      z-index: 1;
    }

    .auth-input {
      animation: authSlideUp 0.6s ease-out backwards;
    }

    .auth-input:nth-child(1) { animation-delay: 0.25s; }
    .auth-input:nth-child(2) { animation-delay: 0.3s; }
    .auth-input:nth-child(3) { animation-delay: 0.35s; }
    .auth-input:nth-child(4) { animation-delay: 0.4s; }
    .auth-input:nth-child(5) { animation-delay: 0.45s; }

    .auth-button {
      animation: authSlideUp 0.6s ease-out 0.45s both;
    }

    .auth-footer {
      animation: authFadeIn 0.6s ease-out 0.5s both;
    }

    .auth-back-button {
      animation: authSlideUp 0.6s ease-out 0.05s both;
    }
  `;

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(64, 147, 255, 0.16), transparent 22%), radial-gradient(circle at 20% 80%, rgba(128, 169, 255, 0.12), transparent 22%), linear-gradient(180deg, #050c21 0%, #081a37 100%)",
        color: "#eef4ff",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}
      className="auth-container"
    >
      <style>{authStyles}</style>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.55,
          backgroundImage:
            "radial-gradient(circle at 18% 22%, rgba(114, 160, 255, 0.18), transparent 24%), radial-gradient(circle at 80% 12%, rgba(101, 197, 255, 0.12), transparent 14%)",
        }}
      />
      {onBack && (
        <button
          onClick={onBack}
          style={{
            position: "absolute",
            top: "28px",
            left: "28px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: "999px",
            color: "#d5e2ff",
            cursor: "pointer",
            fontSize: "13px",
            padding: "10px 14px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontFamily: "inherit",
            backdropFilter: "blur(12px)",
            transition: "all 0.3s ease",
          }}
          className="auth-back-button"
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
        >
          ← Back to Home
        </button>
      )}

      <div style={{ width: "min(520px, calc(100% - 32px))", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <LogoMark compact />
          <h1
            style={{
              fontSize: "2.5rem",
              fontWeight: 800,
              color: "#ffffff",
              margin: "24px 0 10px",
              lineHeight: 1.05,
            }}
            className="auth-title"
          >
            {title}
          </h1>
          <p
            style={{ color: "#b1c7f7", fontSize: "1rem", margin: 0, lineHeight: 1.8 }}
            className="auth-subtitle"
          >
            {subtitle}
          </p>
        </div>

        <div
          style={{
            background: "rgba(9, 20, 48, 0.96)",
            border: "1px solid rgba(109, 153, 255, 0.14)",
            borderRadius: "28px",
            padding: "36px 34px",
            boxShadow: "0 30px 90px rgba(2, 9, 28, 0.32)",
          }}
          className="auth-card"
        >
          <div className="auth-orb one" />
          <div className="auth-orb two" />
          <div className="auth-orb three" />
          <div className="auth-sparkline" />
          <div className="auth-body">{children}</div>
        </div>

        <div
          style={{ marginTop: "22px", textAlign: "center", fontSize: "0.95rem", color: "#9fb8df", lineHeight: 1.75 }}
          className="auth-footer"
        >
          Demo accounts: <strong style={{ color: "#ffffff" }}>contractor@demo.com</strong> · <strong style={{ color: "#ffffff" }}>agency@demo.com</strong> · <strong style={{ color: "#ffffff" }}>payroll@demo.com</strong> · <strong style={{ color: "#ffffff" }}>client@demo.com</strong>
          <br />
          Password: <strong style={{ color: "#ffffff" }}>demo123</strong>
        </div>
      </div>
    </div>
  );
}

export function LoginPage({ onSwitch, onBack }) {
  const { login } = useApp();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await login(form.email, form.password);
    if (!res.success) setError(res.error);
    setLoading(false);
  };

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your account" onBack={onBack}>
      <form onSubmit={submit}>
        <div className="auth-input">
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div className="auth-input">
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            error={error}
          />
        </div>
        <div className="auth-button">
          <Btn type="submit" fullWidth disabled={loading} size="lg" style={{ marginTop: "8px" }}>
            {loading ? "Signing in…" : "Sign in"}
          </Btn>
        </div>
      </form>
      <div style={{ textAlign: "center", marginTop: "20px", fontSize: "0.96rem", color: "#9fb8df" }}>
        No account?{" "}
        <button
          onClick={onSwitch}
          style={{ background: "none", border: "none", color: "#8ac0ff", cursor: "pointer", fontSize: "0.96rem", fontWeight: 700 }}
        >
          Register
        </button>
      </div>
    </AuthCard>
  );
}

export function RegisterPage({ onSwitch, onBack }) {
  const { register } = useApp();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", role: "contractor" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name) errs.name = "Name is required";
    if (!form.email.includes("@")) errs.email = "Valid email required";
    if (form.password.length < 6) errs.password = "Min 6 characters";
    if (form.password !== form.confirm) errs.confirm = "Passwords do not match";
    setErrors(errs);

    if (!Object.keys(errs).length) {
      setLoading(true);
      const res = await register(form.name, form.email, form.password, form.role);
      setLoading(false);
      if (!res.success) {
        setErrors({ email: res.error });
      }
    }
  };

  return (
    <AuthCard title="Create account" subtitle="Register to access the platform" onBack={onBack}>
      <form onSubmit={submit}>
        <div className="auth-input">
          <Input
            label="Full name"
            placeholder="Your full name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            error={errors.name}
          />
        </div>
        <div className="auth-input">
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            error={errors.email}
          />
        </div>
        <div className="auth-input" style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "12px", color: "#8fa8df", marginBottom: "6px" }}>Role</label>
          <select
            value={form.role}
            onChange={(e) => set("role", e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              background: "#071830",
              border: "1px solid rgba(109, 153, 255, 0.16)",
              borderRadius: "10px",
              color: "#eef4ff",
              fontSize: "14px",
              fontFamily: "inherit",
            }}
          >
            <option value="contractor">Contractor</option>
            <option value="agency">Agency Staff</option>
            <option value="payroll_operator">Payroll Operator</option>
            <option value="client">Client</option>
          </select>
        </div>
        <div className="auth-input">
          <Input
            label="Password"
            type="password"
            placeholder="Min 6 characters"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            error={errors.password}
          />
        </div>
        <div className="auth-input">
          <Input
            label="Confirm password"
            type="password"
            placeholder="Repeat password"
            value={form.confirm}
            onChange={(e) => set("confirm", e.target.value)}
            error={errors.confirm}
          />
        </div>
        <div className="auth-button">
          <Btn type="submit" fullWidth disabled={loading} size="lg" style={{ marginTop: "8px" }}>
            {loading ? "Creating account…" : "Create account"}
          </Btn>
        </div>
      </form>
      <div style={{ textAlign: "center", marginTop: "20px", fontSize: "0.96rem", color: "#9fb8df" }}>
        Already registered?{" "}
        <button
          onClick={onSwitch}
          style={{ background: "none", border: "none", color: "#8ac0ff", cursor: "pointer", fontSize: "0.96rem", fontWeight: 700 }}
        >
          Sign in
        </button>
      </div>
    </AuthCard>
  );
}

export function ChangePasswordPage() {
  const { changePassword } = useApp();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.current) errs.current = "Required";
    if (form.next.length < 6) errs.next = "Min 6 characters";
    if (form.next !== form.confirm) errs.confirm = "Passwords do not match";
    setErrors(errs);
    if (!Object.keys(errs).length) {
      const res = await changePassword(form.current, form.next);
      if (res.success) {
        setSuccess(true);
        setForm({ current: "", next: "", confirm: "" });
      } else {
        setErrors({ current: res.error });
      }
    }
  };

  return (
    <div style={{ maxWidth: "480px" }}>
      <style>{`
        @keyframes authSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .change-pwd-title { animation: authSlideUp 0.7s ease-out 0.1s both; }
        .change-pwd-form { animation: authSlideUp 0.7s ease-out 0.2s both; }
      `}</style>
      <div style={{ marginBottom: "28px" }} className="change-pwd-title">
        <h1 style={{ fontSize: "22px", fontWeight: 600, margin: 0 }}>Change Password</h1>
        <p style={{ fontSize: "13px", color: C.muted, margin: "4px 0 0" }}>Update your account password</p>
      </div>
      {success && (
        <div
          style={{
            padding: "12px 16px",
            background: C.green + "22",
            border: `1px solid ${C.green}44`,
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "13px",
            color: C.green,
            animation: "authSlideUp 0.5s ease-out",
          }}
        >
          Password updated successfully.
        </div>
      )}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "28px" }} className="change-pwd-form">
        <form onSubmit={submit}>
          <div style={{ animation: "authSlideUp 0.6s ease-out 0.25s backwards" }}>
            <Input label="Current password" type="password" value={form.current} onChange={(e) => set("current", e.target.value)} error={errors.current} />
          </div>
          <div style={{ animation: "authSlideUp 0.6s ease-out 0.3s backwards" }}>
            <Input label="New password" type="password" value={form.next} onChange={(e) => set("next", e.target.value)} error={errors.next} />
          </div>
          <div style={{ animation: "authSlideUp 0.6s ease-out 0.35s backwards" }}>
            <Input label="Confirm new password" type="password" value={form.confirm} onChange={(e) => set("confirm", e.target.value)} error={errors.confirm} />
          </div>
          <div style={{ animation: "authSlideUp 0.6s ease-out 0.4s backwards" }}>
            <Btn type="submit" size="lg">Update password</Btn>
          </div>
        </form>
      </div>
    </div>
  );
}
