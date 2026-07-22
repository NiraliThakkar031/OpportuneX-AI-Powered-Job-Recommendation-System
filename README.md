# Opportunex 🚀
### AI-Powered Career Discovery & Job Recommendation Platform

Opportunex is an AI-driven job recommendation platform that matches users with relevant career opportunities based on their education, skills, experience, preferred roles, location, and career preferences.

Unlike traditional job portals that rely solely on keyword searches, Opportunex uses a profile-based recommendation engine to rank opportunities according to how well they match each user's background.

---

## Features

- AI-based job recommendation engine
- Personalized job ranking
- Multi-source job aggregation
- Skill-based matching
- Role-based query expansion
- Education & experience filtering
- Employment type and workplace preference matching
- Explainable recommendations
- Responsive and modern UI
- Built with Next.js App Router

---

## Current Architecture

```
User Profile
      │
      ▼
Profile Normalization
      │
      ▼
Role Query Generation
      │
      ▼
Multiple Job Sources
(Greenhouse • Adzuna • Jooble)
      │
      ▼
Job Normalization
      │
      ▼
Duplicate Removal
      │
      ▼
AI Scoring Engine
      │
      ▼
Explanation Builder
      │
      ▼
Ranked Recommendations
```

---

## Tech Stack

### Frontend

- Next.js 16
- React
- TypeScript
- CSS

### Backend

- Next.js API Routes
- TypeScript

### Recommendation Engine

- Profile Normalization
- Query Expansion
- Skill Matching
- Weighted Scoring Algorithm
- Explanation Generator

---

## Project Structure

```
app/
│
├── api/
│   └── jobs/
│
├── openings/
│
└── ...

lib/
│
├── profile.ts
├── queryBuilder.ts
├── scoring.ts
├── explainer.ts
├── constants.ts
├── types.ts
│
├── normalizers/
│
└── sources/
    ├── greenhouse.ts
    ├── jooble.ts
    ├── adzuna.ts
    └── normalize.ts
```

---

## Recommendation Process

1. User fills career profile.
2. Profile is normalized.
3. Role queries are generated.
4. Jobs are fetched from multiple sources.
5. Duplicate jobs are removed.
6. Each job is scored using weighted matching.
7. AI explanations are generated.
8. Best matches are returned to the user.

---

## Matching Parameters

Current recommendations consider:

- Education
- Skills
- Experience
- Preferred Roles
- Preferred Domain
- Preferred Location
- Employment Type
- Workplace Preference
- Certifications
- Job Freshness

---

## Current Job Sources

- Greenhouse
- Adzuna
- Jooble

---

## Planned Integrations

### International

- Lever
- Workable
- Careerjet
- Remotive
- WHO Careers
- UN Careers

### India

- National Career Service (NCS)
- Employment News
- UPSC
- SSC
- Railway Recruitment
- PSUs

### Healthcare

- AIIMS
- NIMHANS
- PGIMER
- ICMR
- NHM

### Education

- IITs
- NITs
- IIITs
- Central Universities
- State Universities
- Research Institutes

### Company Career Portals

- TCS
- Infosys
- Wipro
- HCL
- Cognizant
- Capgemini
- Reliance
- Jio
- Airtel
- Tata Steel
- Larsen & Toubro

---

## Installation

Clone the repository

```bash
git clone <repository-url>
```

Install dependencies

```bash
npm install
```

Run development server

```bash
npm run dev
```

Open

```
http://localhost:3000
```

---

## Environment Variables

Create a `.env.local` file.

Example:

```env
JOOBLE_API_KEY=your_key
ADZUNA_APP_ID=your_id
ADZUNA_APP_KEY=your_key
```

---

## Current Status

### Completed

- Project structure
- Frontend UI
- Profile collection
- Recommendation pipeline
- Greenhouse integration
- Jooble integration
- Adzuna integration
- Job scoring engine
- Recommendation explanations

### In Progress

- More job source integrations
- Indian-first location prioritization
- Healthcare & allied sciences expansion
- Government recruitment sources
- Institute recruitment sources
- Enhanced recommendation algorithm

---

## Future Improvements

- Resume parsing
- AI resume feedback
- Cover letter generation
- Internship recommendations
- Company insights
- Salary prediction
- Skill gap analysis
- Learning roadmap generation
- Job alerts
- Bookmarking
- Authentication
- Admin dashboard

---

## Contributors

Developed as a Major Project for career recommendation and intelligent job discovery.

---

## License

This project is intended for educational and research purposes.