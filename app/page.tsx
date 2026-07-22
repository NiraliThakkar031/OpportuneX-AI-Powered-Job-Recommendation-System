import Link from "next/link";

export default function Home() {
  return (
    <main className="route-screen route-screen-light">
      <section className="route-hero-card">
        <span className="route-eyebrow">OpportuneX</span>

        <div className="route-copy route-section-gap">
          <h1>Find openings, understand your fit, and move with clarity.</h1>
          <p>
            OpportuneX is a frontend job discovery prototype built around a
            clean multi-page experience. It shows how openings, fit scoring,
            and assistant guidance can work together in one simple UI.
          </p>

          <div className="route-actions">
            <Link className="route-primary-button" href="/start">
              Continue to setup
            </Link>
          </div>
        </div>

        <div className="route-info-stack route-section-gap">
          <article className="route-info-card">
            <strong>Frontend preview</strong>
            <p>Shows the full product flow without backend files or server routes.</p>
          </article>
          <article className="route-info-card">
            <strong>Match percentage</strong>
            <p>Scores demo openings against role fit, skills, education, location, and mode preferences.</p>
          </article>
          <article className="route-info-card">
            <strong>AI guidance</strong>
            <p>Answers app questions, helps with career choices, and suggests skills to build next.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
