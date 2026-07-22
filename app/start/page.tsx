import Link from "next/link";

export default function StartPage() {
  return (
    <main className="route-screen route-screen-light">
      <section className="route-choice-shell">
        <div className="route-choice-header">
          <span className="route-eyebrow">Choose your path</span>
          <h1>What do you want to do first?</h1>
          <p>
            You can go straight into job discovery or open the AI assistant in
            its own workspace. Both pages link to each other so you can switch
            anytime.
          </p>
        </div>

        <div className="route-choice-grid">
          <article className="route-choice-card">
            <span className="route-choice-index">01</span>
            <h2>Look for openings</h2>
            <p>
              Fill in your degree, experience, preferred mode, location, skills,
              and role focus, then view ranked matches on a separate results page.
            </p>
            <Link className="route-primary-button" href="/openings">
              Start openings flow
            </Link>
          </article>

          <article className="route-choice-card">
            <span className="route-choice-index">02</span>
            <h2>Chat with AI</h2>
            <p>
              Get career guidance, resume reviews, interview preparation,
              learning roadmaps, and answers to your career questions.
            </p>
            <Link className="route-primary-button" href="/assistant">
              Open AI workspace
            </Link>
          </article>
        </div>
      </section>
    </main>
  );
}
