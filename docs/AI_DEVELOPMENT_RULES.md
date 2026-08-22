# AI Development Rules

Revenue Sentinel is being developed with AI coding assistants.

## Rules

1. AI agents implement only the assigned milestone.
2. Agents must inspect existing code before modifying it.
3. Agents must not rewrite unrelated modules.
4. Agents must not change API contracts without approval.
5. Agents must not introduce secrets.
6. Agents must not claim functionality is complete without testing it.
7. AI recommendations must pass through deterministic business rules.
8. Financial calculations must be deterministic.
9. AI output must be schema validated.
10. Interventions must have explicit boundaries.
11. Every intervention must be auditable.
12. Every milestone must have test evidence.
13. Do not fake production integrations.
14. Do not perform uncontrolled real-money operations.
15. Git commits must represent genuine development milestones.