---
slug: let-s-continue-from-the-last-lesson
status: unknown
updated: 2026-10-07T05:09:51.592Z
---
# HDX kinetics math (rates, Markov chains, first-order decay)

**Status:** unknown

**Lesson:** [[let-s-continue-from-the-last-lesson]] (paused) — Stopped during the probe (no plan yet). Mapped so far (see this note and lessons/i-had-ai-build-an-application-for-me-and-i-wanted-.md): rate meaning = open misconception; 2x2 transition matrix correct, two-step propagation unclear; row-vector times matrix correct; first-order decay dS/dt = -kS was read as dS/dt = -k (linear vs exponential). Next: finish the probe quickly (at most 2 more questions), present the plan, start teaching from first-order decay.

## Evidence (8, latest first)
- 2026-10-07 recall/recall ✗ 5% (conf 70%)
  - asked: A quantity $S(t)$ obeys $$\frac{dS}{dt} = -k\,S, \qquad S(0)=1.$$
  - answered: photo
  - first error: Copying the equation as dS/dt = -k, dropping the factor S on the right-hand side; this led to S = 1 - kt instead of an exponential.
- 2026-10-07 recall/recall ◐ 70% (conf 100%)
  - asked: Pure arithmetic, no probability. Let $$A = \begin{pmatrix} 2 & 1 \\ 0 & 3 \end{pmatrix}, \qquad \mathbf{v} = (1,\ 4) \text{ (a row vector).}$$ Compute the row vector $\mathbf{v}A$. Then say in one line what $\mathbf v A$ is in terms of the rows of $A$.
  - answered: photo
  - first error: Did not answer the second part: no description of vA in terms of the rows of A.
- 2026-10-07 recall/recall ◐ 40% (conf 10%)
  - asked: A protein flips between two conformations, **C** (closed) and **O** (open), checked once per nanosecond (discrete time). Each step: - from C: stays C with prob $0.9$, goes to O with prob $0.1$ - from O: goes to C with prob $0.5$, stays O with prob $0.5$   Work on paper and send a photo from the `/phone` page, or type it. If part of it is unfamiliar, give your best guess for that part instead of sk
  - answered: photo
  - first error: Part 2: the step-2 combination ('{0.9,0.1}⊗{0.9,0.1} + {0.9,0.1}⊗{0.5,0.5}') is not well-defined and is never evaluated to a final distribution.
- 2026-10-07 recall/recall ✗
  - asked: A protein flips between two conformations, **C** (closed) and **O** (open), checked once per nanosecond (discrete time). Each step: - from C: stays C with prob $0.9$, goes to O with prob $0.1$ - from O: goes to C with prob $0.5$, stays O with prob $0.5$
- 2026-10-07 recall/recall ✗ 0% (conf 0%)
  - asked: A protein flips between two conformations, **C** (closed) and **O** (open), checked once per nanosecond (discrete time). Each step: - from C: stays C with prob $0.9$, goes to O with prob $0.1$ - from O: goes to C with prob $0.5$, stays O with prob $0.5$
  - answered: give me  phone for photo
  - first error: No answer was provided for part 1. The submission is a request to upload a photo, not a solution.
- 2026-10-07 recall/predict ◐ 30% (conf 50%)
  - asked: Same setup, but now a fast site: $k = 3\ \text{s}^{-1}$. It starts unexchanged.  What is the probability it has exchanged **by** $t = 1$ s? Give a number (rough is fine) and say how you got it.
  - answered: I took the integral of e(-3t)dt from 0 to 1. I got 1/3(1-e^-3)
  - first error: They used e^{-3t} as the probability density instead of 3e^{-3t}. The density is missing the rate factor k.
- 2026-10-07 quiz ✗ (conf 100%)
  - asked: A site that hasn't exchanged yet has exchange rate $k = 0.1\ \text{s}^{-1}$. Which statement is what that rate literally means?
  - answered: 4. In any 1 s interval, a not-yet-exchanged site exchanges with probability exactly $0.1$
- 2026-10-07 recall/recall ◐ 40% (conf 30%)
  - asked: A single amide hydrogen exchanges with solvent deuterium irreversibly, at a constant rate $k$ (per second). It starts unexchanged at $t=0$.  What is the probability it is **still unexchanged** at time $t$? And *why* that form — what assumption about the exchange process gives it?
  - answered: e^(-kt). This can be derived from free energy I believe.
  - first error: Attributes the exponential form to free energy instead of the constant-rate / memoryless assumption (dS/dt = -kS).
