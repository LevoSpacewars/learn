---
slug: matrix-exponential-linear-odes
status: shaky
domain: math
updated: 2026-10-30T03:46:55.234Z
---
# Linear ODE systems and the matrix exponential

**Status:** shaky

**Serves:**
- HDX: exchange physics and structural interpretation → Derive the bleed.py forward model: CTMC + killing -> occupation times -> Poisson-binomial envelope, and get EX1/EX2 out of the spectrum
- Theoretical AI / ML architectures → Derive SSMs/Mamba: discretization, linear recurrence vs attention

**Lesson:** [[matrix-exponential-for-linear-odes-modes-of-the-li]] (open, 3/6 nodes) — R, D1 confirmed; D2 shaky: boundary (no c_i when p(0) off the span) landed, but the explain-back mechanism did not (ċ_i = λ_i c_i via substitution + matching coefficients by independence, not linearity). Next: one fresh completion on the two-mode substitution to close D2, then D3 (e^{Qt}, flaw check), D4, G.
**Book:** [[book/matrix-exponential-linear-odes|Linear ODE systems and the matrix exponential]] (the readings only, no cards)

## Misconceptions
- [open] believed "Matching the coefficients of v_1 and v_2 on both sides of ṗ = pQ is justified by the linearity of pQ." — truth: Linearity only splits pQ into c_1(v_1Q) + c_2(v_2Q); matching coefficients is justified by linear independence of the v_i (unique expansion). (for 1 / against 1)

## Evidence (24, latest first)
- 2026-10-30 recall/recall ✓ 90%
  - asked: We want the eigenvalues of $$Q = \begin{pmatrix} -k_{op} & k_{op} & 0 \\ k_{cl} & -(k_{cl}+k_{ch}) & k_{ch} \\ 0 & 0 & 0 \end{pmatrix},$$ so we write down $\det(Q - \lambda I) = 0$ with $$Q - \lambda I = \begin{pmatrix} -k_{op}-\lambda & k_{op} & 0 \\ k_{cl} & -(k_{cl}+k_{ch})-\lambda & k_{ch} \\ 0 & 0 & -\lambda \end{pmatrix}.$$ Before expanding the full $3\times 3$ determinant: what is the next…
  - answered: photo: work-20261029-204623.png
- 2026-10-21 recall/explain ✓ 87%
  - asked: Handle you own: $\dot c = \lambda c$ has solution $c(0)e^{\lambda t}$ with $e^{\lambda t} = \sum_k \frac{(\lambda t)^k}{k!}$, and a left eigenvector satisfies $v_i Q = \lambda_i v_i$. Fresh matrix: $Q = \begin{pmatrix} -4 & 4 \\ 2 & -2 \end{pmatrix}$, with $v_1 = (1,2)$, $\lambda_1 = 0$ and $v_2 = (1,-1)$, $\lambda_2 = -6$. On paper, get from the handle to $e^{Qt}$ for this $Q$, saying at each mo…
  - answered: photo: work-20261020-213921-1.png, work-20261020-213921-2.png, work-20261020-213921-3.png, work-20261020-213921-4.png, work-20261020-213921-5.png, work-20261020-213921-6.png
  - first error: In step 2 the superposition is written as $p(t)=\sum_i e^{\lambda_i t}v_i$, without the coefficients $c_i$ from $p(0)=\sum_i c_iv_i$.
- 2026-10-21 recall/flaw ✓ 90%
  - asked: Drill-down, one step. You have $VQ = \Lambda V$ with $V$ invertible. Multiply both sides by $V^{-1}$ on the correct side so that $Q$ stands alone, and write the resulting formula for $Q$. Say which side you multiplied on and why that side.
  - answered: photo: work-20261020-194025-1.png, work-20261020-194025-2.png
- 2026-10-21 recall/flaw ✗ 0%
  - asked: A colleague writes: "Let $V$ have the left eigenvectors of $Q$ as its rows and $\Lambda = \mathrm{diag}(\lambda_i)$. The eigenvector equations $v_i Q = \lambda_i v_i$ stack to $$VQ = \Lambda V.$$ Since the $v_i$ are independent, $V$ is invertible, so we can solve for $Q$: $$Q = V \Lambda V^{-1}.$$ Then $Q^k = V\Lambda^k V^{-1}$ because the inner $V^{-1}V$ pairs cancel, and summing the series, $$e…
  - answered: photo: work-20261020-193711.png
  - first error: Accepted the argument; missed that $Q = V\Lambda V^{-1}$ does not follow from $VQ = \Lambda V$.
- 2026-10-21 recall/problem ◐ 60%
  - asked: $Q = \begin{pmatrix} -1 & 1 \\ 2 & -2 \end{pmatrix}$. Left eigenvectors: $v_1 = (2,1)$ with $\lambda_1 = 0$, and $v_2 = (1,-1)$ with $\lambda_2 = -3$. Stacked: $V = \begin{pmatrix} 2 & 1 \\ 1 & -1 \end{pmatrix}$, $\Lambda = \mathrm{diag}(0,-3)$, and (already inverted for you) $V^{-1} = \begin{pmatrix} 1/3 & 1/3 \\ 1/3 & -2/3 \end{pmatrix}$. **Blank:** compute $e^{Qt} = V^{-1} e^{\Lambda t} V$ exp…
  - answered: photo: work-20261020-192538-1.png, work-20261020-192538-2.png, work-20261020-192538-3.png
  - first error: $e^{\Lambda t}V$ written as $\begin{pmatrix}2&1\\1&-e^{-3t}\end{pmatrix}$: the factor $e^{-3t}$ was applied only to the $(2,2)$ entry instead of the whole second row.
- 2026-10-21 recall/recall ✓ 92%
  - asked: Stack the left eigenvectors as rows of $V$ and the eigenvalues on the diagonal of $\Lambda$. The $n$ equations $v_i Q = \lambda_i v_i$ become $$VQ = \Lambda V.$$ We want a formula for $Q^k$ that makes the series $\sum_k \frac{Q^k t^k}{k!}$ collapse. What is the next move from $VQ = \Lambda V$, and what property of the eigenvectors does it rely on?
  - answered: photo: work-20261020-185351.png
- 2026-10-21 recall/recall ✓ 85%
  - asked: We have defined $e^{Qt} = \sum_{k} \frac{(Qt)^k}{k!}$ and shown it solves $\dot p = pQ$. Now we want to see that $p(0)e^{Qt}$ is the superposition formula. Take a left eigenvector $v_i$ with $v_i Q = \lambda_i v_i$, and write $$v_i\, e^{Qt} = \sum_k \frac{t^k}{k!}\, v_i Q^k.$$ What is the next move on $v_i Q^k$, and why is that the move that gets us to $e^{\lambda_i t} v_i$?
  - answered: We can take viQ and substitute it with lambda_i vi where lambda is raised by k. Because now we’ve got lambda in thr power series that represnts the exponential
- 2026-10-19 recall/explain ◐ 45% (conf 70%)
  - asked: $Q = \begin{pmatrix} -2 & 2 \\ 1 & -1 \end{pmatrix}$ with $v_1 = (1,2)$, $\lambda_1 = 0$ and $v_2 = (1,-1)$, $\lambda_2 = -3$. Write $p = c_1 v_1 + c_2 v_2$. Right side: $pQ = c_1\,(v_1 Q) + c_2\,(v_2 Q) = 0\cdot c_1\, v_1 + (-3)\,c_2\, v_2$. Left side: $\dot p = \dot c_1\, v_1 + \dot c_2\, v_2$. Setting $\dot p = pQ$ and matching the $v_2$ coefficients gives $\dot c_2 = \underline{\quad}$. Fill …
  - answered: photo: work-20261018-205246.png
  - first error: The reason "linearity of $pQ$" does not justify matching coefficients. That step depends on $v_1, v_2$ being linearly independent, so the expansion is unique.
- 2026-10-19 recall/explain ◐ 45% (conf 0%)
  - asked: You expanded $p(0) = c_1 v_1 + c_2 v_2$ with $v_1 Q = \lambda_1 v_1$ and $v_2 Q = \lambda_2 v_2$. Write $c_1(t)$ explicitly in terms of $c_1$ and $\lambda_1$, and name the one-line reason (which equation the coefficient of mode 1 obeys, and why linearity lets mode 2 ride along without interfering).
  - answered: photo: work-20261018-204814.png
  - first error: No equation is given for the mode-1 coefficient: $\dot c_1 = \lambda_1 c_1$ and its origin in $v_1 Q = \lambda_1 v_1$ are missing.
- 2026-10-19 recall/explain ◐ 45% (conf 90%)
  - asked: Explain superposition back to me. Given $\dot p = pQ$, $p(0)$ arbitrary, and left eigenvectors $v_i$ with $v_i Q = \lambda_i v_i$: (a) what is the recipe for $p(t)$, and (b) which two facts make it valid? Relate it to D1, which you already own: along one eigenvector, $p(t) = c(0)e^{\lambda t} v$.
  - answered: photo: work-20261018-204334.png
  - first error: In (a), $c_i(t)$ is left unspecified: there is no $c_i(0)e^{\lambda_i t}$ and no statement of how the $c_i$ come from $p(0)$.
- 2026-10-19 recall/boundary ✓ 88% (conf 100%)
  - asked: Only two independent left eigenvectors: $v_1 = (1, 1, 0)$ and $v_2 = (1, -1, 0)$. You want to expand $p(0) = (0.6, 0.2, 0.2)$ as $c_1 v_1 + c_2 v_2$. The third component of $c_1 v_1 + c_2 v_2$ equals $\underline{\quad}$ for every choice of $c_1, c_2$, while the third component of $p(0)$ is $0.2$. Fill in the blank and state in a few words what that means for the $c_i$.
  - answered: photo: work-20261018-203645.png
- 2026-10-19 recall/boundary ◐ 50% (conf 55%)
  - asked: $Q$ is $3\times 3$ with only two independent left eigenvectors $v_1, v_2$. You pick a $p(0)$ that is **not** in the plane spanned by $v_1$ and $v_2$. Which step of the superposition recipe fails for this $p(0)$: finding the $c_i$, or evolving each term with $e^{\lambda_i t}$? Say what fails in one line.
  - answered: photo: work-20261018-202944.png
  - first error: The reason given, 'no longer analytically solvable', does not say that $p(0)$ lies outside the span of $v_1, v_2$.
- 2026-10-19 recall/boundary ◐ 45% (conf 15%)
  - asked: Superposition says: expand $p(0) = \sum_i c_i v_i$ in left eigenvectors, then $p(t) = \sum_i c_i e^{\lambda_i t} v_i$. Two parts: 1. Which property of the set $\{v_i\}$ did this silently assume, and when is it guaranteed? 2. Concretely, what goes wrong if $Q$ is $3\times 3$ but has only two linearly independent left eigenvectors?
  - answered: photo: work-20261018-202437.png
  - first error: Part 1's guarantee, 'when $v_i$ is solved from the eigenvalue', is not a condition that ensures spanning.
- 2026-10-19 recall/recall ◐ 60% (conf 60%)
  - asked: $Q = \begin{pmatrix} -2 & 2 \\ 1 & -1 \end{pmatrix}$. The row vector $v = (1,-1)$ is a left eigenvector: $vQ = (-3, 3) = -3\,v$, so $\lambda = -3$. If $p(0) = 0.2\,(1,-1)$, write $p(t)$ explicitly, and say in one line why the direction $(1,-1)$ never changes.
  - answered: photo: work-20261018-201436.png
  - first error: The reason "it has no dependency on time" is circular; it does not invoke $vQ = -3v$.
- 2026-10-17 recall/recall ◐ 65% (conf 0%)
  - asked: Given $\dot c = \lambda c$ and $c(0)$, write $c(t)$ explicitly. Then, for $Q = \begin{pmatrix} -1 & 1 \\ 4 & -4 \end{pmatrix}$ with $p(0) = 0.1\,(1,-1)$ (eigenvalue $-5$), write $p(t)$.
  - answered: photo: work-20261017-123805.png
  - first error: In $p(t) = 0.1\,(1,-1)\cdot c(0)\,e^{-5t}$, the factor $c(0)$ appears alongside $0.1$, even though $0.1$ is itself the initial coefficient $c(0)$.
- 2026-10-17 recall/explain ◐ 45% (conf 20%)
  - asked: In your own words: if $p(0)$ is a multiple of a left eigenvector $v$ of $Q$ with eigenvalue $\lambda$, what does $p(t)$ do for all later times, and why? Name the two facts it rests on (the scalar ODE you already know, and the eigenvector property).
  - answered: that means the p(t) distribution stays stationary, but it get's rescaled through time via c(t). What I mean by that is that through the rest of time, p(t) will be some scalar function multiplied by p(0).
  - first error: No justification given: neither $vQ=\lambda v$ nor the scalar ODE $\dot c=\lambda c$ is named, and the rescaling factor $c(t)$ is left unspecified instead of $e^{\lambda t}$.
- 2026-10-17 recall/explain ✓ 95% (conf 30%)
  - asked: Fill in the single blank, then state the equation you get for $c(t)$ after matching the two sides: $$pQ = (c\,v)\,Q = c\,(vQ) = \;\underline{\qquad\qquad}\;$$ Equating $\dot c\, v = [\text{your blank}]$ gives $\dot c = \;?$
  - answered: photo: work-20261017-122051.png
- 2026-10-17 recall/explain hint
  - asked: $Q = \begin{pmatrix} -2 & 2 \\ 3 & -3 \end{pmatrix}$ per second, and $v = (1, -1)$ satisfies $vQ = -5\,v$ (you may use this). Start at $p(0) = 0.3\,v$. Assume $p(t) = c(t)\,v$. Substitute into $\dot p = pQ$, show the step where the matrix disappears, and give $c(t)$ and $p(t)$.
- 2026-10-16 recall/explain ✓ 92% (conf 65%)
  - asked: $Q = \begin{pmatrix} -2 & 2 \\ 3 & -3 \end{pmatrix}$ per second. Find a left eigenvector $v = (a, b)$ with $vQ = 0$, and say in one line what that row means physically.
  - answered: photo: work-20261015-204756-1.png, work-20261015-204756-2.png
- 2026-10-16 recall/predict ◐ 65% (conf 0%)
  - asked: $Q = \begin{pmatrix} -1 & 1 \\ 4 & -4 \end{pmatrix}$ has eigenvalues $0$ and $-5$. Quick guess: what physical thing is the left eigenvector with eigenvalue $0$ (a row $v$ with $vQ = 0$), and what does $\lambda = 0$ say about how it changes in time?
  - answered: SOrry, I walked away. I don't know what the physcial thing is but for this it coule be counts/population and if lambda is 0 then it means it must be entirely static?
  - first error: You identified $v$ only vaguely as "counts/population," not as the specific distribution over states that stays fixed.
- 2026-10-16 recall/recall ✗ 10% (conf 0%)
  - asked: Suppose at some moment $p$ happens to be a multiple of a left eigenvector: $p(t) = c(t)\,v$ with $vQ = \lambda v$. Substitute into $\dot p = pQ$ and write the ODE that $c(t)$ obeys, then its solution.
  - answered: photo: work-20261015-193346-1.png, work-20261015-193346-2.png
  - first error: The first line writes $pQ = c(t)\vec v$, which mixes up $p = c\,v$ with $pQ$. After that, $vQ = \lambda v$ is never used.
- 2026-10-15 quiz ✗ (conf 0%)
  - asked: For the master equation $\dot p = pQ$, where do the eigenvalues of $Q$ show up in the solution $p(t)$?
  - answered: As the stationary populations: p(∞)ᵢ = λᵢ after normalising
  - first error: chose: As the stationary populations: p(∞)ᵢ = λᵢ after normalising; correct: As the exponents: p(t) is a sum of terms cᵢ e^(λᵢ t)
- 2026-10-15 recall/problem ◐ 70% (conf 20%)
  - asked: Find both eigenvalues of $$A = \begin{pmatrix} -1 & 1 \\ 4 & -4 \end{pmatrix}.$$ Show the equation you solve. If you don't know how, say so.
  - answered: photo: work-20261014-215253.png
  - first error: Going from $5\lambda + \lambda^2 = 0$ to the boxed $\lambda = -5$ drops the root $\lambda = 0$.
- 2026-10-15 recall/recall ◐ 75% (conf 20%)
  - asked: In one or two lines: what does it mean for a vector $v$ to be an eigenvector of a square matrix $A$ with eigenvalue $\lambda$? Write the defining equation and say in words what $A$ does to $v$.
  - answered: it means that there exists a scalar value to rescale a vector that produces the product of that same vector times a matrix. Which means A just rescales v
  - first error: The requirement $v \neq 0$ is never stated.
