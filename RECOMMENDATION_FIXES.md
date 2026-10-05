# OpportuneX v27 – Recommendation Precision Update

## Fixed

### 1. Role-aware candidate retrieval
The selected preferred role now affects the candidate pool before semantic/vector ranking. Different roles in the same broad domain therefore do not start from the same job list.

### 2. Role-specific title matching
Added deterministic role affinity with aliases for common roles such as Software Engineer, Data Scientist, Data Engineer, ML Engineer, DevOps Engineer, Cloud Engineer, Cybersecurity Analyst, Product Manager, Project Manager, Business Analyst, Accountant, and Financial Analyst.

Specific title modifiers are retained so titles such as `Software Engineer, Internal Systems` and `Software Engineer, Intern` are not treated as identical role intent.

### 3. Controlled sparse-domain fallback
If a role has fewer matching openings, the system falls back to the closest same-domain jobs instead of returning an empty page. The fallback is still role-ranked.

### 4. Unknown-domain handling
Jobs whose domain could not be confidently classified are no longer automatically discarded. They can enter role-aware retrieval when the selected domain is otherwise sparse, while known cross-domain jobs remain excluded.

### 5. Ranking weights
Final relevance now gives more deterministic weight to actual role fit and slightly less weight to generic domain/full-text similarity.

### 6. Cache version
The recommendation cache/embedding version was incremented so old recommendation results are not reused after the logic change.

## Files changed

- `app/api/jobs/route.ts`
- `lib/recommendation/semantic.ts`

No UI pages, authentication, database schema, job source connectors, or existing project features were intentionally changed.

## Important

After replacing the old project with this ZIP, run the normal dependency/database setup from the project README and restart the Next.js server. Existing stored job embeddings remain usable; the cache version change forces recommendation recalculation.
