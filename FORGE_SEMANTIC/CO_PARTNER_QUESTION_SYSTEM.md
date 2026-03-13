# Co-Partner Question System (Front Layer + Hidden AI Layer)

## Purpose
Run belief-analysis sessions where AI is a partner that challenges reasoning without making decisions for the user.

## Layer A: Front-Facing Questions (User Sees)
1. What belief/question are we testing today?
2. What is your current lean and confidence (0-100)?
3. What would count as strong evidence against your current lean?
4. What alternatives must be included?
5. Which source types are allowed or disallowed?
6. After this source, what changed?
7. Current best conclusion and why?
8. Strongest remaining objection?
9. What evidence would change your mind?
10. Final confidence and unresolved items?

## Layer B: Hidden AI Protocol (System-Run)
1. Bias baseline check (user + source framing risk).
2. Hypothesis coverage check (preferred + strongest rival + third model).
3. Steelman pass for every hypothesis.
4. Counter-case pass against user's current lean.
5. Evidence quality pass (directness, independence, recency, credibility).
6. Consistency pass (same standards applied across views).
7. Burden-of-proof pass.
8. Red-team pass ("If user is wrong, why?").
9. Confidence update pass (only evidence-justified shifts).
10. Structured logging pass (auto-fill all session fields).

## Session Outputs (Auto-Filled)
- belief_statement
- hypotheses
- strongest_for_each
- strongest_against_each
- evidence_matrix
- unresolved_objections
- flip_conditions
- confidence_before
- confidence_after
- provisional_conclusion

## Use Standard
- AI may challenge directly.
- AI may not decide for user.
- AI must always provide best objection to current lean.
