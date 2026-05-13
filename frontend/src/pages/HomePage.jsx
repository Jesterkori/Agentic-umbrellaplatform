import React from "react";
import LogoMark from "../components/LogoMark";
import { Btn } from "../components/UI";

export default function HomePage({ onLogin, onRegister }) {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#081727", color: "#e8f8ff", fontFamily: "'Space Grotesk', 'Manrope', 'Segoe UI', sans-serif", position: "relative", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap');

        :root {
          --sky-1: #0da5c0;
          --sky-2: #46d5e2;
          --ink: #081727;
          --paper: #e8f8ff;
          --fog: #9dc9d9;
          --card: rgba(11, 39, 64, 0.72);
          --line: rgba(191, 236, 255, 0.18);
        }

        .anime-wash {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(760px 480px at -10% -10%, rgba(70, 213, 226, 0.22), transparent 60%),
            radial-gradient(760px 460px at 100% 4%, rgba(13, 165, 192, 0.22), transparent 64%),
            linear-gradient(155deg, #081727 0%, #0a253d 36%, #0c3a55 66%, #0b2f43 100%);
          z-index: 0;
        }

        .bg-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(to right, rgba(188,234,255,0.14) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(188,234,255,0.14) 1px, transparent 1px);
          background-size: 64px 64px;
          opacity: 0.18;
          pointer-events: none;
          z-index: 0;
        }

        .cityline {
          position: absolute;
          left: 0;
          right: 0;
          bottom: -80px;
          height: 280px;
          background:
            linear-gradient(to top, rgba(2, 12, 24, 0.72), rgba(2, 12, 24, 0)),
            repeating-linear-gradient(
              90deg,
              rgba(160, 225, 252, 0.18) 0 2px,
              transparent 2px 42px
            );
          z-index: 0;
          pointer-events: none;
        }

        .speed-lines {
          position: absolute;
          inset: 0;
          overflow: hidden;
          z-index: 0;
          pointer-events: none;
        }

        .speed-lines::before,
        .speed-lines::after {
          content: "";
          position: absolute;
          width: 180%;
          height: 2px;
          left: -40%;
          background: linear-gradient(90deg, transparent 0%, rgba(168, 239, 255, 0.7) 50%, transparent 100%);
          animation: streak 8s linear infinite;
          opacity: 0.4;
        }

        .speed-lines::before { top: 28%; transform: rotate(-8deg); }
        .speed-lines::after  { top: 48%; transform: rotate(-6deg); animation-delay: 2.8s; }

        .navbar {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 22px 34px;
          backdrop-filter: blur(18px);
          background: rgba(5, 29, 46, 0.62);
          border-bottom: 1px solid var(--line);
        }

        .hero-container {
          position: relative;
          z-index: 1;
          max-width: 1180px;
          margin: 0 auto;
          padding: 84px 28px 76px;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: minmax(280px, 1.05fr) minmax(320px, 0.95fr);
          gap: 32px;
          align-items: center;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid rgba(157, 223, 243, 0.35);
          background: rgba(16, 63, 86, 0.52);
          color: #bfefff;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          margin-bottom: 16px;
          animation: riseIn 0.7s ease both;
        }

        .hero-copy h1 {
          font-size: clamp(3.3rem, 4.4vw, 5.4rem);
          line-height: 0.9;
          margin: 0;
          max-width: 760px;
          font-family: "Space Grotesk", "Manrope", sans-serif;
          background: linear-gradient(128deg, #ffffff 0%, #d3f8ff 45%, #95e5ef 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: riseIn 0.8s ease 0.05s both;
        }

        .hero-copy p {
          margin: 20px 0 30px;
          max-width: 640px;
          font-size: 1.06rem;
          color: #d0ebf7;
          line-height: 1.72;
          animation: riseIn 0.9s ease 0.15s both;
        }

        .cta-group {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
          animation: riseIn 1s ease 0.25s both;
        }

        .quick-facts {
          margin-top: 28px;
          display: grid;
          grid-template-columns: repeat(3, minmax(96px, 1fr));
          gap: 10px;
          animation: riseIn 1.1s ease 0.35s both;
        }

        .fact-card {
          background: rgba(14, 47, 68, 0.64);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 10px 12px;
        }

        .fact-value {
          font-size: 1.15rem;
          font-weight: 800;
          color: #f3fdff;
        }

        .fact-label {
          font-size: 0.77rem;
          color: #9fcbda;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .hero-preview {
          position: relative;
          border-radius: 34px;
          overflow: hidden;
          background: linear-gradient(180deg, rgba(10, 44, 70, 0.96), rgba(8, 31, 52, 0.97));
          border: 1px solid rgba(186, 237, 255, 0.2);
          box-shadow: 0 28px 65px rgba(2, 16, 29, 0.42);
          min-height: 440px;
          padding: 28px;
          animation: slideIn 0.9s ease 0.15s both;
        }

        .hero-preview::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(150deg, rgba(198, 246, 255, 0.13) 0%, transparent 36%);
          pointer-events: none;
        }

        .preview-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 26px;
          gap: 14px;
        }

        .preview-pill {
          padding: 12px 16px;
          border-radius: 999px;
          background: rgba(107, 221, 238, 0.2);
          color: #bcf5ff;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        .preview-title {
          font-size: 1.4rem;
          font-weight: 700;
          color: #fff;
          max-width: 260px;
          margin: 0;
        }

        .preview-list {
          display: grid;
          gap: 14px;
          margin-top: 20px;
        }

        .preview-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          border-radius: 22px;
          background: rgba(188, 239, 255, 0.08);
          border: 1px solid rgba(188, 239, 255, 0.22);
          transform: translateY(8px);
          opacity: 0;
          animation: cardIn 0.7s ease forwards;
        }

        .preview-item:nth-child(1) { animation-delay: 0.26s; }
        .preview-item:nth-child(2) { animation-delay: 0.34s; }
        .preview-item:nth-child(3) { animation-delay: 0.42s; }
        .preview-item:nth-child(4) { animation-delay: 0.5s; }

        .preview-item strong {
          color: #fff;
          font-size: 0.98rem;
        }

        .preview-item span {
          color: #bde9f7;
          font-size: 0.96rem;
        }

        .feature-band {
          position: relative;
          z-index: 1;
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 28px 72px;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(180px, 1fr));
          gap: 14px;
        }

        .feature-card {
          border-radius: 18px;
          border: 1px solid var(--line);
          background: var(--card);
          padding: 16px;
          backdrop-filter: blur(10px);
        }

        .feature-card h3 {
          margin: 0 0 7px;
          font-size: 0.98rem;
          color: #e8fbff;
        }

        .feature-card p {
          margin: 0;
          color: #a8cfde;
          font-size: 0.86rem;
          line-height: 1.55;
        }

        .role-band {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(4, minmax(140px, 1fr));
          gap: 10px;
        }

        .role-pill {
          border: 1px solid var(--line);
          border-radius: 14px;
          background: rgba(12, 44, 65, 0.75);
          color: #c6edf9;
          font-size: 0.84rem;
          padding: 10px 12px;
          text-align: center;
          font-weight: 600;
        }

        @keyframes streak {
          0% { transform: translateX(-26%) rotate(-7deg); opacity: 0; }
          10% { opacity: 0.35; }
          80% { opacity: 0.25; }
          100% { transform: translateX(18%) rotate(-7deg); opacity: 0; }
        }

        @keyframes riseIn {
          from { transform: translateY(18px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes slideIn {
          from { transform: translateX(18px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        @keyframes cardIn {
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes bubble {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-100vh) translateX(var(--tx, 0)) scale(0.8);
            opacity: 0;
          }
        }

        .bubble {
          position: fixed;
          bottom: -10px;
          width: 40px;
          height: 40px;
          background: radial-gradient(circle at 30% 30%, rgba(70, 213, 226, 0.4), rgba(13, 165, 192, 0.2));
          border: 1px solid rgba(70, 213, 226, 0.3);
          border-radius: 50%;
          pointer-events: none;
          z-index: 1;
          animation: bubble linear infinite;
        }

        .bubble:nth-child(1) { left: 10%; animation-duration: 8s; animation-delay: 0s; --tx: 50px; }
        .bubble:nth-child(2) { left: 20%; animation-duration: 10s; animation-delay: 1s; --tx: -30px; }
        .bubble:nth-child(3) { left: 30%; animation-duration: 9s; animation-delay: 2s; --tx: 40px; }
        .bubble:nth-child(4) { left: 40%; animation-duration: 11s; animation-delay: 0.5s; --tx: -50px; }
        .bubble:nth-child(5) { left: 50%; animation-duration: 8.5s; animation-delay: 1.5s; --tx: 30px; }
        .bubble:nth-child(6) { left: 60%; animation-duration: 9.5s; animation-delay: 2.5s; --tx: -40px; }
        .bubble:nth-child(7) { left: 70%; animation-duration: 10.5s; animation-delay: 0.8s; --tx: 45px; }
        .bubble:nth-child(8) { left: 80%; animation-duration: 9s; animation-delay: 1.8s; --tx: -35px; }
        .bubble:nth-child(9) { left: 90%; animation-duration: 11s; animation-delay: 2.2s; --tx: 50px; }

        @media (max-width: 960px) {
          .hero-grid {
            grid-template-columns: 1fr;
          }

          .feature-grid {
            grid-template-columns: 1fr 1fr;
          }

          .role-band {
            grid-template-columns: 1fr 1fr;
          }

          .navbar {
            padding: 18px 22px;
          }

          .hero-container {
            padding-top: 64px;
          }
        }

        @media (max-width: 680px) {
          .hero-copy h1 {
            font-size: 2.58rem;
          }

          .hero-copy p {
            font-size: 1rem;
          }

          .quick-facts {
            grid-template-columns: 1fr;
          }

          .feature-grid,
          .role-band {
            grid-template-columns: 1fr;
          }

          .hero-preview {
            min-height: 360px;
          }
        }
      `}</style>

      <div className="anime-wash"></div>
      <div className="bg-grid"></div>
      <div className="speed-lines"></div>
      <div className="cityline"></div>

      {/* Bubble animation */}
      <div className="bubble"></div>
      <div className="bubble"></div>
      <div className="bubble"></div>
      <div className="bubble"></div>
      <div className="bubble"></div>
      <div className="bubble"></div>
      <div className="bubble"></div>
      <div className="bubble"></div>
      <div className="bubble"></div>

      <header className="navbar">
        <LogoMark />

        <div style={{ display: "flex", gap: "14px" }}>
          <Btn variant="ghost" onClick={onLogin}>Sign In</Btn>
          <Btn variant="primary" onClick={onRegister}>Register</Btn>
        </div>
      </header>

      <main className="hero-container">
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">Anime Flow UI · Real Operations</div>
            <h1>Launch payroll missions with live clarity, not chaos.</h1>
            <p>
              A fast umbrella operations cockpit for agencies, payroll teams, contractors, and clients.
              Monitor deliverables, approve timesheets, run compliant payroll, and export branded documents
              from one kinetic command screen.
            </p>
            <div className="cta-group">
              <Btn variant="primary" onClick={onRegister}>Start free trial</Btn>
              <Btn variant="ghost" onClick={onLogin}>Login to platform</Btn>
            </div>
            <div className="quick-facts">
              <div className="fact-card">
                <div className="fact-value">4 Roles</div>
                <div className="fact-label">Unified Workflow</div>
              </div>
              <div className="fact-card">
                <div className="fact-value">Live RTI</div>
                <div className="fact-label">Payroll Controls</div>
              </div>
              <div className="fact-card">
                <div className="fact-value">PDF Brand</div>
                <div className="fact-label">Entity Aware Docs</div>
              </div>
            </div>
          </div>

          <section className="hero-preview">
            <div className="preview-top">
              <div className="preview-pill">Live Umbrella Summary</div>
              <div style={{ color: "#c2f5ff", fontSize: "0.92rem" }}>Secure · Useful · Fast</div>
            </div>
            <h2 className="preview-title">Mission board: payroll, compliance, payouts</h2>
            <div className="preview-list">
              <div className="preview-item"><strong>Invoice Pipeline</strong><span>Ready 14 · Paid 32</span></div>
              <div className="preview-item"><strong>Compliance Queue</strong><span>RTI Pending 3</span></div>
              <div className="preview-item"><strong>Next Payout Window</strong><span>Thu 11:30 AM</span></div>
              <div className="preview-item"><strong>Active Contractors</strong><span>132 Live</span></div>
            </div>
          </section>
        </div>
      </main>

      <section className="feature-band">
        <div className="feature-grid">
          <article className="feature-card">
            <h3>Smart Timesheet Gate</h3>
            <p>Catch leave overlaps and duplicate week submissions before payroll risk reaches finance.</p>
          </article>
          <article className="feature-card">
            <h3>Dynamic Branded Docs</h3>
            <p>Auto-switch invoice and payslip header/footer per legal entity or client override.</p>
          </article>
          <article className="feature-card">
            <h3>Dry-Run Payroll Engine</h3>
            <p>Preview net variance, deduction impact, and safeguard issues before committing payout.</p>
          </article>
        </div>

        <div className="role-band">
          <div className="role-pill">Agency: approvals and assignment</div>
          <div className="role-pill">Payroll: queue, HMRC, payouts</div>
          <div className="role-pill">Contractor: timesheet and payslip</div>
          <div className="role-pill">Client: deliverables and invoices</div>
        </div>
      </section>

    </div>
  );
}
