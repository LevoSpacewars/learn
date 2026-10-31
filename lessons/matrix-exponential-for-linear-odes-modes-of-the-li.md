# Matrix exponential for linear ODEs: modes of the Linderstrøm-Lang chain



> [!quote] YOU

> [!note] SKILL loaded: teach

Continue the lesson "Matrix exponential for linear ODEs: modes of the Linderstrøm-Lang chain" (slug: matrix-exponential-linear-odes). Time budget: 20 min.


> [!abstract] PI

I'll pick up where the lesson left off: checking the note for what D1 already got, then delivering D1 as a reading and a completion step.


> [!question] Question
> Anything you want to discuss before we start on D1 (collapsing $\dot p = pQ$ along an eigenvector)?
>
> 1. Ready, give me the D1 page
> 2. I want to discuss first


> [!example] Answer
> 1. Ready, give me the D1 page


> [!abstract] PI

## Reading — Along an eigenvector the matrix ODE becomes a scalar ODE

## Why this node now

The master equation $\dot p = pQ$ is a system of coupled ODEs: every component of $p$ feeds every other through $Q$. You already own one ODE completely, the scalar one, $\dot c = \lambda c$, whose solution is $c(t) = c(0)\,e^{\lambda t}$. The whole strategy of this lesson is: find the directions in which the coupled system *is secretly* that scalar equation. Those directions are the eigenvectors. This node shows why.

## The move you could have discovered

Ask: for which $p$ is the right-hand side $pQ$ easy? The right-hand side is a matrix acting on a vector, and in general it points somewhere new. But by definition, a left eigenvector $v \neq 0$ with $vQ = \lambda v$ is a direction that $Q$ does *not* turn: it only stretches it by $\lambda$. So suppose at some moment $p$ lies along $v$:

$$p(t) = c(t)\,v,$$

with $c(t)$ a scalar and $v$ a fixed vector (it does not depend on time). Now substitute into **both sides** of $\dot p = pQ$, one side at a time. Keeping the two sides separate is exactly the step that slipped last time.

**Left side.** $v$ is constant, so differentiating $p = c\,v$ only differentiates $c$:
$$\dot p = \dot c\, v.$$

**Right side.** Replace $p$ by $c\,v$, then pull the scalar $c$ out in front (scalars commute with everything), then use the eigenvector equation:
$$pQ = (c\,v)Q = c\,(vQ) = c\,(\lambda v) = \lambda c\, v.$$

Note the bookkeeping: $pQ$ is not $c\,v$. It is $c$ times $vQ$, and *only then* does $vQ = \lambda v$ get used to replace $vQ$ by $\lambda v$.

**Equate.** $\dot c\, v = \lambda c\, v$. Both sides are multiples of the same nonzero vector $v$, so the scalar coefficients must match:
$$\dot c = \lambda c \quad\Longrightarrow\quad c(t) = c(0)\,e^{\lambda t}.$$

This is where $v \neq 0$ earns its place in the definition: if $v$ were the zero vector, $\dot c\,v = \lambda c\,v$ would say $0 = 0$ and tell us nothing about $c$.

**Conclusion.** If $p$ starts along an eigenvector, it stays along it forever, and its length just scales as $e^{\lambda t}$:
$$p(t) = c(0)\,e^{\lambda t}\,v.$$

For a rate matrix, $\lambda = 0$ gives a mode that never changes (the stationary split you found last time), and $\lambda < 0$ gives a mode that decays with rate $|\lambda|$.

## One worked instance

Take the $Q$ from last time:
$$Q = \begin{pmatrix} -1 & 1 \\ 4 & -4 \end{pmatrix}, \qquad \text{eigenvalues } 0 \text{ and } -5.$$

Find the left eigenvector for $\lambda = -5$. We need $vQ = -5v$. Try $v = (1, -1)$:
$$vQ = (1\cdot(-1) + (-1)\cdot 4,\; 1\cdot 1 + (-1)\cdot(-4)) = (-5,\; 5) = -5\,(1,-1). \checkmark$$

Now set $p(0) = 0.3\,(1,-1) = (0.3, -0.3)$. (Not a probability vector by itself; it is a *deviation* from the stationary split. That is fine, the equation is linear.)

- Left side: $\dot p = \dot c\,(1,-1)$.
- Right side: $pQ = 0.3\,(1,-1)Q = 0.3\,(-5)(1,-1) = -1.5\,(1,-1)$.
- Matching coefficients: $\dot c = -5c$, so $c(t) = 0.3\,e^{-5t}$.

So $p(t) = 0.3\,e^{-5t}\,(1,-1)$. At $t = 0.2$: $c = 0.3\,e^{-1} \approx 0.110$, so $p \approx (0.110, -0.110)$. The direction never moved; only the size shrank, with time constant $1/5$.

## What it hangs off

Two handles you already hold: the scalar solution $\dot c = \lambda c \Rightarrow c = c(0)e^{\lambda t}$, and the definition $vQ = \lambda v$ with $v \neq 0$. Nothing else was used. The next node (D2) asks: what if $p(0)$ is *not* along a single eigenvector? Answer: write it as a sum of eigenvectors and run this node on each piece.


> [!quote] YOU

I don't think I understand this very well. So we have non-trivial ODE because it's many variable. So if that's the case, then how do we progress this ODE for any arbitrary initial population? I thought that was the normal case anyways? or is it that it gets turned in to obs for lamda so it becomes a single rate?


> [!question] Question
> Does that clear up where D1 sits? Ready for the D1 check (one completion step with a single blank)?
>
> 1. Ready, ask me
> 2. I have another question


> [!question] Question
> Does that clear up where D1 sits? Ready for the D1 check (one completion step with a single blank)?
>
> 1. Ready, ask me
> 2. I have another question


> [!abstract] PI

Good question, and it is exactly the right one. Here is the honest answer.

**Yes, the normal case is an arbitrary $p(0)$,** and this node does *not* solve it. D1 solves one special case: $p(0)$ pointing exactly along a single eigenvector. In that one case the coupled system is secretly the scalar equation you already know, with $\lambda$ as the rate. That is the whole content of D1: it is the building block, not the answer.

**The arbitrary case is the next node, D2,** and it is built out of D1. A $2\times 2$ matrix has two eigenvectors, say $v_1$ (with $\lambda_1 = 0$) and $v_2$ (with $\lambda_2 = -5$). Any starting vector in the plane can be written as a combination of them:
$$p(0) = c_1 v_1 + c_2 v_2.$$
Because $\dot p = pQ$ is linear, each piece evolves on its own without noticing the other. D1 tells you how each piece evolves: the $v_1$ piece stays put since $e^{0\cdot t} = 1$, and the $v_2$ piece shrinks as $e^{-5t}$. So
$$p(t) = c_1 v_1 + c_2 e^{-5t} v_2.$$
That is the full solution for *any* $p(0)$. It is not one rate. It is one rate per eigenvector, and the solution is a sum of pure-exponential pieces.

**Your "does it become one observed rate" guess is partly right, and it is where the lesson is heading.** In the HDX chain the eigenvalues are $0$, one fast negative one, and one slow negative one. The fast piece dies almost immediately, so after a short transient the only thing still changing is the slow piece. That single surviving exponent is what you measure as $k_{obs}$. So the one rate you see in an experiment is the slowest nonzero eigenvalue, not the only one.

The logic of the lesson, in one line each: D1, one eigenvector gives one scalar exponential. D2, split any start into eigenvectors and add the exponentials. G, the slowest exponential is $k_{obs}$.

When you have read this, tell me whether you are ready for the D1 check or have another question, and I will pose it.


> [!question] Question
> Ready for the D1 check (one completion step with a single blank), or another question first?
>
> 1. Ready, ask me
> 2. I have another question


> [!example] Answer
> Other: So what is the point of looking at this as "secretly a scalar" because if we have multiple independent sites? honestly this makes actually 0 sense.  how could P(0) be the case where teh system looks like a scalar, is that because it needs to be the stationary variable. Also I am confused how does it make sense that lambda be 0? Does that mean the population doesn't every change? or that the proportionality never chagnes/


> [!abstract] PI

Let me take your three questions in order, with the concrete $2\times 2$ chain so nothing is abstract.

**1. "Multiple independent sites": what $p$ actually is.** $p$ is not a list of sites. It is the distribution over *states* of one site, or equivalently the fraction of a population of identical sites in each state. For the two-state $Q$ above, states A and B, $p = (\text{fraction in A}, \text{fraction in B})$. For Linderstrøm-Lang it is $(\text{Closed}, \text{Open}, \text{Exchanged})$. The components are coupled because flow leaves one and enters another. That is the coupling we are trying to untangle. Independent sites just means you run the same $p(t)$ for each site; nothing new.

**2. "How could $p(0)$ be along an eigenvector": the two eigenvectors mean two different things.** Take $Q = \begin{pmatrix} -1 & 1 \\ 4 & -4 \end{pmatrix}$, so A leaks to B at $1$/s and B leaks to A at $4$/s.

- $\lambda = 0$ eigenvector: $(0.8, 0.2)$. Check: flow A to B is $0.8 \times 1 = 0.8$, flow B to A is $0.2 \times 4 = 0.8$. Balanced. Start there and nothing moves. This one *is* a legal population, and it is the stationary split. You guessed this right.
- $\lambda = -5$ eigenvector: $(1, -1)$. This is **not** a population. It has a negative entry and sums to zero. It is a *deviation*: "some extra in A, the same amount missing from B". Nobody ever starts "along" it alone.

So why care about $(1,-1)$? Because every real start is the stationary split plus some multiple of it. Start at $90/10$:
$$(0.9, 0.1) = (0.8, 0.2) + 0.1\,(1,-1).$$
D1 says the $(1,-1)$ piece has its own private scalar equation $\dot c = -5c$, so that $0.1$ shrinks as $0.1\,e^{-5t}$:
$$p(t) = (0.8, 0.2) + 0.1\,e^{-5t}\,(1,-1).$$
At $t = 0.2$ s that is about $(0.837, 0.163)$. At $t = 1$ s it is $(0.8007, 0.1993)$. That is the complete, exact solution of the coupled system, and it took no ODE solving beyond $\dot c = \lambda c$. **That is the point of "secretly a scalar"**: the coupled system is two uncoupled scalar decays stacked, one with rate $0$ and one with rate $5$/s, and you only ever had to solve the scalar one.

**3. What $\lambda = 0$ means.** The piece of $p$ along that eigenvector never changes, in absolute amount and therefore in proportion too, since the total is conserved. If you start *exactly* at $(0.8, 0.2)$ the population does not change at all. If you start anywhere else, the $(0.8, 0.2)$ part sits still while the deviation decays, so the population *does* change, and it changes *toward* $(0.8, 0.2)$ with rate $5$/s. The $\lambda = 0$ mode is the destination; the negative $\lambda$ modes are how fast each kind of deviation dies. In HDX the slowest of those negative $\lambda$'s is your $k_{obs}$.


> [!question] Question
> Does the $90/10 = (0.8,0.2) + 0.1\,(1,-1)$ decomposition make the "secretly scalar" idea land? Ready for one short completion check on it, or another question?
>
> 1. Ready, ask me
> 2. I have another question


> [!example] Answer
> Other: this answers most of my questions. However you say "if you start anywhere else, the (0.8, 0.2) parts sits still while the deviation decays" let's say our deviation is (-2,2)0.1. I don't think that would decay like the exponential right since that breaks the eigen value of -5?


> [!question] Question
> The $(-2,2)$ case is just $-0.2\,(1,-1)$, same eigenvector, same rate. Ready for the one-blank completion check on D1?
>
> 1. Ready, ask me
> 2. I have another question


> [!example] Answer
> Other: so then what about (1.5, -1)?


> [!question] Question
> Ready for the one-blank D1 completion check now?
>
> 1. Ready, ask me
> 2. I have another question


> [!abstract] PI

Now you have found a vector that is **not** an eigenvector, and that is exactly what D2 is for. Check it:
$$(1.5, -1)\,Q = (1.5\cdot(-1) + (-1)\cdot 4,\;\; 1.5\cdot 1 + (-1)\cdot(-4)) = (-5.5,\; 5.5).$$
That is not a multiple of $(1.5, -1)$, so $Q$ *turns* this vector. D1 does not apply to it directly. Also note it sums to $0.5$, so it is not a pure deviation from a normalized population; it carries some total mass of its own.

What you do instead is split it into the two eigenvectors and run D1 on each piece. Write $(1.5, -1) = a\,(0.8, 0.2) + b\,(1, -1)$. Summing both sides: $0.5 = a \cdot 1 + b \cdot 0$, so $a = 0.5$. First component: $1.5 = 0.5 \cdot 0.8 + b$, so $b = 1.1$. Check the second component: $0.5 \cdot 0.2 - 1.1 = -1$. ✓

So
$$(1.5, -1) = 0.5\,(0.8, 0.2) + 1.1\,(1, -1),$$
and therefore, piece by piece,
$$p(t) = 0.5\,(0.8, 0.2) + 1.1\,e^{-5t}\,(1, -1).$$
The stationary piece keeps its $0.5$ forever, the $(1,-1)$ piece decays at $5$/s. Verify at $t=0$: differentiating gives $\dot p(0) = 1.1 \cdot (-5)\,(1,-1) = (-5.5, 5.5)$, which is exactly the $pQ$ we computed. ✓

That is the whole lesson in one example: D1 handles each eigenvector alone, D2 says split anything into eigenvectors and add. You just did D2 before I taught it. Next I will pose the one-blank D1 check.


> [!quote] YOU

so b(1,-1) accounts for every single deviation?


> [!abstract] PI

In two states, yes. Any vector $(x, y)$ can be written as $a\,(0.8, 0.2) + b\,(1, -1)$, with $a = x + y$ (the total) and $b$ fixed by the first component. Two eigenvectors in two dimensions span everything, so there is nothing left over. And if your vector is a *deviation* between two normalized populations, its total is zero, so $a = 0$ and the deviation is *purely* $b\,(1,-1)$. That is why every two-state relaxation is one exponential at $5$/s.

In three states, no. Zero-sum deviations form a plane, and you need two decaying eigenvectors to cover it. That is the LL chain: one fast direction, one slow direction, and $k_{obs}$ is the slow one. Nothing else is left over there either, because three eigenvectors span three dimensions.


> [!question] Question
> Ready for the one-blank D1 completion check?
>
> 1. Ready, ask me
> 2. I have another question


> [!example] Answer
> 1. Ready, ask me


> [!abstract] PI

Completion step. Take $p = c(t)\,v$ with $vQ = \lambda v$, $v \neq 0$. The left side of $\dot p = pQ$ is $\dot c\,v$. Fill the blank on the right side.


> [!question] Recall — Explain it back
> Fill in the single blank, then state the equation you get for $c(t)$ after matching the two sides:
>
> $$pQ = (c\,v)\,Q = c\,(vQ) = \;\underline{\qquad\qquad}\;$$
>
> Equating $\dot c\, v = [\text{your blank}]$ gives $\dot c = \;?$


> [!success] Recall — correct ✓ (95%)
> Your answer (photo):
> ![[work-20261017-122051.png|500]]
> Confidence: 30% · 281s
> Read as: Boxed: $c(vQ) = c\lambda v$. Then $\dot c\, v = c\lambda v$, and boxed: $\dot c = c\lambda$.
>
> Correct. You replaced $vQ$ with $\lambda v$ to fill the blank with $c\lambda v$, then matched the coefficients of $v$ to get $\dot c = c\lambda$. You didn't write out that this step uses the eigenvector equation or that $v$ is nonzero, but both were applied correctly.


> [!abstract] PI

That's the step that slipped last time, now done cleanly: $vQ$ replaced by $\lambda v$, then the common $v$ cancelled. One explain-back closes D1.


> [!abstract] PI

Explain-back, in words, two to four lines.


> [!question] Recall — Explain it back
> In your own words: if $p(0)$ is a multiple of a left eigenvector $v$ of $Q$ with eigenvalue $\lambda$, what does $p(t)$ do for all later times, and why? Name the two facts it rests on (the scalar ODE you already know, and the eigenvector property).


> [!warning] Recall — partial ◐ (45%)
> Your answer: that means the p(t) distribution stays stationary, but it get's rescaled through time via c(t). What I mean by that is that through the rest of time, p(t) will be some scalar function multiplied by p(0).
> Confidence: 20% · 627s
> Read as: The learner says the direction of $p(t)$ stays fixed (calling it 'stationary') but is rescaled over time by a scalar $c(t)$, so $p(t)$ is a scalar function times $p(0)$.
> First error: No justification given: neither $vQ=\lambda v$ nor the scalar ODE $\dot c=\lambda c$ is named, and the rescaling factor $c(t)$ is left unspecified instead of $e^{\lambda t}$.
>
> You correctly saw that $p(t)$ keeps the direction of $p(0)$ and only a scalar factor $c(t)$ changes. The answer stops there: it doesn't say what $c(t)$ is, and it doesn't give the two facts asked for, the eigenvector property and the scalar ODE it reduces to. Also, 'stationary' is only accurate in the special case $\lambda=0$; in general the size of $p(t)$ does change.


> [!abstract] PI

The shape was right: direction fixed, only a scalar $c(t)$ changes. What was missing is the scalar itself. You derived $\dot c = \lambda c$ in the previous step, and you already know that ODE's solution. One line to finish it.


> [!question] Recall — Recall
> Given $\dot c = \lambda c$ and $c(0)$, write $c(t)$ explicitly. Then, for $Q = \begin{pmatrix} -1 & 1 \\ 4 & -4 \end{pmatrix}$ with $p(0) = 0.1\,(1,-1)$ (eigenvalue $-5$), write $p(t)$.


> [!warning] Recall — partial ◐ (65%)
> Your answer (photo):
> ![[work-20261017-123805.png|500]]
> Confidence: 0% · 353s
> Read as: The learner separated variables, $\frac{1}{c}\,dc = \lambda\,dt$, and boxed $c(t) = c(0)e^{\lambda t}$. For the matrix part they boxed $p(t) = 0.1\,(1,-1)\cdot c(0)\,e^{-5t}$.
> First error: In $p(t) = 0.1\,(1,-1)\cdot c(0)\,e^{-5t}$, the factor $c(0)$ appears alongside $0.1$, even though $0.1$ is itself the initial coefficient $c(0)$.
>
> Your scalar solution $c(t)=c(0)e^{\lambda t}$ is correct, and so is the shape of $p(t)$: the eigenvector $(1,-1)$ times $e^{-5t}$. The error is in the coefficient. Here $c(0)$ is the $0.1$, so writing both $0.1$ and $c(0)$ counts the initial condition twice.


> [!abstract] PI

Session closed. D1 is confirmed: along an eigenvector the coupled system collapses to $\dot c = \lambda c$, so $p(t) = c(0)e^{\lambda t}v$. Three review cards saved.

What stood out: your own questions carried most of the lesson. Asking about $(-2,2)$ and then $(1.5,-1)$ led you to split a vector into the stationary mode plus a decaying mode, which is D2 before I taught it. Your confidence sat at 0 to 30 percent even on correct answers, so trust the working more than the feeling.

Next time: a short D2 page on superposition, its boundary check, then the 3-state Linderstrøm-Lang spectrum where the slow eigenvalue becomes $k_{obs}$.


> [!quote] YOU

> [!note] SKILL loaded: teach

Continue the lesson "Matrix exponential for linear ODEs: modes of the Linderstrøm-Lang chain" (slug: matrix-exponential-linear-odes). Nothing is timed: he may walk away mid-answer and come back later. Never mention time, pace, speed or a budget; stop only when he says stop or the goal lands.


> [!abstract] PI

Picking up where we paused. Here is the shape of today:

- **One completion** on the two-mode substitution to close out superposition. The blank is the one step that kept slipping: the *reason* you may match the coefficient of each eigenvector on both sides.
- **Then the matrix exponential** $e^{Qt}$: we define it as the map that superposition already gives you, see why it equals $\sum_k \frac{(Qt)^k}{k!}$, and why that is the same as $V^{-1} e^{\Lambda t} V$. That node gets a find-the-flaw check.
- **Then the 3-state Linderstrøm-Lang chain**: its spectrum, and reading $k_{obs}$ and EX1/EX2 off it. That is the goal.


> [!question] Question
> Anything you want to discuss before the first question?
>
> 1. Ready, ask the first question
> 2. I want to discuss first


> [!example] Answer
> 1. Ready, ask the first question


> [!abstract] PI

Before the completion goes out, the next idea needs its reading first. I'll fold the coefficient-matching point into it so nothing is lost.


> [!abstract] PI

## Reading — The matrix exponential: one object that carries all the modes at once

## What this section is about

Superposition solves $\dot p = pQ$ mode by mode: expand $p(0) = \sum_i c_i v_i$ in left eigenvectors ($v_i Q = \lambda_i v_i$), then $p(t) = \sum_i c_i e^{\lambda_i t} v_i$. That is a *recipe*. This section packages the recipe into a single matrix, $e^{Qt}$, so that the whole solution is one multiplication:

$$p(t) = p(0)\, e^{Qt}.$$

The payoff: $e^{Qt}$ is exactly the propagator $P(t)$ you already know from the chain, its entries are the transition probabilities over a time $t$, and later it lets us read $k_{obs}$ straight off the eigenvalues.

## Why we need it

The recipe has a hidden step. Substituting $p = c_1 v_1 + c_2 v_2$ into $\dot p = pQ$ gives one vector equation, $\dot c_1 v_1 + \dot c_2 v_2 = \lambda_1 c_1 v_1 + \lambda_2 c_2 v_2$, and we split it into two scalar ones, $\dot c_i = \lambda_i c_i$. What allows the split is that $v_1, v_2$ are **linearly independent**: a vector has only one expansion in an independent set, so equal vectors have equal coefficients. (Linearity of $pQ$ did a different job earlier: it let $pQ$ be spread over the sum as $c_1 v_1 Q + c_2 v_2 Q$. It does not justify matching.) Once the modes are independent, the recipe is a *linear map* from $p(0)$ to $p(t)$, and every linear map on row vectors is multiplication by some matrix. Let us find that matrix.

## How you could have discovered it

For the scalar equation $\dot c = \lambda c$ the solution is $c(0)e^{\lambda t}$, and the exponential is the power series

$$e^{\lambda t} = \sum_{k=0}^\infty \frac{(\lambda t)^k}{k!}.$$

The only thing that series uses about $\lambda$ is that you can multiply it by itself. A square matrix can also be multiplied by itself. So *define*

$$e^{Qt} = \sum_{k=0}^\infty \frac{(Qt)^k}{k!} = I + Qt + \frac{Q^2 t^2}{2} + \cdots$$

Does it solve the matrix equation? Differentiate term by term: $\frac{d}{dt}\frac{Q^k t^k}{k!} = \frac{Q^k t^{k-1}}{(k-1)!}$, so the derivative of the series is $Q(I + Qt + \cdots) = Q\,e^{Qt}$, and also $e^{Qt}Q$ (every term is a power of $Q$, so $Q$ commutes with all of them). Hence $p(t) = p(0)e^{Qt}$ satisfies $\dot p = p(0)e^{Qt}Q = pQ$ with $p(0)$ at $t=0$, because the series at $t=0$ is $I$. This is the solution.

Now connect it to the modes. Hit the series with a left eigenvector: $v_i Q^k = \lambda_i^k v_i$ (apply $v_i Q = \lambda_i v_i$ $k$ times), so

$$v_i\, e^{Qt} = \sum_k \frac{t^k}{k!}\lambda_i^k v_i = e^{\lambda_i t} v_i.$$

Each mode just gets multiplied by its own scalar exponential. Then for a general $p(0) = \sum_i c_i v_i$,

$$p(0)e^{Qt} = \sum_i c_i\, v_i e^{Qt} = \sum_i c_i e^{\lambda_i t} v_i,$$

which is the superposition formula word for word. **So $e^{Qt}$ is the superposition recipe written as a matrix.** Nothing new was added; the series is just a way of writing the same map without naming the modes.

## The closed form $V^{-1} e^{\Lambda t} V$

Stack the left eigenvectors as the rows of a matrix $V$, and put the eigenvalues on a diagonal $\Lambda$. The $n$ eigenvector equations $v_i Q = \lambda_i v_i$ become one matrix equation, $VQ = \Lambda V$. If the $v_i$ are independent, $V$ is invertible, and

$$Q = V^{-1}\Lambda V, \qquad Q^k = V^{-1}\Lambda^k V$$

(the inner $V V^{-1}$ pairs cancel). Feed that into the series:

$$e^{Qt} = V^{-1}\Big(\sum_k \frac{\Lambda^k t^k}{k!}\Big)V = V^{-1} e^{\Lambda t} V, \qquad e^{\Lambda t} = \mathrm{diag}(e^{\lambda_1 t},\dots,e^{\lambda_n t}).$$

Reading it right to left: $V$ decomposes $p(0)$ into mode coefficients ($p(0) = cV$ means $c = p(0)V^{-1}$), $e^{\Lambda t}$ lets each mode decay at its own rate, $V^{-1}$ reassembles the vector. Same three steps as the recipe.

## Worked instance

$Q = \begin{pmatrix} -3 & 3 \\ 1 & -1 \end{pmatrix}$, left eigenvectors $v_1 = (1,3)$ with $\lambda_1 = 0$ and $v_2 = (1,-1)$ with $\lambda_2 = -4$. (Check one: $(1,-1)Q = (-3-1,\ 3+1) = (-4, 4) = -4\,(1,-1)$.)

**Step 1, build $V$ and $\Lambda$.** Rows are the eigenvectors: $V = \begin{pmatrix} 1 & 3 \\ 1 & -1 \end{pmatrix}$, $\Lambda = \mathrm{diag}(0,-4)$.

**Step 2, invert $V$.** $\det V = (1)(-1) - (3)(1) = -4$, so $V^{-1} = \frac{1}{-4}\begin{pmatrix} -1 & -3 \\ -1 & 1 \end{pmatrix} = \begin{pmatrix} 1/4 & 3/4 \\ 1/4 & -1/4 \end{pmatrix}$. (Check: first row of $V$ times first column of $V^{-1}$ is $1/4 + 3/4 = 1$.)

**Step 3, multiply.** $V^{-1}e^{\Lambda t} = \begin{pmatrix} 1/4 & \tfrac34 e^{-4t} \\ 1/4 & -\tfrac14 e^{-4t} \end{pmatrix}$ (each column of $V^{-1}$ scaled by its exponential). Then times $V$:

$$e^{Qt} = \begin{pmatrix} \tfrac14 + \tfrac34 e^{-4t} & \tfrac34 - \tfrac34 e^{-4t} \\ \tfrac14 - \tfrac14 e^{-4t} & \tfrac34 + \tfrac14 e^{-4t} \end{pmatrix}.$$

**Step 4, sanity checks, each one a reason to trust it.** At $t = 0$ it is the identity (nothing has happened yet). Each row sums to 1 (probability is conserved; this is the $\lambda_1 = 0$ mode). As $t\to\infty$ every row tends to $(1/4, 3/4)$, which is $v_1$ normalised: whatever you start in, you forget it and land on the stationary split. And the derivative at $t=0$ of the top row is $(-3, 3)$, the first row of $Q$: for small $t$, $e^{Qt} \approx I + Qt$, the one-slice transition matrix. So the entry $(e^{Qt})_{ij}$ is the probability of being in state $j$ at time $t$ having started in state $i$. **$e^{Qt}$ is the propagator $P(t)$, and $Q$ is its generator.**

## What it hangs off

Two things you already own. The scalar fact $\dot c = \lambda c \Rightarrow c(0)e^{\lambda t}$, whose series we copied with $Q$ in place of $\lambda$. And superposition, $p(t) = \sum_i c_i e^{\lambda_i t} v_i$, which is what $p(0)e^{Qt}$ expands to once you apply $v_i Q^k = \lambda_i^k v_i$ term by term. The one new ingredient is that independence of the $v_i$ makes $V$ invertible, which is exactly what $V^{-1}$ needs.


> [!example] Reading — read ✓
> Read it; ready for the question.


> [!abstract] PI

First next-move check on the matrix exponential. One move, and the reason for it.


> [!question] Recall — Recall · next move
> We have defined $e^{Qt} = \sum_{k} \frac{(Qt)^k}{k!}$ and shown it solves $\dot p = pQ$. Now we want to see that $p(0)e^{Qt}$ is the superposition formula. Take a left eigenvector $v_i$ with $v_i Q = \lambda_i v_i$, and write
>
> $$v_i\, e^{Qt} = \sum_k \frac{t^k}{k!}\, v_i Q^k.$$
>
> What is the next move on $v_i Q^k$, and why is that the move that gets us to $e^{\lambda_i t} v_i$?
>
> *Next move only: say what the next step is and why that one, not the whole derivation.*


> [!success] Recall — correct ✓ (85%)
> Your answer: We can take viQ and substitute it with lambda_i vi where lambda is raised by k. Because now we’ve got lambda in thr power series that represnts the exponential
> Read as: The learner says to replace $v_i Q^k$ with $\lambda_i^k v_i$, the eigenvalue raised to the $k$-th power. Their reason is that $\lambda_i$ then sits inside the power series that represents the exponential.
>
> Right move: $v_i Q^k = \lambda_i^k v_i$, and right reason, since the sum becomes the scalar exponential series $\sum (\lambda_i t)^k/k! = e^{\lambda_i t}$. Notes: you didn't spell out that the $\lambda_i^k$ comes from applying $v_i Q = \lambda_i v_i$ repeatedly ($k$ times). You also didn't say that this leaves the same fixed vector $v_i$ in every term, so it factors out of the sum.


> [!abstract] PI

Good: the vector factors out and the scalar series is left. Second decision point, on the closed form.


> [!abstract] PI

Second next-move check. This one is at the point where the eigenvector equations get stacked.


> [!question] Recall — Recall · next move
> Stack the left eigenvectors as rows of $V$ and the eigenvalues on the diagonal of $\Lambda$. The $n$ equations $v_i Q = \lambda_i v_i$ become
>
> $$VQ = \Lambda V.$$
>
> We want a formula for $Q^k$ that makes the series $\sum_k \frac{Q^k t^k}{k!}$ collapse. What is the next move from $VQ = \Lambda V$, and what property of the eigenvectors does it rely on?
>
> *Next move only: say what the next step is and why that one, not the whole derivation.*


> [!success] Recall — correct ✓ (92%)
> Your answer (photo):
> ![[work-20261020-185351.png|500]]
> Read as: The learner wrote $Q = V^{-1}\Lambda V$ and $Q^k = V^{-1}\Lambda^k V$, then: "this relies on that $V$ be square and $\{v_i\}$ be linearly independent from each other."
>
> Correct: you have $Q = V^{-1}\Lambda V$ and $Q^k = V^{-1}\Lambda^k V$, and you identified linear independence of the $v_i$ (with $V$ square) as the requirement. You didn't say outright that this independence is what makes $V$ invertible, but your formula shows you used it.


> [!abstract] PI

Both moves landed. Now the completion: fresh matrix, one computation left blank.


> [!question] Recall — Problem · completion
> $Q = \begin{pmatrix} -1 & 1 \\ 2 & -2 \end{pmatrix}$. Left eigenvectors: $v_1 = (2,1)$ with $\lambda_1 = 0$, and $v_2 = (1,-1)$ with $\lambda_2 = -3$.
>
> Stacked: $V = \begin{pmatrix} 2 & 1 \\ 1 & -1 \end{pmatrix}$, $\Lambda = \mathrm{diag}(0,-3)$, and (already inverted for you) $V^{-1} = \begin{pmatrix} 1/3 & 1/3 \\ 1/3 & -2/3 \end{pmatrix}$.
>
> **Blank:** compute $e^{Qt} = V^{-1} e^{\Lambda t} V$ explicitly as a $2\times 2$ matrix of functions of $t$. Then state one sanity check on your result (at $t=0$, or $t\to\infty$, or row sums).
>
> Work it on paper and send a photo from your phone, or type your answer.
> *Fill the one blank.*


> [!warning] Recall — partial ◐ (60%)
> Your answer (photo):
> ![[work-20261020-192538-1.png|500]]
> ![[work-20261020-192538-2.png|500]]
> ![[work-20261020-192538-3.png|500]]
> Read as: The learner wrote $e^{Qt} = \tfrac13\begin{pmatrix}1&1\\1&-2\end{pmatrix} e^{\Lambda t}\begin{pmatrix}2&1\\1&-1\end{pmatrix}$ with $e^{\Lambda t}=\mathrm{diag}(e^{0}, e^{-3t})$. They then wrote $e^{\Lambda t}V = \begin{pmatrix}2&1\\1&-e^{-3t}\end{pmatrix}$, giving $\tfrac13\begin{pmatrix}3&1-e^{-3t}\\0&1+2e^{-3t}\end{pmatrix} = \begin{pmatrix}1&\tfrac13-\tfrac13e^{-3t}\\0&\tfrac13+\tfrac23e^{-3t}\end{pmatrix}$. Checks: at $t=0$ this gives $I$, and at $t\to\infty$ it gives $\begin{pmatrix}1&\tfrac13\\0&\tfrac13\end{pmatrix}$.
> First error: $e^{\Lambda t}V$ written as $\begin{pmatrix}2&1\\1&-e^{-3t}\end{pmatrix}$: the factor $e^{-3t}$ was applied only to the $(2,2)$ entry instead of the whole second row.
>
> The decomposition $V^{-1}e^{\Lambda t}V$ and $e^{\Lambda t}=\mathrm{diag}(1,e^{-3t})$ are right, and your $(1,2)$ and $(2,2)$ entries are correct. In $e^{\Lambda t}V$, the $e^{-3t}$ multiplied only the $(2,2)$ entry rather than the entire second row. This makes the first column ($1$ and $0$) wrong. Your $t\to\infty$ limit $\begin{pmatrix}1&\tfrac13\\0&\tfrac13\end{pmatrix}$ has rows that do not sum to $1$, which signals the error, but it went unremarked. The $t=0$ check passing here is a coincidence.


> [!abstract] PI

Here is a confident derivation of the closed form. Read it as a referee.


> [!question] Recall — Find the flaw
> A colleague writes:
>
> "Let $V$ have the left eigenvectors of $Q$ as its rows and $\Lambda = \mathrm{diag}(\lambda_i)$. The eigenvector equations $v_i Q = \lambda_i v_i$ stack to
>
> $$VQ = \Lambda V.$$
>
> Since the $v_i$ are independent, $V$ is invertible, so we can solve for $Q$:
>
> $$Q = V \Lambda V^{-1}.$$
>
> Then $Q^k = V\Lambda^k V^{-1}$ because the inner $V^{-1}V$ pairs cancel, and summing the series,
>
> $$e^{Qt} = V e^{\Lambda t} V^{-1}.$$
>
> Check on $Q = \begin{pmatrix} -3 & 3 \\ 1 & -1 \end{pmatrix}$, $V = \begin{pmatrix} 1 & 3 \\ 1 & -1 \end{pmatrix}$, $\Lambda = \mathrm{diag}(0,-4)$: at $t = 0$ this gives $VV^{-1} = I$, as it should."
>
> Is this right? If not, where exactly does it go wrong, and what is the correct line?


> [!failure] Recall — incorrect ✗ (0%)
> Your answer (photo):
> ![[work-20261020-193711.png|500]]
> Read as: The learner wrote only "this is correct", which accepts the colleague's argument as right. There is no working and no error identified.
> First error: Accepted the argument; missed that $Q = V\Lambda V^{-1}$ does not follow from $VQ = \Lambda V$.
>
> The argument contains a real error, and calling it correct misses it. The step that solves $VQ = \Lambda V$ for $Q$ is invalid: the order of the factors is wrong for a $V$ whose rows are left eigenvectors. The $t=0$ check and this particular $2\times 2$ example both happen to hide the problem.


> [!abstract] PI

The bad line is $Q = V\Lambda V^{-1}$. From $VQ = \Lambda V$ you isolate $Q$ by multiplying on the *left* by $V^{-1}$ (to kill the $V$ sitting left of $Q$), and matrices do not commute, so the order you land on is forced. I owe you one admission: for that particular $V$, $V^2 = 4I$ so $V^{-1} = V/4$ and both orders happen to give the same matrix. The step is still invalid as a derivation. For the matrix from the completion, $V = \begin{pmatrix} 2 & 1 \\ 1 & -1 \end{pmatrix}$, the two orders differ.


> [!question] Recall — Find the flaw
> Drill-down, one step. You have $VQ = \Lambda V$ with $V$ invertible.
>
> Multiply both sides by $V^{-1}$ on the correct side so that $Q$ stands alone, and write the resulting formula for $Q$. Say which side you multiplied on and why that side.


> [!success] Recall — correct ✓ (90%)
> Your answer (photo):
> ![[work-20261020-194025-1.png|500]]
> ![[work-20261020-194025-2.png|500]]
> Read as: Photo 1: $VQ=\Lambda V$, then $V^{-1}VQ = V^{-1}\Lambda V$, then $IQ = V^{-1}\Lambda V$, boxed $Q = V^{-1}\Lambda V$, with the note "I did it on the left side because that undoes $V$." Photo 2 is blank.
>
> Correct: left-multiplying by $V^{-1}$ gives $V^{-1}VQ = IQ = Q$, so $Q = V^{-1}\Lambda V$, and your working shows the cancellation clearly. One small note: your reason says left "undoes $V$" but does not say why left specifically. The point is that $V$ sits to the left of $Q$, so only $V^{-1}V$ (not $VV^{-1}$ on the right) cancels it.


> [!abstract] PI

That lands: $V^{-1}$ goes on the left because that is where $V$ sits. Now the whole derivation on paper, from the handle to the numbers.


> [!question] Recall — Explain it back
> Handle you own: $\dot c = \lambda c$ has solution $c(0)e^{\lambda t}$ with $e^{\lambda t} = \sum_k \frac{(\lambda t)^k}{k!}$, and a left eigenvector satisfies $v_i Q = \lambda_i v_i$.
>
> Fresh matrix: $Q = \begin{pmatrix} -4 & 4 \\ 2 & -2 \end{pmatrix}$, with $v_1 = (1,2)$, $\lambda_1 = 0$ and $v_2 = (1,-1)$, $\lambda_2 = -6$.
>
> On paper, get from the handle to $e^{Qt}$ for this $Q$, saying at each move why it is the move:
>
> 1. Define $e^{Qt}$ by copying the scalar series, and show in one line why $p(0)e^{Qt}$ solves $\dot p = pQ$.
> 2. Show $v_i e^{Qt} = e^{\lambda_i t} v_i$, and hence that $p(0)e^{Qt}$ is the superposition sum.
> 3. Stack to $VQ = \Lambda V$, isolate $Q$, and get $e^{Qt} = V^{-1} e^{\Lambda t} V$.
> 4. Compute the $2\times 2$ matrix $e^{Qt}$ for this $Q$ and give one sanity check.
>
> Work it on paper and send a photo from your phone, or type your answer.


> [!success] Recall — correct ✓ (87%)
> Your answer (photo):
> ![[work-20261020-213921-1.png|500]]
> ![[work-20261020-213921-2.png|500]]
> ![[work-20261020-213921-3.png|500]]
> ![[work-20261020-213921-4.png|500]]
> ![[work-20261020-213921-5.png|500]]
> ![[work-20261020-213921-6.png|500]]
> Read as: 1) $e^{Qt}=\sum_k \frac{(Qt)^k}{k!}$, differentiates term by term to $Qe^{Qt}$, notes '$Q$ and $e^{Qt}$ commute', so $\frac{d}{dt}p(0)e^{Qt}=p(0)e^{Qt}Q=pQ$. 2) $v_iQ^k=\lambda_i^k v_i$, so $v_ie^{Qt}=\sum_k \frac{t^k\lambda_i^k}{k!}v_i=e^{\lambda_i t}v_i$; 'since $p(t)=c_1(t)v_1+c_2(t)v_2$', $p(t)=\sum_i e^{\lambda_i t}v_i$. 3) $VQ=\Lambda V$, $Q=V^{-1}\Lambda V$, $Q^k=V^{-1}\Lambda^kV$, so $e^{Qt}=V^{-1}e^{\Lambda t}V$. 4) $V=\begin{pmatrix}1&2\\1&-1\end{pmatrix}$, solves for $V^{-1}=\frac13\begin{pmatrix}1&2\\1&-1\end{pmatrix}$ and verifies it, gets $e^{Qt}=\begin{pmatrix}\frac13+\frac23e^{-6t}&\frac23-\frac23e^{-6t}\\\frac13-\frac13e^{-6t}&\frac23+\frac13e^{-6t}\end{pmatrix}$. Checks: $t=0$ gives $I$, rows sum to 1; $t=\infty$ gives rows $(\frac13,\frac23)$, rows sum to 1.
> First error: In step 2 the superposition is written as $p(t)=\sum_i e^{\lambda_i t}v_i$, without the coefficients $c_i$ from $p(0)=\sum_i c_iv_i$.
>
> The series derivative argument, $v_iQ^k=\lambda_i^kv_i$ giving $e^{\lambda_i t}v_i$, $Q=V^{-1}\Lambda V$, and the final $2\times2$ matrix are all correct, and the $t=0$, row-sum and $t\to\infty$ checks are valid. The superposition line drops the weights $c_i$ and does not show where they come from, which would be expanding $p(0)$ in the $v_i$. The index limits in the term-by-term derivative are also untidy.


> [!abstract] PI

Matrix exponential node confirmed and cards saved. Next: the spectrum of the 3-state chain. Checking the worked numbers before writing the reading.


> [!abstract] PI

## Reading — The spectrum of the 3-state Linderstrøm-Lang chain

## What this section is about

The Linderstrøm-Lang chain is the three-state model behind hydrogen-deuterium exchange: a site is **closed** ($C$, protected), opens to **open** ($O$, exposed) at rate $k_{op}$, closes back at $k_{cl}$, and from the open state exchanges irreversibly at the chemical rate $k_{ch}$ into **exchanged** ($E$). This section finds the eigenvalues of its rate matrix. Those three numbers are the whole story of the kinetics: by the matrix exponential, every population is a sum of $e^{\lambda_i t}$ terms, so the eigenvalues are the only rates that can ever appear in a measured uptake curve.

## Why we need it now

We have $p(t) = p(0)e^{Qt} = \sum_i c_i e^{\lambda_i t} v_i$. For the chain, $p = (p_C, p_O, p_E)$ and what you measure is the unexchanged fraction $U(t) = p_C + p_O = 1 - p_E$. So $U(t)$ is a sum of exponentials with the eigenvalues of $Q$ as the decay rates. The question "what is $k_{obs}$?" is literally "what is the slowest nonzero eigenvalue?" We cannot answer it until we have the spectrum.

## Build the generator

Rows are "from", columns are "to", off-diagonal entries are jump rates, diagonals are minus the total exit rate so every row sums to zero (conservation). With the ordering $(C, O, E)$:

$$Q = \begin{pmatrix} -k_{op} & k_{op} & 0 \\ k_{cl} & -(k_{cl}+k_{ch}) & k_{ch} \\ 0 & 0 & 0 \end{pmatrix}.$$

The last row is all zeros because $E$ is absorbing: nothing leaves it.

## How you could have found the eigenvalues

Eigenvalues are the roots of $\det(Q - \lambda I) = 0$. Before expanding anything, look at the shape. The third row of $Q - \lambda I$ is $(0, 0, -\lambda)$. Expanding the determinant along that row gives

$$\det(Q - \lambda I) = -\lambda \cdot \det(A - \lambda I), \qquad A = \begin{pmatrix} -k_{op} & k_{op} \\ k_{cl} & -(k_{cl}+k_{ch}) \end{pmatrix}.$$

So one eigenvalue is $\lambda_0 = 0$ **immediately**, and it is the absorbing state's: the left eigenvector is $v_0 = (0,0,1)$ (check: $(0,0,1)Q$ is the zero row). This is the stationary split, everything exchanged. The other two eigenvalues come from the $2\times 2$ block $A$, which is just the $C \rightleftharpoons O$ system with an extra leak $k_{ch}$ out of $O$.

For a $2\times 2$ matrix, $\det(A - \lambda I) = \lambda^2 - (\operatorname{tr} A)\lambda + \det A$. Here

$$\operatorname{tr} A = -(k_{op} + k_{cl} + k_{ch}) \equiv -S, \qquad \det A = k_{op}(k_{cl}+k_{ch}) - k_{op}k_{cl} = k_{op}k_{ch} \equiv P.$$

Notice the cancellation in the determinant: the $k_{op}k_{cl}$ terms kill each other and only the *product of the two rates along the exit path* survives, $k_{op}k_{ch}$. The characteristic equation is

$$\lambda^2 + S\lambda + P = 0, \qquad \lambda_\pm = \frac{-S \pm \sqrt{S^2 - 4P}}{2}.$$

Both roots are real and negative: $S^2 - 4P = (k_{op} - k_{ch})^2 + k_{cl}^2 + 2k_{cl}(k_{op}+k_{ch}) > 0$, and since $S > 0$ and $P > 0$ both roots have negative real part (sum $-S$, product $P$). So the spectrum is $\{0, \lambda_-, \lambda_+\}$ with $\lambda_- < \lambda_+ < 0$. One mode is stationary, one is fast, one is slow.

## The approximation you will actually use

In HDX, $P = k_{op}k_{ch}$ is almost always tiny compared to $S^2$ (opening is rare, or closing is fast, or both). For a quadratic with $P \ll S^2$, the two roots are very unequal and you can read them off without the square root. The product of the roots is $P$ and their sum is $-S$: if one root is tiny, the other must carry the whole sum, so

$$\lambda_{\text{fast}} \approx -S, \qquad \lambda_{\text{slow}} \approx -\frac{P}{S} = -\frac{k_{op}k_{ch}}{k_{op}+k_{cl}+k_{ch}}.$$

(Same thing from the square root: $\sqrt{S^2 - 4P} \approx S - 2P/S$ to first order.) The slow one is the rate the experiment sees over long times, and when $k_{op} \ll k_{cl} + k_{ch}$ it reduces to the formula you already carry: $k_{obs} = \dfrac{k_{op}k_{ch}}{k_{cl}+k_{ch}}$.

## Worked instance

Take $k_{op} = 1$, $k_{cl} = 100$, $k_{ch} = 10$ (all per second).

**Step 1, $S$ and $P$.** $S = 1 + 100 + 10 = 111$. $P = 1 \times 10 = 10$. (Only the product along the exit path enters $P$; $k_{cl}$ shows up in $S$ alone.)

**Step 2, discriminant.** $S^2 - 4P = 12321 - 40 = 12281$, $\sqrt{12281} \approx 110.82$. The $4P$ is a tiny correction under the root: the roots are going to be very unequal.

**Step 3, roots.** $\lambda_+ = \frac{-111 + 110.82}{2} \approx -0.090$ per second, $\lambda_- = \frac{-111 - 110.82}{2} \approx -110.9$ per second.

**Step 4, check against the shortcut.** $-P/S = -10/111 = -0.0901$. Agrees to three figures. And the familiar $k_{op}k_{ch}/(k_{cl}+k_{ch}) = 10/110 = 0.0909$, off by one percent because it drops $k_{op}$ from the denominator. Fast mode: $-S = -111$ versus the exact $-110.9$.

**Step 5, read it.** The spectrum is $\{0, -0.09, -111\}$. Within about $1/111 \approx 0.01$ s the fast mode is gone: the $C \rightleftharpoons O$ pre-equilibrium has settled. After that, the unexchanged fraction decays as a single exponential with $k_{obs} \approx 0.09$ per second, a thousandfold slower. The ratio $\lambda_-/\lambda_+ \approx 1200$ is what makes the one-exponential description of HDX work.

## What it hangs off

The matrix exponential: $p(t) = p(0)e^{Qt} = \sum_i c_i e^{\lambda_i t} v_i$ says the only rates that can appear in any population are eigenvalues of $Q$, which is why we hunt for them. The $2\times 2$ eigenvalue formula from trace and determinant is the same handle you used to find $(3,2)$ and $(1,-1)$ earlier. And the zero eigenvalue is the same conservation mode as before, now sitting on the absorbing state instead of on a stationary split between live states.


> [!quote] YOU

> [!note] SKILL loaded: teach

Continue the lesson "Matrix exponential for linear ODEs: modes of the Linderstrøm-Lang chain" (slug: matrix-exponential-linear-odes). Nothing is timed: he may walk away mid-answer and come back later. Never mention time, pace, speed or a budget; stop only when he says stop or the goal lands.


> [!quote] YOU

> [!note] SKILL loaded: teach

Continue the lesson "Matrix exponential for linear ODEs: modes of the Linderstrøm-Lang chain" (slug: matrix-exponential-linear-odes). Nothing is timed: he may walk away mid-answer and come back later. Never mention time, pace, speed or a budget; stop only when he says stop or the goal lands.


> [!quote] YOU

> [!note] SKILL loaded: teach

Continue the lesson "Matrix exponential for linear ODEs: modes of the Linderstrøm-Lang chain" (slug: matrix-exponential-linear-odes). Nothing is timed: he may walk away mid-answer and come back later. Never mention time, pace, speed or a budget; stop only when he says stop or the goal lands.


> [!abstract] PI

I'll pick up the lesson where it left off: close the shaky superposition node with one fresh completion, then move to the spectrum of the 3-state chain.


> [!abstract] PI

The spectrum reading was written to the note but never registered, so the tools treat it as unread. Re-issuing it so he can read it and tap ready.


> [!abstract] PI

## Reading — The spectrum of the 3-state Linderstrøm-Lang chain

## What this section is about

The Linderstrøm-Lang chain is the three-state model behind hydrogen-deuterium exchange: a site is **closed** ($C$, protected), opens to **open** ($O$, exposed) at rate $k_{op}$, closes back at $k_{cl}$, and from the open state exchanges irreversibly at the chemical rate $k_{ch}$ into **exchanged** ($E$). This section finds the eigenvalues of its rate matrix. Those three numbers are the whole story of the kinetics: by the matrix exponential, every population is a sum of $e^{\lambda_i t}$ terms, so the eigenvalues are the only rates that can ever appear in a measured uptake curve.

## Why we need it now

We have $p(t) = p(0)e^{Qt} = \sum_i c_i e^{\lambda_i t} v_i$. For the chain, $p = (p_C, p_O, p_E)$ and what you measure is the unexchanged fraction $U(t) = p_C + p_O = 1 - p_E$. So $U(t)$ is a sum of exponentials with the eigenvalues of $Q$ as the decay rates. The question "what is $k_{obs}$?" is literally "what is the slowest nonzero eigenvalue?" We cannot answer it until we have the spectrum.

## Build the generator

Rows are "from", columns are "to", off-diagonal entries are jump rates, diagonals are minus the total exit rate so every row sums to zero (conservation). With the ordering $(C, O, E)$:

$$Q = \begin{pmatrix} -k_{op} & k_{op} & 0 \\ k_{cl} & -(k_{cl}+k_{ch}) & k_{ch} \\ 0 & 0 & 0 \end{pmatrix}.$$

The last row is all zeros because $E$ is absorbing: nothing leaves it.

## How you could have found the eigenvalues

Eigenvalues are the roots of $\det(Q - \lambda I) = 0$. Before expanding anything, look at the shape. The third row of $Q - \lambda I$ is $(0, 0, -\lambda)$. Expanding the determinant along that row gives

$$\det(Q - \lambda I) = -\lambda \cdot \det(A - \lambda I), \qquad A = \begin{pmatrix} -k_{op} & k_{op} \\ k_{cl} & -(k_{cl}+k_{ch}) \end{pmatrix}.$$

So one eigenvalue is $\lambda_0 = 0$ **immediately**, and it is the absorbing state's: the left eigenvector is $v_0 = (0,0,1)$ (check: $(0,0,1)Q$ is the zero row). This is the stationary split, everything exchanged. The other two eigenvalues come from the $2\times 2$ block $A$, which is just the $C \rightleftharpoons O$ system with an extra leak $k_{ch}$ out of $O$.

For a $2\times 2$ matrix, $\det(A - \lambda I) = \lambda^2 - (\operatorname{tr} A)\lambda + \det A$. Here

$$\operatorname{tr} A = -(k_{op} + k_{cl} + k_{ch}) \equiv -S, \qquad \det A = k_{op}(k_{cl}+k_{ch}) - k_{op}k_{cl} = k_{op}k_{ch} \equiv P.$$

Notice the cancellation in the determinant: the $k_{op}k_{cl}$ terms kill each other and only the *product of the two rates along the exit path* survives, $k_{op}k_{ch}$. The characteristic equation is

$$\lambda^2 + S\lambda + P = 0, \qquad \lambda_\pm = \frac{-S \pm \sqrt{S^2 - 4P}}{2}.$$

Both roots are real and negative: $S^2 - 4P = (k_{op} - k_{ch})^2 + k_{cl}^2 + 2k_{cl}(k_{op}+k_{ch}) > 0$, and since $S > 0$ and $P > 0$ both roots are negative (sum $-S$, product $P$). So the spectrum is $\{0, \lambda_-, \lambda_+\}$ with $\lambda_- < \lambda_+ < 0$. One mode is stationary, one is fast, one is slow.

## The approximation you will actually use

In HDX, $P = k_{op}k_{ch}$ is almost always tiny compared to $S^2$ (opening is rare, or closing is fast, or both). For a quadratic with $P \ll S^2$, the two roots are very unequal and you can read them off without the square root. The product of the roots is $P$ and their sum is $-S$: if one root is tiny, the other must carry the whole sum, so

$$\lambda_{\text{fast}} \approx -S, \qquad \lambda_{\text{slow}} \approx -\frac{P}{S} = -\frac{k_{op}k_{ch}}{k_{op}+k_{cl}+k_{ch}}.$$

(Same thing from the square root: $\sqrt{S^2 - 4P} \approx S - 2P/S$ to first order.) The slow one is the rate the experiment sees over long times, and when $k_{op} \ll k_{cl} + k_{ch}$ it reduces to the formula you already carry: $k_{obs} = \dfrac{k_{op}k_{ch}}{k_{cl}+k_{ch}}$.

## Worked instance

Take $k_{op} = 1$, $k_{cl} = 100$, $k_{ch} = 10$ (all per second).

**Step 1, $S$ and $P$.** $S = 1 + 100 + 10 = 111$. $P = 1 \times 10 = 10$. (Only the product along the exit path enters $P$; $k_{cl}$ shows up in $S$ alone.)

**Step 2, discriminant.** $S^2 - 4P = 12321 - 40 = 12281$, $\sqrt{12281} \approx 110.82$. The $4P$ is a tiny correction under the root: the roots are going to be very unequal.

**Step 3, roots.** $\lambda_+ = \frac{-111 + 110.82}{2} \approx -0.090$ per second, $\lambda_- = \frac{-111 - 110.82}{2} \approx -110.9$ per second.

**Step 4, check against the shortcut.** $-P/S = -10/111 = -0.0901$. Agrees to three figures. And the familiar $k_{op}k_{ch}/(k_{cl}+k_{ch}) = 10/110 = 0.0909$, off by one percent because it drops $k_{op}$ from the denominator. Fast mode: $-S = -111$ versus the exact $-110.9$.

**Step 5, read it.** The spectrum is $\{0, -0.09, -111\}$. Within about $1/111 \approx 0.01$ s the fast mode is gone: the $C \rightleftharpoons O$ pre-equilibrium has settled. After that, the unexchanged fraction decays as a single exponential with $k_{obs} \approx 0.09$ per second, a thousandfold slower. The ratio $\lambda_-/\lambda_+ \approx 1200$ is what makes the one-exponential description of HDX work.

## What it hangs off

The matrix exponential: $p(t) = p(0)e^{Qt} = \sum_i c_i e^{\lambda_i t} v_i$ says the only rates that can appear in any population are eigenvalues of $Q$, which is why we hunt for them. The $2\times 2$ eigenvalue formula from trace and determinant is the same handle you used to find $(3,2)$ and $(1,-1)$ earlier. And the zero eigenvalue is the same conservation mode as before, now sitting on the absorbing state instead of on a stationary split between live states.


> [!example] Reading — read ✓
> Read it; ready for the question.


> [!abstract] PI

First next-move check on the spectrum. One move, and the reason for it.


> [!question] Recall — Recall · next move
> We want the eigenvalues of
>
> $$Q = \begin{pmatrix} -k_{op} & k_{op} & 0 \\ k_{cl} & -(k_{cl}+k_{ch}) & k_{ch} \\ 0 & 0 & 0 \end{pmatrix},$$
>
> so we write down $\det(Q - \lambda I) = 0$ with
>
> $$Q - \lambda I = \begin{pmatrix} -k_{op}-\lambda & k_{op} & 0 \\ k_{cl} & -(k_{cl}+k_{ch})-\lambda & k_{ch} \\ 0 & 0 & -\lambda \end{pmatrix}.$$
>
> Before expanding the full $3\times 3$ determinant: what is the next move, and why is that the move that saves the work?
>
> *Next move only: say what the next step is and why that one, not the whole derivation.*


> [!quote] YOU

> [!note] SKILL loaded: teach

Continue the lesson "Matrix exponential for linear ODEs: modes of the Linderstrøm-Lang chain" (slug: matrix-exponential-linear-odes). Nothing is timed: he may walk away mid-answer and come back later. Never mention time, pace, speed or a budget; stop only when he says stop or the goal lands.


> [!abstract] PI

I'll pick up the matrix-exponential lesson where it left off: one fresh completion to close superposition, then the spectrum of the 3-state chain.


> [!abstract] PI

## Reading — The spectrum of the 3-state Linderstrøm-Lang chain

## What this section is about

The Linderstrøm-Lang chain is the three-state model behind hydrogen-deuterium exchange: a site is **closed** ($C$, protected), opens to **open** ($O$, exposed) at rate $k_{op}$, closes back at $k_{cl}$, and from the open state exchanges irreversibly at the chemical rate $k_{ch}$ into **exchanged** ($E$). This section finds the eigenvalues of its rate matrix. Those three numbers are the whole story of the kinetics: by the matrix exponential, every population is a sum of $e^{\lambda_i t}$ terms, so the eigenvalues are the only rates that can ever appear in a measured uptake curve.

## Why we need it now

We have $p(t) = p(0)e^{Qt} = \sum_i c_i e^{\lambda_i t} v_i$. For the chain, $p = (p_C, p_O, p_E)$ and what you measure is the unexchanged fraction $U(t) = p_C + p_O = 1 - p_E$. So $U(t)$ is a sum of exponentials with the eigenvalues of $Q$ as the decay rates. The question "what is $k_{obs}$?" is literally "what is the slowest nonzero eigenvalue?" We cannot answer it until we have the spectrum.

## Build the generator

Rows are "from", columns are "to", off-diagonal entries are jump rates, diagonals are minus the total exit rate so every row sums to zero (conservation). With the ordering $(C, O, E)$:

$$Q = \begin{pmatrix} -k_{op} & k_{op} & 0 \\ k_{cl} & -(k_{cl}+k_{ch}) & k_{ch} \\ 0 & 0 & 0 \end{pmatrix}.$$

The last row is all zeros because $E$ is absorbing: nothing leaves it.

## How you could have found the eigenvalues

Eigenvalues are the roots of $\det(Q - \lambda I) = 0$. Before expanding anything, look at the shape. The third row of $Q - \lambda I$ is $(0, 0, -\lambda)$. Expanding the determinant along that row gives

$$\det(Q - \lambda I) = -\lambda \cdot \det(A - \lambda I), \qquad A = \begin{pmatrix} -k_{op} & k_{op} \\ k_{cl} & -(k_{cl}+k_{ch}) \end{pmatrix}.$$

So one eigenvalue is $\lambda_0 = 0$ **immediately**, and it is the absorbing state's: the left eigenvector is $v_0 = (0,0,1)$ (check: $(0,0,1)Q$ is the zero row). This is the stationary split, everything exchanged. The other two eigenvalues come from the $2\times 2$ block $A$, which is just the $C \rightleftharpoons O$ system with an extra leak $k_{ch}$ out of $O$.

For a $2\times 2$ matrix, $\det(A - \lambda I) = \lambda^2 - (\operatorname{tr} A)\lambda + \det A$. Here

$$\operatorname{tr} A = -(k_{op} + k_{cl} + k_{ch}) \equiv -S, \qquad \det A = k_{op}(k_{cl}+k_{ch}) - k_{op}k_{cl} = k_{op}k_{ch} \equiv P.$$

Notice the cancellation in the determinant: the $k_{op}k_{cl}$ terms kill each other and only the *product of the two rates along the exit path* survives, $k_{op}k_{ch}$. The characteristic equation is

$$\lambda^2 + S\lambda + P = 0, \qquad \lambda_\pm = \frac{-S \pm \sqrt{S^2 - 4P}}{2}.$$

Both roots are real and negative: $S^2 - 4P = (k_{op} - k_{ch})^2 + k_{cl}^2 + 2k_{cl}(k_{op}+k_{ch}) > 0$, and since $S > 0$ and $P > 0$ both roots are negative (sum $-S$, product $P$). So the spectrum is $\{0, \lambda_-, \lambda_+\}$ with $\lambda_- < \lambda_+ < 0$. One mode is stationary, one is fast, one is slow.

## The approximation you will actually use

In HDX, $P = k_{op}k_{ch}$ is almost always tiny compared to $S^2$ (opening is rare, or closing is fast, or both). For a quadratic with $P \ll S^2$, the two roots are very unequal and you can read them off without the square root. The product of the roots is $P$ and their sum is $-S$: if one root is tiny, the other must carry the whole sum, so

$$\lambda_{\text{fast}} \approx -S, \qquad \lambda_{\text{slow}} \approx -\frac{P}{S} = -\frac{k_{op}k_{ch}}{k_{op}+k_{cl}+k_{ch}}.$$

(Same thing from the square root: $\sqrt{S^2 - 4P} \approx S - 2P/S$ to first order.) The slow one is the rate the experiment sees over long times, and when $k_{op} \ll k_{cl} + k_{ch}$ it reduces to the formula you already carry: $k_{obs} = \dfrac{k_{op}k_{ch}}{k_{cl}+k_{ch}}$.

## Worked instance

Take $k_{op} = 1$, $k_{cl} = 100$, $k_{ch} = 10$ (all per second).

**Step 1, $S$ and $P$.** $S = 1 + 100 + 10 = 111$. $P = 1 \times 10 = 10$. (Only the product along the exit path enters $P$; $k_{cl}$ shows up in $S$ alone.)

**Step 2, discriminant.** $S^2 - 4P = 12321 - 40 = 12281$, $\sqrt{12281} \approx 110.82$. The $4P$ is a tiny correction under the root: the roots are going to be very unequal.

**Step 3, roots.** $\lambda_+ = \frac{-111 + 110.82}{2} \approx -0.090$ per second, $\lambda_- = \frac{-111 - 110.82}{2} \approx -110.9$ per second.

**Step 4, check against the shortcut.** $-P/S = -10/111 = -0.0901$. Agrees to three figures. And the familiar $k_{op}k_{ch}/(k_{cl}+k_{ch}) = 10/110 = 0.0909$, off by one percent because it drops $k_{op}$ from the denominator. Fast mode: $-S = -111$ versus the exact $-110.9$.

**Step 5, read it.** The spectrum is $\{0, -0.09, -111\}$. Within about $1/111 \approx 0.01$ s the fast mode is gone: the $C \rightleftharpoons O$ pre-equilibrium has settled. After that, the unexchanged fraction decays as a single exponential with $k_{obs} \approx 0.09$ per second, a thousandfold slower. The ratio $\lambda_-/\lambda_+ \approx 1200$ is what makes the one-exponential description of HDX work.

## What it hangs off

The matrix exponential: $p(t) = p(0)e^{Qt} = \sum_i c_i e^{\lambda_i t} v_i$ says the only rates that can appear in any population are eigenvalues of $Q$, which is why we hunt for them. The $2\times 2$ eigenvalue formula from trace and determinant is the same handle you used to find $(3,2)$ and $(1,-1)$ earlier. And the zero eigenvalue is the same conservation mode as before, now sitting on the absorbing state instead of on a stationary split between live states.


> [!example] Reading — read ✓
> Read it; ready for the question.


> [!abstract] PI

First next-move check on the spectrum. One move, and the reason for it.


> [!question] Recall — Recall · next move
> We want the eigenvalues of
>
> $$Q = \begin{pmatrix} -k_{op} & k_{op} & 0 \\ k_{cl} & -(k_{cl}+k_{ch}) & k_{ch} \\ 0 & 0 & 0 \end{pmatrix},$$
>
> so we write down $\det(Q - \lambda I) = 0$ with
>
> $$Q - \lambda I = \begin{pmatrix} -k_{op}-\lambda & k_{op} & 0 \\ k_{cl} & -(k_{cl}+k_{ch})-\lambda & k_{ch} \\ 0 & 0 & -\lambda \end{pmatrix}.$$
>
> Before expanding the full $3\times 3$ determinant: what is the next move, and why is that the move that saves the work?
>
> *Next move only: say what the next step is and why that one, not the whole derivation.*


> [!success] Recall — correct ✓ (90%)
> Your answer (photo):
> ![[work-20261029-204623.png|500]]
> Read as: The learner wrote: "Instead we swap the top and bottom row, so now our det only has one non-zero factor so $\det(Q-\lambda I) = -\lambda \det\begin{pmatrix} -k_{op}-\lambda & k_{op} \\ k_{cl} & -(k_{cl}+k_{ch})-\lambda \end{pmatrix}$."
>
> You correctly saw that the row $(0,0,-\lambda)$ leaves only one surviving term, and your factorization $\det(Q-\lambda I) = -\lambda\det\begin{pmatrix} -k_{op}-\lambda & k_{op} \\ k_{cl} & -(k_{cl}+k_{ch})-\lambda \end{pmatrix}$ is right. The row swap wasn't needed, since expanding along the third row in place gives this directly. A row swap also changes the sign of a determinant, and your write-up doesn't account for that, even though the result comes out correct.


> [!abstract] PI

Right: the row of two zeros collapses the determinant to one term, and $\lambda = 0$ falls out for free. (You can expand along that row in place; no swap needed.) Second decision point, further down the derivation.


> [!question] Recall — Recall · next move
> The $2\times 2$ block gave the characteristic equation
>
> $$\lambda^2 + S\lambda + P = 0, \qquad S = k_{op} + k_{cl} + k_{ch}, \quad P = k_{op}k_{ch},$$
>
> with exact roots $\lambda_\pm = \dfrac{-S \pm \sqrt{S^2 - 4P}}{2}$. Now we notice that in HDX $P \ll S^2$.
>
> What is the next move to get the slow and fast eigenvalues *without* the square root, and why is that move legitimate when $P \ll S^2$?
>
> *Next move only: say what the next step is and why that one, not the whole derivation.*
