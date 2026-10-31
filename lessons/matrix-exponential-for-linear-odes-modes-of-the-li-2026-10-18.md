# Matrix exponential for linear ODEs: modes of the Linderstrøm-Lang chain



> [!quote] YOU

> [!note] SKILL loaded: teach

Continue the lesson "Matrix exponential for linear ODEs: modes of the Linderstrøm-Lang chain" (slug: matrix-exponential-linear-odes). Time budget: 50 min.


> [!abstract] PI

Picking up the matrix-exponential lesson at D2 (superposition). First a quick warm-up on D1, then a short D2 reading leading into the 3-state chain.

Where we are: you already own the key move. If $p(0)$ lies along a left eigenvector $v$ of $Q$ (so $vQ = \lambda v$), then $p(t) = c(0)\,e^{\lambda t}\,v$: the direction is frozen and only the scalar coefficient moves. Last time you also split $(1.5,-1)$ into "stationary piece plus decaying piece" in the Q&A. Today we make that splitting official (D2, superposition), see what breaks if the eigenvectors don't span the space, then define $e^{Qt}$ and finally read the 3-state Linderstrøm-Lang spectrum off the matrix, where the slow eigenvalue is $k_{obs}$.


> [!question] Question
> Anything you want to discuss before the first question?
>
> First up is a one-line warm-up on the D1 idea (eigenvector direction frozen, scalar coefficient decays), then the D2 reading.
>
> 1. Ready, ask the first question
> 2. I want to discuss first


> [!example] Answer
> 1. Ready, ask the first question


> [!abstract] PI

## Reading — Superposition: split p(0) into modes, let each decay on its own

## Why we need this now

D1 solved the ODE $\dot p = pQ$ only in one special case: when $p(0)$ already points along a left eigenvector $v$. Then $p(t) = c(0)\,e^{\lambda t}\,v$. But a real starting distribution, say $p(0) = (1, 0)$ ("site starts closed"), almost never points along an eigenvector. So D1 alone is useless for actual initial conditions. We need a way to use it anyway.

## The move, and how you could have found it

Two facts you already own:

1. **The equation is linear.** If $p_1(t)$ and $p_2(t)$ both solve $\dot p = pQ$, then so does $p_1 + p_2$, because $(p_1+p_2)Q = p_1 Q + p_2 Q$. Matrix multiplication distributes over addition; that is the whole reason.
2. **D1:** along each eigenvector the solution is $c_i(0)\,e^{\lambda_i t}\,v_i$.

Put them together. If you can *write* $p(0)$ as a sum of eigenvectors,
$$p(0) = c_1 v_1 + c_2 v_2 + \dots + c_n v_n,$$
then each piece evolves on its own by D1, and by linearity the sum of the evolved pieces is the solution:
$$p(t) = \sum_i c_i\, e^{\lambda_i t}\, v_i .$$

That is **superposition**. Nothing new was derived; we only noticed that linearity lets us add D1 solutions, and that finding the $c_i$ is just solving a linear system (expand $p(0)$ in the basis $\{v_i\}$).

The one thing this needs: the eigenvectors must **span** the space, so that *every* $p(0)$ can be written this way. For $n$ distinct eigenvalues this is automatic. Keep that condition in mind; it is the boundary of the method.

## Worked instance

$Q = \begin{pmatrix} -1 & 1 \\ 4 & -4 \end{pmatrix}$, eigenvalues $0$ and $-5$. You found the left eigenvectors before:
- $\lambda_1 = 0$: $v_1 = (4, 1)$ (check: $v_1 Q = (-4+4,\ 4-4) = (0,0)$).
- $\lambda_2 = -5$: $v_2 = (1, -1)$ (check: $v_2 Q = (-1-4,\ 1+4) = (-5, 5) = -5\,v_2$).

Start closed: $p(0) = (1, 0)$. Step 1, expand in the eigenbasis: solve $(1,0) = c_1 (4,1) + c_2 (1,-1)$.
Second component: $c_1 - c_2 = 0$, so $c_2 = c_1$. First component: $4c_1 + c_2 = 5c_1 = 1$, so $c_1 = c_2 = 0.2$.
Check: $0.2(4,1) + 0.2(1,-1) = (0.8+0.2,\ 0.2-0.2) = (1, 0)$. ✓

Step 2, let each mode go by D1:
$$p(t) = 0.2\,e^{0\cdot t}(4,1) + 0.2\,e^{-5t}(1,-1) = (0.8 + 0.2 e^{-5t},\ \ 0.2 - 0.2 e^{-5t}).$$

Read it: at $t=0$ it is $(1,0)$ ✓. As $t \to \infty$ the second mode dies and $p \to (0.8, 0.2)$, the stationary distribution (the $\lambda = 0$ eigenvector, normalised). The approach is a single exponential with rate $5 = |\lambda_2|$. Note the total $0.8+0.2 e^{-5t} + 0.2 - 0.2e^{-5t} = 1$ always: the decaying mode $(1,-1)$ sums to zero, so it moves probability around without creating or destroying it. That is exactly why you called it a deviation, not a population.

## What it hangs off

- **D1** gives each term $c_i e^{\lambda_i t} v_i$.
- **Linearity of $pQ$** lets you add the terms.
- **Spanning eigenvectors** lets you expand any $p(0)$ in the first place. Hold that one: the check next asks what happens when it fails.


> [!example] Reading — read ✓
> Read it; ready for the question.


> [!abstract] PI

Quick warm-up on D1 first, fresh numbers. One line of justification is enough.


> [!question] Recall — Recall
> $Q = \begin{pmatrix} -2 & 2 \\ 1 & -1 \end{pmatrix}$. The row vector $v = (1,-1)$ is a left eigenvector: $vQ = (-3, 3) = -3\,v$, so $\lambda = -3$. If $p(0) = 0.2\,(1,-1)$, write $p(t)$ explicitly, and say in one line why the direction $(1,-1)$ never changes.


> [!warning] Recall — partial ◐ (60%)
> Your answer (photo):
> ![[work-20261018-201436.png|500]]
> Confidence: 60% · 26861s
> Read as: The learner wrote $v=(1,-1)$, $\lambda=-3$, and boxed $p(t) = 0.2\,e^{-3t}\,(1,-1)$. For the reason they wrote: "$(1,-1)$ never changes because it has no dependency on time. It represents the deviation away from the stationary distribution which is $(0,0)$."
> First error: The reason "it has no dependency on time" is circular; it does not invoke $vQ = -3v$.
>
> Your $p(t) = 0.2\,e^{-3t}\,(1,-1)$ is exactly right, with the correct coefficient and rate. The justification only observes that $(1,-1)$ has no $t$ in your formula. It does not say why the dynamics keep $p$ along that direction, which is the eigenvector property $vQ = -3v$ making $\dot p$ parallel to $v$. Also, the stationary distribution itself is not $(0,0)$; it is the deviation from stationarity that decays to $(0,0)$.


> [!abstract] PI

Formula right. The reason is the eigenvector property: $pQ = c\,vQ = -3c\,v$ stays parallel to $v$, so the dynamics can't rotate it. Now the boundary of D2.


> [!question] Recall — Boundary
> Superposition says: expand $p(0) = \sum_i c_i v_i$ in left eigenvectors, then $p(t) = \sum_i c_i e^{\lambda_i t} v_i$. Two parts:
>
> 1. Which property of the set $\{v_i\}$ did this silently assume, and when is it guaranteed?
> 2. Concretely, what goes wrong if $Q$ is $3\times 3$ but has only two linearly independent left eigenvectors?


> [!warning] Recall — partial ◐ (45%)
> Your answer (photo):
> ![[work-20261018-202437.png|500]]
> Confidence: 15% · 564s
> Read as: 1) "it assumed that the set $\{v_i\}$ spans $P(t)$. When $v_i$ is solved from the eigenvalue." 2) "Then the set $\{v_i\}$ does not span the column space of $Q$."
> First error: Part 1's guarantee, 'when $v_i$ is solved from the eigenvalue', is not a condition that ensures spanning.
>
> You correctly identified that the expansion silently assumes the eigenvectors $\{v_i\}$ span the space. Your stated guarantee, 'when $v_i$ is solved from the eigenvalue', applies to every eigenvector, so it does not tell when spanning actually holds. In part 2, the relevant space is the full 3D space of initial vectors $p(0)$, not the column space of $Q$. The answer also does not say what concretely fails for an initial condition outside the span of the two eigenvectors.


> [!abstract] PI

Spanning: right. The guarantee is about the eigenvalues, not about how you solve for $v$: $n$ distinct eigenvalues give $n$ independent eigenvectors, which span. And the space that matters is the space of initial vectors $p(0)$, all of 3D. Now the concrete failure.


> [!question] Recall — Boundary
> $Q$ is $3\times 3$ with only two independent left eigenvectors $v_1, v_2$. You pick a $p(0)$ that is **not** in the plane spanned by $v_1$ and $v_2$. Which step of the superposition recipe fails for this $p(0)$: finding the $c_i$, or evolving each term with $e^{\lambda_i t}$? Say what fails in one line.


> [!warning] Recall — partial ◐ (50%)
> Your answer (photo):
> ![[work-20261018-202944.png|500]]
> Confidence: 55% · 277s
> Read as: The learner wrote: "finding $c_i$ because it is no longer analytically solvable."
> First error: The reason given, 'no longer analytically solvable', does not say that $p(0)$ lies outside the span of $v_1, v_2$.
>
> You correctly identified that finding the $c_i$ is the step that fails. The reason is off, though. The issue is not that the $c_i$ are hard to find analytically. No $c_1, c_2$ exist at all, because $p(0)$ is not in the plane spanned by $v_1$ and $v_2$.


> [!abstract] PI

## Reading — When no coefficients exist: the expansion step can be inconsistent

## The step that failed

You said: with only two eigenvectors in 3D, "finding the $c_i$ is no longer analytically solvable." The step is right, the reason is wrong, and the difference matters. The problem is not that the $c_i$ are hard to find. It is that for most $p(0)$ **no $c_i$ exist at all**. The linear system is inconsistent. Here is that, with numbers.

## Worked example

Suppose a 3-state $Q$ has only two independent left eigenvectors,
$$v_1 = (1, 0, 0), \qquad v_2 = (0, 1, 0).$$
We want to expand the initial distribution $p(0) = (0.5, 0.3, 0.2)$ as $c_1 v_1 + c_2 v_2$.

**Move 1: write out the combination.** Any mixture of $v_1$ and $v_2$ is
$$c_1 (1,0,0) + c_2 (0,1,0) = (c_1,\ c_2,\ 0).$$
Reason: scalar times vector, then add component-wise. Note the third slot is $0$ no matter what $c_1, c_2$ are, because both eigenvectors have a $0$ there.

**Move 2: match components with $p(0)$.** Setting $(c_1, c_2, 0) = (0.5, 0.3, 0.2)$ gives three equations:
$$c_1 = 0.5, \qquad c_2 = 0.3, \qquad 0 = 0.2 .$$
Reason: two vectors are equal only if every component agrees.

**Move 3: read the third equation.** $0 = 0.2$ is false for every $c_1, c_2$. There is nothing to solve; the system has **no solution**. This is what "inconsistent" means: not hard, impossible.

**Move 4: say it geometrically.** $v_1$ and $v_2$ span the plane $z = 0$. Any $p(0)$ with a nonzero third component sits off that plane, and no mixture of in-plane vectors can leave the plane. So the superposition recipe cannot even start for such a $p(0)$. (The ODE still has a solution; it just is not a pure sum of exponentials, and contains a $t\,e^{\lambda t}$ term. We do not need that case for the LL chain.)

## Contrast: why the $2 \times 2$ case always worked

In the first reading, $v_1 = (4,1)$ and $v_2 = (1,-1)$ are two independent vectors in 2D. Two independent vectors in 2D span the whole plane, so for $p(0) = (1,0)$ the system
$$4c_1 + c_2 = 1, \qquad c_1 - c_2 = 0$$
had exactly one solution, $c_1 = c_2 = 0.2$. Same recipe, but here the count of independent eigenvectors equals the dimension. That count is the whole condition.

## The guarantee

When does an $n \times n$ matrix have $n$ independent eigenvectors? Always when its $n$ eigenvalues are **distinct**: eigenvectors for different eigenvalues are automatically independent. The 3-state LL chain has eigenvalues $0, \lambda_+, \lambda_-$ which are distinct for any positive rates, so superposition applies there without worry.

## What it hangs off

- Linearity of $pQ$ (lets us add modes) and D1 (evolves each mode).
- Plain vector algebra: equality of vectors is equality of every component. That is where the inconsistency shows up.


> [!example] Reading — read ✓
> Read it; ready for the question.


> [!abstract] PI

Completion problem, one blank. Same structure as the worked example, different vectors.


> [!question] Recall — Boundary
> Only two independent left eigenvectors: $v_1 = (1, 1, 0)$ and $v_2 = (1, -1, 0)$. You want to expand $p(0) = (0.6, 0.2, 0.2)$ as $c_1 v_1 + c_2 v_2$.
>
> The third component of $c_1 v_1 + c_2 v_2$ equals $\underline{\quad}$ for every choice of $c_1, c_2$, while the third component of $p(0)$ is $0.2$. Fill in the blank and state in a few words what that means for the $c_i$.


> [!success] Recall — correct ✓ (88%)
> Your answer (photo):
> ![[work-20261018-203645.png|500]]
> Confidence: 100% · 295s
> Read as: The learner boxed the vector $(0.6, 0.2, 0)$ and wrote: "it means there is no $c_i$ that can enable $\{v_i\}$ to change its span. $(0.6, 0.2, 0.2)$ lies outside the span of $v_1, v_2$ because of $p(0)_3$."
>
> You have the key conclusion: no $c_1, c_2$ exist, because $p(0)$ lies outside the span of $v_1, v_2$ due to its third component. The blank asked for a single number, the third component, which is $0$ for every $c_1, c_2$. Your boxed vector $(0.6, 0.2, 0)$ is just one particular combination, so that general point is only implicit in your work. The wording "change its span" is also imprecise; the point is that $p(0)$ is not in the span at all.


> [!abstract] PI

Good: no $c_i$ exist, because $p(0)$ is off the plane. Now close D2 with an explain-back, in your own words, without looking at the reading.


> [!question] Recall — Explain it back
> Explain superposition back to me. Given $\dot p = pQ$, $p(0)$ arbitrary, and left eigenvectors $v_i$ with $v_i Q = \lambda_i v_i$: (a) what is the recipe for $p(t)$, and (b) which two facts make it valid? Relate it to D1, which you already own: along one eigenvector, $p(t) = c(0)e^{\lambda t} v$.


> [!warning] Recall — partial ◐ (45%)
> Your answer (photo):
> ![[work-20261018-204334.png|500]]
> Confidence: 90% · 379s
> Read as: Learner wrote: 'Superposition is the sum of linearly independent functions to construct a new function.' (a) $p(t) = \sum_i^N c_i(t)\, v_i$ (boxed). (b) 'because $\{v_i\}$ spans $p(0)$ and that $pQ$ is linear.'
> First error: In (a), $c_i(t)$ is left unspecified: there is no $c_i(0)e^{\lambda_i t}$ and no statement of how the $c_i$ come from $p(0)$.
>
> Writing $p(t)$ as a sum over the eigenvectors $v_i$ is the right structure, and naming both spanning and the linearity of $pQ$ is good. However, the recipe never says how each coefficient evolves: the $e^{\lambda_i t}$ factor is absent and $c_i(t)$ is left as an unknown. D1 is not connected to the argument, and linearity is named without saying what it guarantees about sums of solutions.


> [!abstract] PI

Same gap as last session: you wrote $c_i(t)$ and left it as an unknown. But D1 already tells you exactly what $c_i(t)$ is. The mode $c_i v_i$ obeys $\dot c_i = \lambda_i c_i$, so the coefficient is not unknown at all. Pin it down.


> [!question] Recall — Explain it back
> You expanded $p(0) = c_1 v_1 + c_2 v_2$ with $v_1 Q = \lambda_1 v_1$ and $v_2 Q = \lambda_2 v_2$. Write $c_1(t)$ explicitly in terms of $c_1$ and $\lambda_1$, and name the one-line reason (which equation the coefficient of mode 1 obeys, and why linearity lets mode 2 ride along without interfering).


> [!warning] Recall — partial ◐ (45%)
> Your answer (photo):
> ![[work-20261018-204814.png|500]]
> Confidence: 0% · 251s
> Read as: The photo reads $c_1(t) = c_1 e^{\lambda_1 t}$ (the exponent is small; it looks like $\lambda_1 t$, but the subscript on $\lambda$ is unclear), and below it "Superposition?" with a question mark.
> First error: No equation is given for the mode-1 coefficient: $\dot c_1 = \lambda_1 c_1$ and its origin in $v_1 Q = \lambda_1 v_1$ are missing.
>
> The formula $c_1(t) = c_1 e^{\lambda_1 t}$ is correct. The reason is missing: there is no statement of the equation $c_1$ obeys or of how the eigenvector property $v_1 Q = \lambda_1 v_1$ produces it. "Superposition?" points toward linearity but does not explain why the $v_2$ mode cannot feed into the $v_1$ coefficient.


> [!abstract] PI

The explicit derivation of why each coefficient obeys its own scalar ODE has not landed, so I am teaching it as a worked page before the next check.


> [!abstract] PI

## Reading — Why each coefficient obeys its own ċ = λc: the two-mode substitution

## The step that failed

You can write $c_1(t) = c_1 e^{\lambda_1 t}$, but not say *why*. That is the memorized version. The understood version is one substitution, done once, and after that the formula is forced. Here it is with the numbers you already know.

## Setup

$Q = \begin{pmatrix} -1 & 1 \\ 4 & -4 \end{pmatrix}$, with $v_1 = (4,1)$, $\lambda_1 = 0$ and $v_2 = (1,-1)$, $\lambda_2 = -5$. Suppose at some time $p(t) = c_1(t)\, v_1 + c_2(t)\, v_2$ with the coefficients $c_1(t), c_2(t)$ **unknown functions**. The question is: what equations do they obey?

## Move 1: compute the right-hand side $pQ$

$$pQ = (c_1 v_1 + c_2 v_2)\,Q = c_1\,(v_1 Q) + c_2\,(v_2 Q).$$
Reason: matrix multiplication distributes over addition and commutes with scalars. This is the *only* place linearity is used, and it is what lets the two terms be handled separately.

Now use the eigenvector property on each term: $v_1 Q = 0 \cdot v_1$ and $v_2 Q = -5\, v_2$. So
$$pQ = 0\cdot c_1\, v_1 + (-5)\, c_2\, v_2 .$$
Notice what happened: the $v_1$ term produced only a $v_1$ term, and the $v_2$ term only a $v_2$ term. Nothing crossed over. That is the eigenvector property at work.

## Move 2: compute the left-hand side $\dot p$

$v_1, v_2$ are constant vectors, so only the coefficients move:
$$\dot p = \dot c_1\, v_1 + \dot c_2\, v_2 .$$

## Move 3: equate, and match coefficients

The ODE says $\dot p = pQ$:
$$\dot c_1\, v_1 + \dot c_2\, v_2 = 0\cdot c_1\, v_1 + (-5)\, c_2\, v_2 .$$
Since $v_1 = (4,1)$ and $v_2 = (1,-1)$ are independent, a vector has only one way to be written as a combination of them, so the $v_1$ coefficients must agree and the $v_2$ coefficients must agree:
$$\dot c_1 = 0 \cdot c_1, \qquad \dot c_2 = -5\, c_2 .$$
Two separate scalar ODEs, one per mode, each of the form $\dot c = \lambda c$. This is D1, appearing once per eigenvector. The $v_2$ mode cannot feed into $\dot c_1$ because $v_2 Q$ has no $v_1$ component.

## Move 4: solve each

From the handle you own: $\dot c = \lambda c \Rightarrow c(t) = c(0) e^{\lambda t}$. So
$$c_1(t) = c_1(0)\, e^{0 \cdot t} = c_1(0), \qquad c_2(t) = c_2(0)\, e^{-5t}.$$
With $p(0) = (1,0)$ we found $c_1(0) = c_2(0) = 0.2$, giving $p(t) = 0.2\,(4,1) + 0.2\, e^{-5t}\,(1,-1)$, the same answer as before, now derived rather than quoted.

## The whole argument in one line

Substitute $p = \sum c_i v_i$ into $\dot p = pQ$; linearity plus $v_i Q = \lambda_i v_i$ turns the right side into $\sum \lambda_i c_i v_i$; independence of the $v_i$ lets you match coefficients to get $\dot c_i = \lambda_i c_i$ for each $i$. That is the sentence to be able to say.


> [!example] Reading — read ✓
> Read it; ready for the question.


> [!abstract] PI

Completion problem, one blank, fresh matrix. Only the matching-coefficients step is left for you to fill.


> [!question] Recall — Explain it back
> $Q = \begin{pmatrix} -2 & 2 \\ 1 & -1 \end{pmatrix}$ with $v_1 = (1,2)$, $\lambda_1 = 0$ and $v_2 = (1,-1)$, $\lambda_2 = -3$. Write $p = c_1 v_1 + c_2 v_2$.
>
> Right side: $pQ = c_1\,(v_1 Q) + c_2\,(v_2 Q) = 0\cdot c_1\, v_1 + (-3)\,c_2\, v_2$.
> Left side: $\dot p = \dot c_1\, v_1 + \dot c_2\, v_2$.
>
> Setting $\dot p = pQ$ and matching the $v_2$ coefficients gives $\dot c_2 = \underline{\quad}$. Fill the blank, and say in one phrase why you are allowed to match coefficients.


> [!warning] Recall — partial ◐ (45%)
> Your answer (photo):
> ![[work-20261018-205246.png|500]]
> Confidence: 70% · 99s
> Read as: The learner wrote "$\lambda c_2(t)$" for the blank, and gave the reason "because of the linearity of $pQ$." The $\lambda$ has no subscript, so it is unclear whether it means $\lambda_2$.
> First error: The reason "linearity of $pQ$" does not justify matching coefficients. That step depends on $v_1, v_2$ being linearly independent, so the expansion is unique.
>
> The form of the answer is right: $\dot c_2$ is the eigenvalue times $c_2$. However, the unsubscripted $\lambda$ was not given the value $\lambda_2 = -3$. Linearity of $pQ$ is what lets the right side split into $c_1(v_1Q) + c_2(v_2Q)$. It is not what makes it legitimate to equate the $v_2$ coefficients on both sides, so the reason given misses the actual mechanism.


> [!abstract] PI

Session paused at the time budget. Three cards saved for review.

**What held today**
- D1 warm-up: $p(t) = 0.2\,e^{-3t}(1,-1)$ written correctly with the right coefficient.
- D2 boundary: you landed the real point, that for a $p(0)$ off the plane of $v_1, v_2$ no coefficients exist at all, the component equations are inconsistent.

**What is still shaky (D2 explain-back)**
- You can write $c_i(t) = c_i e^{\lambda_i t}$ but not yet produce *why*: substitute $p = \sum c_i v_i$, use linearity to split $pQ$, use $v_i Q = \lambda_i v_i$, then match coefficients to get $\dot c_i = \lambda_i c_i$.
- The matching step is justified by linear independence of the $v_i$, not by linearity. That confusion is logged and will come back in review.

**Next session** opens with one completion problem on that two-mode substitution, then moves on to $e^{Qt}$ (D3) and the 3-state Linderstrøm-Lang spectrum regardless, since the cards now cover D2.


> [!quote] YOU

ok


> [!abstract] PI

Noted. Everything is saved: the lesson is paused at D2, the three review cards are scheduled, and the next session starts with a single completion problem on the two-mode substitution before moving to $e^{Qt}$.
