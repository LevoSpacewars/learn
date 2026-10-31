# Side chat

Questions asked about the material outside the lessons.

> [!quote] YOU · 2026-10-17 19:27 · matrix-exponential-linear-odes

I'm getting confused. how does p(0) which is a scalaer, times some multiple (also a scalar), be equal to a scalar times a vector?

> [!abstract] TUTOR (side)

$p(0)$ is not a scalar. It is a row vector: the whole starting population, all three (or two) states at once.

In the two-state example, $p(0) = (0.1, -0.1)$. That is a row with two entries, not a number. The notation $p(0)$ just means "the population row at time $0$", the same way $p(t)$ means the row at time $t$.

So "$p(0)$ is a multiple of $v$" says:

$$p(0) = c(0)\,v$$

where $c(0)$ is the scalar and $v$ is the row. With $v = (1,-1)$ and $c(0) = 0.1$:

$$0.1 \cdot (1, -1) = (0.1, -0.1).$$

Scalar times vector gives a vector, and that vector is $p(0)$. Both sides are rows. Nothing scalar is being set equal to anything vector.

Where the scalar really lives: the only scalar in the story is $c(t)$, the amplitude. The claim of the node is that if the starting *row* $p(0)$ points along $v$, then the *row* $p(t)$ keeps pointing along $v$ for all time, and only the scalar in front changes, $p(t) = c(t)\,v$. The matrix equation $\dot p = pQ$ is an equation between rows; along an eigenvector both rows are multiples of $v$, so matching the multipliers leaves one equation between scalars, $\dot c = \lambda c$.

A useful habit when this confusion returns: write $p$ out with its entries in parentheses, $(p_1, p_2)$, every time. The moment you see the comma you know it is a vector.

If you want to go further, ask why $p$ and $v$ have to be *rows* specifically, and what would change if they were columns.

> [!quote] YOU · 2026-10-18 19:13 · matrix-exponential-linear-odes

this is kindof cool. so for the current worked instance, is every p(0) (that is physically possible) spaned by the eigenbasis?

> [!abstract] TUTOR (side)

Yes, and in fact more than that: *every* row $p(0)$, physical or not, is spanned by the eigenbasis in this worked instance. The two left eigenvectors $v_0 = (4, 1)$ and $v_1 = (1, -1)$ are not parallel, so they are a basis of all 2-component rows. Any $(a, b)$ can be written as $c_0 v_0 + c_1 v_1$ for a unique pair of coefficients.

Concretely, start with all population in state 1, $p(0) = (1, 0)$. Solve

$$(1, 0) = c_0 (4, 1) + c_1 (1, -1)$$

componentwise: $4c_0 + c_1 = 1$ and $c_0 - c_1 = 0$, so $c_0 = c_1 = 1/5$. Check: $\tfrac15(4,1) + \tfrac15(1,-1) = (1, 0)$. So "everything in state 1" is the stationary split $(0.8, 0.2)$ plus a deviation $(0.2, -0.2)$, and that deviation is exactly what decays as $e^{-5t}$. That is the whole next node in one line.

Why "physical" doesn't need to enter: the physical constraint is $p_C + p_O = 1$ with both nonnegative, which is a slice of the plane, and the eigenbasis spans the whole plane. One nice consequence of it, though: since $v_1$ has components summing to zero, the total population lives entirely in the $v_0$ coefficient. Summing both sides of $p(0) = c_0 v_0 + c_1 v_1$ gives $1 = 5c_0$, so $c_0 = 1/5$ for **every** physical start. Only $c_1$ varies with the initial condition, and it carries the transient.

The general fact: an $n\times n$ matrix with $n$ distinct eigenvalues always has $n$ independent eigenvectors, hence a basis. Your three-state $Q$ has eigenvalues $0, \lambda_+, \lambda_-$, all distinct, so the same holds there. The case that can fail is a repeated eigenvalue with too few eigenvectors (a "defective" matrix), which the lesson will not run into. If you want, ask next why distinct eigenvalues force independence.

> [!quote] YOU · 2026-10-18 19:15 · matrix-exponential-linear-odes

gotcha. However I am confused, lambda1 is 0, so that means it v1 = (4,1) so it's stationary at C:O 4:1?

> [!abstract] TUTOR (side)

Yes, that's right, with one label fix: in the lesson's notation the $\lambda = 0$ eigenvector is called $v_0 = (4, 1)$, and $v_1 = (1, -1)$ is the one for $\lambda = -5$. Your reading of what $v_0$ means is correct.

**Why $\lambda = 0$ means stationary.** Along an eigenvector the amplitude obeys $\dot c = \lambda c$, so $c(t) = c(0)e^{0 \cdot t} = c(0)$. Nothing moves. And $vQ = 0 \cdot v = 0$ is literally the statement $\dot p = 0$ for $p \propto v$.

**Why the split is 4:1.** State 1 leaks to state 2 at $1$/s, state 2 leaks back at $4$/s. Flows balance when

$$p_1 \cdot 1 = p_2 \cdot 4 \quad\Longrightarrow\quad p_1 : p_2 = 4 : 1 .$$

That's the same flux-balance condition you met as "stationary = balanced flows" in the Markov-chain lesson, now appearing as the $\lambda = 0$ eigenvector. (In the worked instance the states are just "1" and "2"; if you read them as $C$ and $O$, then yes, $C\!:\!O = 4\!:\!1$.)

**One care point.** An eigenvector fixes a direction, not a length. $(4, 1)$, $(8, 2)$, $(0.8, 0.2)$ are all the same eigenvector. The actual stationary *population* is the one normalised to total $1$, namely $(0.8, 0.2)$. That is why, in the side answer above, every physical start had $c_0 = 1/5$: it's the scale factor that turns $(4, 1)$ into $(0.8, 0.2)$.

Put together with the last answer: any physical $p(0)$ is $(0.8, 0.2)$ plus some multiple of $(1, -1)$, and the multiple decays as $e^{-5t}$ while the $(0.8, 0.2)$ part sits still. So every start relaxes to the 4:1 split, which is what "stationary" should mean.

> [!quote] YOU · 2026-10-18 19:25 · matrix-exponential-linear-odes

ah I see, and lambda 1 is just the deviation away from the stationary? So let's say we have c->o is 1 and o->c 1.  I solved that we get lambda= 0, -1/2. Where for v0 we get (1,1)a where a is any number, and for v1 we get (1,-1)b. Which doesn't make sense to me, shouldn't this be oscillatory if the starting population is deviated away from the stationary distribution?

> [!abstract] TUTOR (side)

Right idea, and one arithmetic slip. Yes, $\lambda_1$ (with $v_1 = (1,-1)$) is exactly the deviation from stationary, and your eigenvectors are correct. But the nonzero eigenvalue is $-2$, not $-1/2$:

$$Q = \begin{pmatrix} -1 & 1 \\ 1 & -1 \end{pmatrix}, \qquad \det(Q - \lambda I) = (-1-\lambda)^2 - 1 = \lambda^2 + 2\lambda = \lambda(\lambda + 2).$$

Check directly: $(1,-1)Q = (-1-1,\; 1+1) = (-2, 2) = -2\,(1,-1)$. Same pattern as before: $5 = 1 + 4$ there, $2 = 1 + 1$ here. The relaxation rate of a two-state system is always the sum of the two rates.

**Why no oscillation.** Oscillation needs a complex eigenvalue, because $e^{\lambda t}$ only wiggles when $\lambda$ has an imaginary part ($e^{(a+ib)t} = e^{at}(\cos bt + i\sin bt)$). Your eigenvalues are real, so every mode is a plain exponential: $c_1(t) = c_1(0)e^{-2t}$, which shrinks monotonically and never changes sign. Concretely, start all in $C$:

$$(1,0) = \tfrac12(1,1) + \tfrac12(1,-1) \quad\Longrightarrow\quad p(t) = \left(\tfrac12 + \tfrac12 e^{-2t},\; \tfrac12 - \tfrac12 e^{-2t}\right).$$

$p_C$ slides from $1$ down to $0.5$ and stops. It never dips below $0.5$ and comes back.

**The physical reason it can't overshoot.** Think of what drives the change: the net flow $C \to O$ is $p_C \cdot 1 - p_O \cdot 1$, proportional to the imbalance itself. As the imbalance shrinks, the flow shrinks, and at exact balance the flow is zero. There is nothing to carry the system past that point. A pendulum overshoots because it has a second variable, velocity, that is still nonzero when the displacement hits zero. A population has no momentum: the only variable is the imbalance, and when it is gone, it is gone. This is the same fact as "rate = probability $k\,dt$ per tiny step": each step mixes the current distribution toward balance, and mixing cannot un-mix.

Stronger statement, which holds for the whole lesson: any rate matrix satisfying detailed balance (every pair of states has balanced flows at stationarity, true for your $C \rightleftharpoons O$ and for $C \rightleftharpoons O \to X$) has only real eigenvalues. Complex eigenvalues, hence damped oscillations, require a cycle with net circulating flow, like $A \to B \to C \to A$ driven one way. That never shows up in the Linderstrøm-Lang chain.

If you want to go further, ask what the smallest rate matrix with complex eigenvalues looks like.

> [!quote] YOU · 2026-10-18 19:28 · matrix-exponential-linear-odes

oh I see, it's because the rate of change of O and C is proportional to the current population of O and of C,

> [!abstract] TUTOR (side)

Yes, that's it, with one sharpening: it's not just that each rate is proportional to a population, it's that the **net** flow is proportional to the **imbalance**, and that imbalance is the only thing that can change.

Write it out for your symmetric case. The flow $C \to O$ is $1 \cdot p_C$, the flow back is $1 \cdot p_O$, so

$$\frac{dp_O}{dt} = p_C - p_O .$$

Now use $p_C + p_O = 1$ and define the deviation from stationary, $d = p_O - \tfrac12$. Then $p_C - p_O = 1 - 2p_O = -2d$, so

$$\frac{d\,d}{dt} = -2\,d .$$

That is Handle 1 with $\lambda = -2$: the deviation obeys the scalar decay law. Its slope is always proportional to itself with a negative constant, so when $d$ is positive it decreases, when $d$ is negative it increases, and when $d = 0$ it stops. A curve whose slope is $-2$ times its current value cannot cross zero, because at zero the slope is zero.

Contrast with something that *can* oscillate, so you see what's missing. A mass on a spring obeys $\ddot x = -k x$: the **acceleration** is proportional to minus the displacement, not the velocity. When $x$ reaches zero the velocity is still nonzero, so it keeps going. The population equation is first order in time: there is no second variable like velocity to carry it through. The deviation $d$ is the whole state, and the equation says "shrink in proportion to how far off you are."

Same picture in the eigenvector language: $d$ is the coefficient $c_1$ on $(1, -1)$, and $\dot c_1 = \lambda_1 c_1$ with real $\lambda_1 = -2$. Real eigenvalue, monotone decay. If you want to go further, ask what $\dot p = pQ$ would need in order to behave like the spring instead.

> [!quote] YOU · 2026-10-18 19:29 · matrix-exponential-linear-odes

so let's say we have 3 states, and they are non-reversible but go in a circle, there could be solutions that are complex right?

> [!abstract] TUTOR (side)

Yes. A one-way cycle is exactly the smallest rate matrix with complex eigenvalues. Take $A \to B \to C \to A$, each at $1$ per second:

$$Q = \begin{pmatrix} -1 & 1 & 0 \\ 0 & -1 & 1 \\ 1 & 0 & -1 \end{pmatrix}.$$

Write it as $Q = -I + P$, where $P$ is the matrix that just shifts population one step around the ring. Shifting three times gets you back where you started, so $P^3 = I$, and the eigenvalues of $P$ are the cube roots of $1$: $\;1,\ \omega,\ \omega^2$ with $\omega = -\tfrac12 + i\tfrac{\sqrt3}{2}$. Subtracting $1$ from each gives the eigenvalues of $Q$:

$$\lambda_0 = 0, \qquad \lambda_\pm = -\tfrac32 \pm i\,\tfrac{\sqrt3}{2}.$$

Check with $\lambda_0$: the stationary row is $(1,1,1)$, since $(1,1,1)Q = 0$. Each state gets $1/3$, as symmetry demands.

**What the complex pair means.** Along those modes $c(t) = c(0)\,e^{-\frac32 t}\big(\cos\tfrac{\sqrt3}{2}t \pm i\sin\tfrac{\sqrt3}{2}t\big)$. The real part $-\tfrac32$ is the damping, lifetime $\tfrac23$ s. The imaginary part $\tfrac{\sqrt3}{2}$ is the angular frequency, period $4\pi/\sqrt3 \approx 7.3$ s. So $p_A(t)$ starting from $(1,0,0)$ does dip below $1/3$, come back above it, and settle, but the swing is damped much faster than it oscillates (lifetime $0.7$ s against a $7$ s period), so you see barely one visible overshoot before it is flat. That is typical for rate matrices: oscillations exist but are always strongly damped.

**Why the cycle can overshoot when $C \rightleftharpoons O$ couldn't.** Earlier, the only variable was the imbalance, and at zero imbalance the flow stopped. Here, start everything in $A$. The lump moves to $B$, then to $C$, then returns to $A$. At the moment $p_A$ passes through $1/3$, the lump is still sitting in $B$ and $C$ and is still on its way around, so the flow into $A$ is not balanced by the flow out. The "momentum" that the spring had is now supplied by the other two states: where the population is in the ring carries information about where it is heading next. That is the second variable the two-state system lacked.

**The general rule.** Real eigenvalues are guaranteed when the stationary flows balance pair by pair (detailed balance), which is automatic for any chain with no cycles, including $C \rightleftharpoons O \to X$. Complex ones need a loop with net circulation. Even then, the eigenvalues of a rate matrix always come in conjugate pairs with real part $\le 0$, so you get damped spirals, never growth and never a sustained oscillation.

If you want to go further, ask what happens to the imaginary part as you add a small reverse rate to each arrow of the cycle.

> [!quote] YOU · 2026-10-18 19:31 · matrix-exponential-linear-odes

Oh interesting, it's complex initially, but then wil decay to the stationary distribution? Is this always true?

> [!abstract] TUTOR (side)

Two separate things are hiding in "complex initially", so let me split them.

**The populations are never complex.** The eigenvalues $\lambda_\pm = -\tfrac32 \pm i\tfrac{\sqrt3}{2}$ are complex for all time, not just at the start, but they come as a conjugate pair with conjugate eigenvectors and conjugate coefficients. When you add the two modes, the imaginary parts cancel exactly and what survives is real:

$$c_+ e^{\lambda_+ t} v_+ + c_- e^{\lambda_- t} v_- = e^{-\frac32 t}\Big(a\cos\tfrac{\sqrt3}{2}t + b\sin\tfrac{\sqrt3}{2}t\Big)$$

for real rows $a, b$. So $p_A(t)$ is a real number at every $t$, a damped wobble around $1/3$. "Complex" is a property of the bookkeeping, not of the populations.

**Yes, it always decays to the $\lambda = 0$ part.** The reason is a small fact about where the eigenvalues of a rate matrix can sit. Row $i$ of $Q$ has diagonal entry $-r_i$ (minus the total exit rate) and off-diagonal entries that are nonnegative and sum to $r_i$. A theorem (Gershgorin's) says every eigenvalue lies within distance $r_i$ of some diagonal entry $-r_i$, i.e. inside a disc centred at $-r_i$ of radius $r_i$. Every such disc lives in the left half of the complex plane and touches the imaginary axis only at the single point $0$. Therefore:

- every eigenvalue has real part $\le 0$, so no mode grows;
- the only eigenvalue with real part exactly $0$ is $\lambda = 0$ itself, so there is no purely imaginary eigenvalue and no undamped oscillation;
- every mode other than $\lambda = 0$ carries a factor $e^{(\text{negative})\,t}$ and dies, leaving only the stationary piece.

This is why the three-state ring had damping $-\tfrac32$ with frequency only $\tfrac{\sqrt3}{2}$: the point $-\tfrac32 + i\tfrac{\sqrt3}{2}$ sits inside the disc of radius $1$ around $-1$. A rate matrix cannot put an eigenvalue far up the imaginary axis without also pushing it far to the left.

**The one caveat is "the".** The limit is always some stationary distribution, but it is *the* unique one only if every state can reach every other state (or everything drains into one absorbing state, as in $C \rightleftharpoons O \to X$ where the limit is all in $X$). If the chain splits into disconnected pieces, $\lambda = 0$ is repeated, there is a whole family of stationary distributions, and which one you land on depends on how much population started in each piece. Each piece still relaxes monotonically in the sense above; there is just more than one place to end up.

If you want to go further, ask why the ring's eigenvalues move off the complex plane and back onto the real axis as you add reverse rates.

> [!quote] YOU · 2026-10-18 19:32 · matrix-exponential-linear-odes

wow eigenvalues are so powerful? what are their limitations? are they difficult to compute?

> [!abstract] TUTOR (side)

They are powerful for exactly one job: **linear, constant-coefficient** equations like $\dot p = pQ$ with $Q$ fixed. Everything they did above came from one trick, $vQ = \lambda v$ turning a matrix product into a scalar product. Where that trick does not apply, eigenvalues stop helping.

**Limitations.**

- **Nonlinearity.** If the rates depend on the populations (say $k_{op}$ depended on how much protein is already open, or in binding where a flux is $k\,[A][B]$), then $\dot p = pQ(p)$ and there is no fixed $Q$ to take eigenvectors of. Eigenvalues then only describe behaviour *near* a fixed point, by linearising there. This is the big one: most of chemistry outside first-order kinetics is nonlinear.
- **Time-varying $Q$.** If pH is ramped during the experiment, $Q(t)$ changes, and the eigenvectors of $Q(t_1)$ are not those of $Q(t_2)$. The modes do not stay decoupled and $p(t) = p(0)e^{Qt}$ is simply false. (Piecewise constant, as in a quench, is fine: apply one $e^{Qt}$ per segment.)
- **Defective matrices.** As mentioned earlier, a repeated eigenvalue can come with too few eigenvectors, so there is no eigenbasis and the sum-of-modes formula needs a patch (terms like $t\,e^{\lambda t}$ appear). Rate matrices built from distinct physical rates almost never do this.
- **Exactness vs. interpretability.** The eigenvalue solution is exact but each mode mixes all states. The lesson's $k_{obs} = k_{op}k_{ch}/(k_{op}+k_{cl}+k_{ch})$ is literally the slow eigenvalue, but you would not guess the "share of exits" story from the eigenvector alone. The steady-state trick is less exact and more legible; the two are complements.
- **Well-conditioned, not always.** With rates spanning many orders of magnitude (fast $k_{cl}\sim 10^3$ next to slow $k_{op}\sim 10^{-3}$), numerically computed eigenvectors can be inaccurate even when the eigenvalues are fine. Stiff systems are a known trouble spot.

**Difficulty of computing them.**

- By hand, $2\times2$ is one quadratic, $3\times3$ is a cubic. Your Linderstrøm-Lang $Q$ is a gift: the $X$ column is all zeros except the diagonal, so $\lambda = 0$ factors out immediately and the rest is the quadratic from the $C,O$ block. That is why the lesson can do it on paper.
- Beyond $3\times3$ the characteristic polynomial is a dead end. A degree-$5$ or higher polynomial has no closed-form roots, and even when it does, computing the polynomial's coefficients and then its roots is numerically terrible.
- Numerically it is a solved problem. Algorithms like the QR iteration find all eigenvalues and eigenvectors of a general $n\times n$ matrix in about $n^3$ operations, so a $1000$-state kinetic model is a fraction of a second on a laptop. Every language's `eig` routine does this. Symmetric matrices are even easier and more stable, and a detailed-balance $Q$ can be symmetrised, which is part of why its eigenvalues come out real.

So the honest summary: eigenvalues completely solve the problem the lesson is about, and are cheap to get. They are a local tool, not a universal one, once rates stop being constant.

If you want to go further, ask how a detailed-balance $Q$ gets symmetrised, since that is the reason its spectrum is guaranteed real.

> [!quote] YOU · 2026-10-18 19:34 · matrix-exponential-linear-odes

let's assume we are doing molecular dynamics and you want to incorporate something like a quasi-QM where you move between evolving the electron cloud and the protons, one step at a time, could you use this approach for small displacements to calculate an ensemble trajectory for a h20 bond breaking as example?

> [!abstract] TUTOR (side)

Not for the trajectory itself, but yes in two places inside such a scheme, and they are exactly the two things the lesson is built on.

**Where it fails: the nuclear motion.** The protons and oxygen obey Newton, $m\ddot x = -\nabla V(x)$, where $V$ is the energy surface the electrons provide. That is second order in time and $V$ is nonlinear, so there is no fixed $Q$ with $\dot p = pQ$. "Small displacements" is the linearisation move from the limitations answer: expand $V$ around the equilibrium geometry to second order, and you get the mass-weighted Hessian $K$, whose eigenvectors are the **normal modes** of water (symmetric stretch, asymmetric stretch, bend) and whose eigenvalues are $\omega^2$. Because the equation is $\ddot q = -\omega^2 q$ rather than $\dot c = \lambda c$, the modes are the spring from earlier: pure oscillation, $q(t) = q(0)\cos\omega t$. This is a real and useful calculation, it is how vibrational spectra are predicted. But a breaking bond is the one motion that leaves the quadratic region, so the linear approximation is good precisely until the event you care about begins, and worthless after. There is no fix within the approach; you integrate the nonlinear equations numerically step by step instead.

**Where it works exactly: the electronic step.** With the nuclei frozen for one time step, the electrons obey

$$i\hbar\,\frac{d\psi}{dt} = H\psi \quad\Longrightarrow\quad \psi(t) = e^{-iHt/\hbar}\,\psi(0),$$

which is the lesson's equation with $Q = -iH/\hbar$ constant. Decompose $\psi(0)$ in the eigenbasis of $H$ and each mode evolves as $e^{-iE_n t/\hbar}$. The eigenvalues $E_n$ are the electronic energies, the lowest eigenvector is the ground state, and its energy as a function of nuclear positions is the $V(x)$ the nuclei feel. The factor of $i$ makes every eigenvalue of $-iH/\hbar$ purely imaginary, so nothing decays; electronic modes oscillate forever, which is why isolated molecules do not spontaneously relax without coupling to something. Moving the nuclei changes $H$, so across steps you have the piecewise-constant case from the pH quench: one $e^{-iH_k\Delta t/\hbar}$ per step with a new $H_k$ each time. The alternation you describe, electrons then nuclei then electrons, is Ehrenfest or Born-Oppenheimer molecular dynamics, and the electronic half of every step is an eigenvalue problem.

**Where it comes back: the ensemble.** A single trajectory is nonlinear and chaotic, but the question you actually asked for, an ensemble, is linear again once you coarse-grain. Define a few states by geometry (O–H bond intact, stretched, broken, proton on a neighbouring water), run many trajectories, count transitions per unit time between states, and you have a rate matrix $Q$. Then $p(t) = p(0)e^{Qt}$ with everything from this lesson intact: $\lambda = 0$ is the equilibrium populations, the slowest nonzero eigenvalue is the bond-breaking rate, its eigenvector tells you which states exchange population on that timescale. This is a **Markov state model**, and it is the standard way simulation results are turned into kinetics. The nonlinear dynamics live inside the rates; the ensemble evolution on top of them is exactly $C \rightleftharpoons O \to X$ with more states.

One practical note on the example: breaking an O–H bond in water costs about $5$ eV, so it never happens thermally in a plain simulation. What does happen, about once per ten hours per molecule, is autoionisation into $\mathrm{OH^-}$ and $\mathrm{H_3O^+}$, and even that is far too rare to see without biasing. That is precisely why people build rate matrices from short biased runs rather than waiting for a trajectory to show the event.

If you want to go further, ask why coarse-graining to a few states gives a *Markov* chain only if the states are chosen along the slow eigenvector.

> [!quote] YOU · 2026-10-18 19:37 · matrix-exponential-linear-odes

so we couldn't do a staggerstep where we switch between proton movementent then electron cloud movement to then get accurate bond breaking without defining the geometries ahead of time?

> [!abstract] TUTOR (side)

Yes, you can. The staggered scheme is exactly how real ab initio molecular dynamics works, and it needs no geometries defined ahead of time. I was answering a narrower question earlier: whether the *eigenvalue* shortcut from this lesson could replace the step-by-step integration. It can't for the nuclei. But the step-by-step integration itself is fine, and it is the thing that produces the bond-breaking trajectory.

**What one staggered step looks like (Born-Oppenheimer MD).**

1. Nuclei frozen at positions $x_n$. Solve the electronic eigenproblem $H(x_n)\psi = E\psi$ for the lowest eigenvalue $E_0(x_n)$. This is the only place the lesson's machinery enters: a fixed $H$, so eigenvectors and eigenvalues are the whole answer.
2. Force on each nucleus is $-\nabla_x E_0(x_n)$, evaluated at the current geometry.
3. Move the nuclei one small step with Newton: $x_{n+1} = x_n + v_n\Delta t + \tfrac12 a_n \Delta t^2$.
4. Repeat with the new $H(x_{n+1})$.

Nothing in that loop knows what the geometry "should" be. The energy surface $E_0(x)$ is recomputed wherever the nuclei happen to go, including far outside the harmonic region where normal modes are meaningless. If an O–H stretches to the point where the lowest electronic state is a separated $\mathrm{OH}$ and $\mathrm{H}$, the eigenproblem at that geometry says so, and the force follows. The quadratic approximation was only needed if you wanted an *analytic* solution; the numerical loop never makes it.

**What "small" has to mean.** The step is small compared with the fastest nuclear motion, the O–H stretch at roughly $10$ fs period, so $\Delta t \approx 0.25$ to $0.5$ fs. That is the discretisation of the same idea as $P \approx I + Q\,dt$ from the Markov lesson: a linear update that is accurate because the step is tiny, repeated many times to trace a nonlinear path.

**Two things that still bite, neither of them about predefined geometries.**

- **Rarity, not accuracy.** The loop will follow a bond breaking faithfully if it happens, but at $5$ eV barrier against $k_BT \approx 0.025$ eV it will not happen in any affordable run. So in practice you add a bias, such as pulling the O–H coordinate or raising the temperature, and that bias *is* a choice about which geometry you are interested in. You don't have to predefine the final geometry, but you do have to say which coordinate to push.
- **Electronic state crossings.** Step 1 assumes the electrons sit in the ground state throughout. If two electronic eigenvalues become nearly degenerate along the way, which is common during bond breaking, the ground-state assumption fails and you need Ehrenfest (propagate $\psi$ with $e^{-iH\Delta t/\hbar}$ rather than re-minimising) or surface hopping. Both are still staggered steps; they just carry more of the electronic eigenbasis along.

**Where the predefined states actually live.** Only in the coarse-graining afterwards, when you turn many trajectories into a rate matrix $Q$. And even there they need not be chosen in advance: you can cluster the trajectory geometries and let the slow eigenvector of the resulting $Q$ tell you which clusters to merge. So the states can be read off the data rather than assumed.

If you want to go further, ask why the electronic time step can be skipped in Born-Oppenheimer MD but not in Ehrenfest, which is the same distinction as stationary versus transient in this lesson.

> [!quote] YOU · 2026-10-18 20:19 · matrix-exponential-linear-odes

is Q, being a transition matrix, is it also a generator?

> [!abstract] TUTOR (side)

Yes, $Q$ is the generator. But it is **not** a transition matrix, and the two words name different objects. Keeping them apart is worth a minute.

**Transition matrix $P$.** Entries are probabilities: $P_{ij}$ is the chance of being in $j$ one step later, given you are in $i$ now. Every entry is in $[0, 1]$ and every row sums to $1$. It carries a time step inside it: $P$ for a $0.1$ s step is a different matrix from $P$ for a $1$ s step. Populations advance by multiplication, $p_{n+1} = p_n P$.

**Generator $Q$.** Entries are rates, per second. Off-diagonal $Q_{ij} \ge 0$ is the rate $i \to j$, the diagonal is minus the total exit rate, and every row sums to $0$. It carries no time step. Populations advance by differentiation, $\dot p = pQ$.

**How they are related.** From your Markov-chain lesson, for a tiny step $dt$,

$$P(dt) \approx I + Q\,dt .$$

Read it in both directions. Given $Q$, the probability of leaving $i$ for $j$ in $dt$ is $Q_{ij}\,dt$, the "$k\,dt$" rule. Given $P$ for a small step, $Q = (P - I)/dt$. The word "generator" means exactly this: $Q$ generates the whole family of transition matrices, one for each elapsed time,

$$P(t) = e^{Qt}.$$

Check it on your symmetric $C \rightleftharpoons O$ example, $Q = \begin{pmatrix} -1 & 1 \\ 1 & -1 \end{pmatrix}$. Using the modes you already found,

$$e^{Qt} = \begin{pmatrix} \tfrac12 + \tfrac12 e^{-2t} & \tfrac12 - \tfrac12 e^{-2t} \\ \tfrac12 - \tfrac12 e^{-2t} & \tfrac12 + \tfrac12 e^{-2t} \end{pmatrix}.$$

Every entry is between $0$ and $1$, every row sums to $1$, so this *is* a transition matrix for elapsed time $t$. At $t = 0$ it is $I$. At $t \to \infty$ every row is $(\tfrac12, \tfrac12)$, the stationary split. And its first row is exactly the $p(t)$ you got starting from $(1, 0)$, as it should be: row $i$ of $P(t)$ is where you end up starting from state $i$.

**Two quick ways to tell which one you are holding.** Row sums: $0$ means generator, $1$ means transition matrix. Diagonal sign: negative means generator, a probability in $[0,1]$ means transition matrix. The $Q$ in the open question has a $-2$ and a $-1$ on the diagonal and rows summing to $0$, so it is a generator.

**Why the lesson prefers $Q$.** The eigenvectors of $Q$ and of $P(t) = e^{Qt}$ are the same rows, and the eigenvalues are related by $\mu = e^{\lambda t}$. So $\lambda = 0$ for $Q$ is $\mu = 1$ for $P$ (stationary), and $\lambda = -2$ is $\mu = e^{-2t}$, a number between $0$ and $1$ that shrinks the deviation each step. Working with $Q$ gives you rates directly, independent of any chosen step, which is why $k_{obs}$ reads off as an eigenvalue of $Q$ rather than of some $P$.

If you want to go further, ask why $e^{Qt}$ always has nonnegative entries even though $Q$ has negative ones.

> [!quote] YOU · 2026-10-18 20:20 · matrix-exponential-linear-odes

so why is it called a "generator"

> [!abstract] TUTOR (side)

Because it *generates* the whole family of transition matrices $\{P(t)\}$ from one fixed object. You hold $Q$, which has no time in it, and from it you can produce $P(t)$ for every elapsed time $t$ by $P(t) = e^{Qt}$. One matrix generates infinitely many.

**The picture behind the word.** The transition matrices for different times fit together: moving $s$ seconds and then $t$ seconds is the same as moving $s+t$ seconds, so

$$P(s)\,P(t) = P(s+t), \qquad P(0) = I .$$

A family with that composition rule is called a *semigroup*. Now ask what the family looks like for a tiny time. Nothing has happened yet except the first-order change,

$$P(dt) = I + Q\,dt + \text{(terms of order } dt^2),$$

so $Q = \left.\dfrac{dP}{dt}\right|_{t=0}$ is the slope of the family at the identity. That slope is enough to rebuild everything, because the composition rule lets you chain tiny steps: $P(t) = P(dt)^{t/dt} \approx (I + Q\,dt)^{t/dt} \to e^{Qt}$. So $Q$ is the "infinitesimal generator" of the semigroup: the one small piece of information from which all of $P(t)$ grows.

**Same word in the scalar case.** For one state with decay rate $k$, the family is $P(t) = e^{-kt}$ and the generator is the number $-k$. "Generator" just means the exponent, the thing in the $e^{(\cdot)t}$. $Q$ is the matrix version of that exponent.

**Same word elsewhere.** In your electron example, $-iH/\hbar$ generates the time-evolution operators $e^{-iHt/\hbar}$; physicists say the Hamiltonian is the generator of time translations. Rotation matrices $R(\theta)$ are generated by a fixed antisymmetric matrix, $R(\theta) = e^{\theta J}$. Every time a family of transformations is labelled by a continuous parameter and composes by adding the parameter, there is a single generator sitting in the exponent, and $Q$ is the one for continuous-time Markov chains.

If you want to go further, ask why $(I + Q\,dt)^{t/dt}$ turns into $e^{Qt}$, which is the series definition coming up in D3.

> [!quote] YOU · 2026-10-18 20:22 · matrix-exponential-linear-odes

then what is a transition matrix, a probability? I thought that was static in time?

> [!abstract] TUTOR (side)

A transition matrix is a table of probabilities, and it is static **once you fix the step length**. What depends on time is *which* step length you chose. Those are two different senses of "time", and they are easy to run together.

**The static sense.** In your Markov-chain lesson, you picked one step, say $\Delta t = 0.1$ s, and wrote a matrix $P$ whose entry $P_{ij}$ is the probability of being in $j$ one step later, given you are in $i$ now. That matrix never changes. Step 1 uses $P$, step 50 uses the same $P$. That is what "static" meant there: the rule for advancing one step is the same every step. In the generator language, this fixed $P$ is $P(\Delta t) = e^{Q\Delta t}$ for the one $\Delta t$ you picked.

**The family sense.** Now ask a different question: not "what happens after one step" but "what happens after an arbitrary elapsed time $t$". The answer is a *different* probability table for each $t$, because more time means more chance to have moved. On your symmetric $C \rightleftharpoons O$ example:

- after $0.1$ s, the chance of having gone $C \to O$ is $\tfrac12(1 - e^{-0.2}) \approx 0.09$;
- after $1$ s it is $\tfrac12(1 - e^{-2}) \approx 0.43$;
- after $10$ s it is essentially $0.50$.

Each of those is an entry of a perfectly good transition matrix, $P(0.1)$, $P(1)$, $P(10)$. Each one individually is static. The collection, $t \mapsto P(t)$, is what varies, and that whole collection is what $Q$ generates.

**How the two senses fit.** The fixed one-step $P$ you learned first and the family $P(t)$ agree with each other by the composition rule: two steps of $0.1$ s is $P(0.1)^2 = P(0.2)$, ten steps is $P(0.1)^{10} = P(1)$. So "apply the same static $P$ over and over" and "look up $P(t)$ for the total elapsed time" give identical numbers. The discrete lesson just happened to only ever use multiples of one chosen step.

**What stays constant in every sense.** $Q$. It has no step inside it, so it is the one object that is static under both readings. That is the practical reason the lesson works with $Q$: a $k_{obs}$ read from $Q$ is a rate, while the same information read from $P$ would be a probability that depends on which step you happened to pick.

If you want to go further, ask why $e^{Qt}$ keeps all its entries between $0$ and $1$ for every $t$, which is what makes each $P(t)$ a legitimate probability table.

> [!quote] YOU · 2026-10-18 20:24 · matrix-exponential-linear-odes

then what is a propagator?

> [!abstract] TUTOR (side)

A propagator is the same object as the family $P(t) = e^{Qt}$, just under the name it gets when you stress what it *does*: it carries the state forward from one time to another. "Transition matrix" describes the entries (probabilities); "propagator" describes the job (advance $p$ by $t$).

**Concretely.** For $\dot p = pQ$,

$$p(t) = p(0)\,e^{Qt},$$

and $e^{Qt}$ is the propagator over time $t$. Row $i$ of it answers "if I start in state $i$, where am I after $t$?" On your symmetric $C \rightleftharpoons O$ example, starting from $(1,0)$ and propagating by $1$ s gives

$$(1,0)\begin{pmatrix} \tfrac12+\tfrac12 e^{-2} & \tfrac12-\tfrac12 e^{-2} \\ \tfrac12-\tfrac12 e^{-2} & \tfrac12+\tfrac12 e^{-2}\end{pmatrix} \approx (0.57,\ 0.43).$$

The matrix did the propagating; the row vector was the thing propagated.

**What makes it a propagator, not just any matrix.** Two properties:

- $P(0) = I$: propagating by zero time changes nothing.
- $P(s)P(t) = P(s+t)$: propagating by $s$ then by $t$ is propagating by $s+t$. This is the composition rule from the "generator" answer, and it is what lets you chain tiny steps or split a long run into segments (quench then labelling, each with its own $e^{Q_k t_k}$).

**Where you have met it under other names.** In your Markov lesson, the one-step $P$ was the propagator for one step. In the electron example, $e^{-iHt/\hbar}$ is the propagator for $\psi$, and physicists say "propagator" far more often than "transition matrix" there, because its entries are amplitudes rather than probabilities and the word "transition probability" would be misleading. In the molecular dynamics loop, the Newton update $x_n \to x_{n+1}$ is a propagator too, just a nonlinear one with no matrix behind it.

**So the three words line up like this.**

- **Generator $Q$:** the fixed rates, no time inside, sits in the exponent.
- **Propagator $e^{Qt}$:** the map that advances the state by $t$; one for each $t$, all produced by $Q$.
- **Transition matrix:** what the propagator is called when its entries happen to be probabilities, as they always are for a rate matrix $Q$.

If you want to go further, ask what the "kernel" or Green's function is, which is the propagator written for a continuous coordinate instead of a finite list of states.

> [!quote] YOU · 2026-10-18 20:25 · matrix-exponential-linear-odes

so the generator is Q, the transition matrix is Qt, and the propagator is e^Qt?

> [!abstract] TUTOR (side)

Two out of three. The generator is $Q$ and the propagator is $e^{Qt}$. But the transition matrix is **not** $Qt$; it is also $e^{Qt}$. The propagator and the transition matrix are the same matrix under two names.

**Why $Qt$ can't be a transition matrix.** Its rows sum to $0$, not $1$, and its diagonal is negative. On the open question's $Q$, $Qt$ at $t = 1$ is $\begin{pmatrix} -2 & 2 \\ 1 & -1 \end{pmatrix}$, which has a $-2$ in it and so cannot be a table of probabilities. $Qt$ is just the generator scaled by the elapsed time, the thing that sits in the exponent.

**What $Qt$ is close to.** For tiny $t$,

$$e^{Qt} \approx I + Qt,$$

and $I + Qt$ *is* an approximate transition matrix: rows sum to $1$ (since rows of $Qt$ sum to $0$), the diagonal is $1 - (\text{exit rate})\,t$, and the off-diagonal entries are the $k\,dt$ probabilities. So the slip is a natural one: $Qt$ is the transition matrix with the identity stripped off, valid only to first order. The exponential is what makes it exact for every $t$, not just small ones.

**The lineup, corrected.**

- **Generator:** $Q$. Rates, rows sum to $0$, no time inside.
- **Propagator:** $e^{Qt}$. The map that advances $p$ by time $t$.
- **Transition matrix:** $e^{Qt}$ again. Same matrix, named for its entries being probabilities, rows summing to $1$.

If you want to go further, ask why rows of $e^{Qt}$ sum to exactly $1$ whenever rows of $Q$ sum to $0$.

> [!quote] YOU · 2026-10-21 02:01 · matrix-exponential-linear-odes

So i'm working out this problem and I'm confused about how I can multipy this exponential with a matrix with another matrix. I don't think we ever discussed that form of rule without putting the eigenvalue matrix into a powerseries form, which still leaves me confused about the other matricies?

> [!abstract] TUTOR (side)

**You never multiply "an exponential of a matrix" by anything. Once $\Lambda$ is diagonal, $e^{\Lambda t}$ is just an ordinary matrix of numbers (functions of $t$), and $V^{-1} e^{\Lambda t} V$ is two plain matrix multiplications.** That is the whole reason for the detour through $V$: it converts an exponential you can't compute into one you can.

**Why $e^{\Lambda t}$ is just a diagonal matrix of scalar exponentials.** Take the series definition and feed it a diagonal matrix, say $\Lambda = \mathrm{diag}(0,-2)$. Powers of a diagonal matrix are diagonal, entry by entry:
$$\Lambda^2 = \mathrm{diag}(0^2, (-2)^2), \qquad \Lambda^k = \mathrm{diag}(0^k, (-2)^k).$$
So every term $\frac{\Lambda^k t^k}{k!}$ is diagonal, and the sum is diagonal, with the top-left entry $\sum_k \frac{0^k t^k}{k!} = e^{0} = 1$ and the bottom-right entry $\sum_k \frac{(-2t)^k}{k!} = e^{-2t}$:
$$e^{\Lambda t} = \begin{pmatrix} 1 & 0 \\ 0 & e^{-2t} \end{pmatrix}.$$
Nothing matrix-like survived. The off-diagonal entries are $0$ because no power of a diagonal matrix ever puts anything there. (Warning: this entrywise trick works *only* for diagonal matrices. $e^{Qt}$ is **not** the matrix of $e^{Q_{ij}t}$. That is exactly why we go through $\Lambda$.)

**Then the other two matrices are ordinary multiplication.** Say $V^{-1} = \begin{pmatrix} 1 & 2 \\ 1 & -1 \end{pmatrix}$ and $V = \begin{pmatrix} 1 & 2 \\ 1 & -1 \end{pmatrix}^{-1}$ (whatever it is, the mechanics are the same). Do it in two steps:

1. $V^{-1} e^{\Lambda t}$: multiplying by a diagonal matrix *on the right* scales each **column** by that diagonal entry. Column 1 of $V^{-1}$ gets $\times 1$, column 2 gets $\times e^{-2t}$:
$$V^{-1} e^{\Lambda t} = \begin{pmatrix} 1 & 2e^{-2t} \\ 1 & -e^{-2t} \end{pmatrix}.$$
(Check it against the row-times-column rule once and you'll see why: the zeros kill every cross term.)

2. Multiply that by $V$ with the usual row-times-column rule, treating $e^{-2t}$ as just a symbol like $x$. Each entry of the result is a sum of constants and constant multiples of $e^{-2t}$. That is your $2\times 2$ matrix of functions of $t$.

So the only place the exponential is "of a matrix" is the diagonal step, where it reduces to scalar exponentials you already own. Everything else is $2\times2$ arithmetic with $e^{\lambda t}$ carried along as a symbol. The problem itself goes to the tutor, but the recipe is exactly this: diagonal $\to$ scalar exponentials, scale columns of $V^{-1}$, then one normal multiplication by $V$.

If you want to go further, ask why $Q^k = V^{-1}\Lambda^k V$ is what lets the series collapse this way.

> [!quote] YOU · 2026-10-21 02:03 · matrix-exponential-linear-odes

hold on. there was no mapping at all, you just dumped the powerseires into a matrix.

> [!abstract] TUTOR (side)

**You're right: the series was a definition by analogy, not a derivation.** Nothing before it told you what "exponential of a matrix" means, so writing $\sum (Qt)^k/k!$ is just declaring a name. The actual mapping comes from superposition alone, with no series anywhere. Here it is.

**The map, built from what you already own.** Superposition says: expand $p(0) = c_1 v_1 + c_2 v_2$, then $p(t) = c_1 e^{\lambda_1 t} v_1 + c_2 e^{\lambda_2 t} v_2$. Write both lines as row-times-matrix with $V$ the stack of eigenvectors:

$$p(0) = (c_1, c_2)\,V, \qquad p(t) = (c_1 e^{\lambda_1 t},\ c_2 e^{\lambda_2 t})\,V.$$

The second row vector is the first one with each entry scaled, and scaling entries of a row is multiplication by a diagonal matrix:

$$(c_1 e^{\lambda_1 t},\ c_2 e^{\lambda_2 t}) = (c_1, c_2)\begin{pmatrix} e^{\lambda_1 t} & 0 \\ 0 & e^{\lambda_2 t}\end{pmatrix}.$$

Call that diagonal matrix $e^{\Lambda t}$. It is *defined* as the diagonal of scalar exponentials; nothing matrix-like is being exponentiated. Now solve the first line for the coefficients, $(c_1,c_2) = p(0)V^{-1}$, and substitute into the second:

$$p(t) = p(0)\,V^{-1}\,e^{\Lambda t}\,V .$$

That is the mapping from $p(0)$ to $p(t)$, and the matrix sitting in the middle is $V^{-1}e^{\Lambda t}V$. Right to left it is the three steps of the recipe: $V^{-1}$ finds the coefficients, $e^{\Lambda t}$ decays each one, $V$ reassembles. Every factor is an ordinary matrix of numbers or of scalar exponentials.

**With numbers.** $Q = \begin{pmatrix}-1&1\\4&-4\end{pmatrix}$, $v_1=(4,1)$, $\lambda_1=0$, $v_2=(1,-1)$, $\lambda_2=-5$, so $V = \begin{pmatrix}4&1\\1&-1\end{pmatrix}$ and $V^{-1} = \frac{1}{5}\begin{pmatrix}1&1\\1&-4\end{pmatrix}$. Start at $p(0)=(1,0)$. Then $p(0)V^{-1} = (0.2, 0.2)$, the coefficients you found by hand before. Scale: $(0.2,\ 0.2e^{-5t})$. Reassemble: $(0.2,\ 0.2e^{-5t})V = (0.8+0.2e^{-5t},\ 0.2-0.2e^{-5t})$, the same $p(t)$ as the worked instance. No series was used.

**Where the series then comes in.** It is a second description of the same matrix, and the only reason to care is the name. Since $Q = V^{-1}\Lambda V$, you get $Q^k = V^{-1}\Lambda^k V$, and feeding that into $\sum (Qt)^k/k!$ collapses it to $V^{-1}\big(\sum \Lambda^k t^k/k!\big)V = V^{-1}e^{\Lambda t}V$. So the matrix we derived from superposition happens to equal the thing you get by putting $Q$ into the exponential series. That justifies calling it $e^{Qt}$ and makes $p(t)=p(0)e^{Qt}$ look like the scalar solution. But the computation never needs the series; it needs $V$, $V^{-1}$, and two scalar exponentials.

If you want to go further, ask why $V^{-1}e^{\Lambda t}V$ also satisfies $\frac{d}{dt}P = PQ$ directly, which is the check that it really is the propagator.

> [!quote] YOU · 2026-10-21 02:07 · matrix-exponential-linear-odes

I see so e^Qt, isn't an actuall mathematical raising, it's a representation that the elemtents of Qt are exponentiated into e, constructing a new matrix A that contains those. This is just a notation thing then right, but maybe a bit stronger since the powerseries connects the idea with e directly?

> [!abstract] TUTOR (side)

**No. That part is wrong, and it is the single most important thing to get straight here: $e^{Qt}$ is not the matrix whose entries are $e^{Q_{ij}t}$.** Entrywise exponentiation is only what happens for a *diagonal* matrix, where it is a consequence, not the definition.

**Where the entrywise idea breaks.** Take $Q = \begin{pmatrix} -1 & 1 \\ 4 & -4 \end{pmatrix}$. Entrywise you would get
$$\begin{pmatrix} e^{-t} & e^{t} \\ e^{4t} & e^{-4t} \end{pmatrix}.$$
At $t=0$ that is a matrix of all ones, but the propagator at $t=0$ must be the identity (nothing has happened yet). Its rows don't sum to 1, and the $e^{t}, e^{4t}$ entries blow up, which no probability can do. Compare with the real thing, from $V^{-1}e^{\Lambda t}V$ with $v_1=(4,1)$, $v_2=(1,-1)$:
$$e^{Qt} = \begin{pmatrix} 0.8 + 0.2e^{-5t} & 0.2 - 0.2e^{-5t} \\ 0.8 - 0.8e^{-5t} & 0.2 + 0.8e^{-5t} \end{pmatrix}.$$
Identity at $t=0$, rows sum to 1, and the only exponent anywhere is $-5$, which is not an entry of $Q$ at all. It is the eigenvalue. The entries of $Q$ get mixed together by the eigenvectors before any exponential appears, and that mixing is exactly what entrywise exponentiation skips.

**So what is it, if not notation?** It is a genuine function of a matrix, pinned down by the series $\sum_k (Qt)^k/k!$, and that series is not an analogy: the scalar $e^{x}$ is *itself* defined by $\sum_k x^k/k!$. The matrix version is the same definition, with the only operation the series needs (multiplying a thing by itself) carried over. Equivalent characterisation, closer to your kinetics: $e^{Qt}$ is the unique matrix $P(t)$ with $\dot P = PQ$ and $P(0) = I$. The notation is *earned* because it obeys the rules the name promises: $\frac{d}{dt}e^{Qt} = Qe^{Qt}$, $e^{Q\cdot 0} = I$, and $e^{Qs}e^{Qt} = e^{Q(s+t)}$, which is the chain's "two time steps compose" rule.

**How the two pictures fit.** $V^{-1}e^{\Lambda t}V$ is not a different object, it is the way to *compute* the series-defined one. Since $Q^k = V^{-1}\Lambda^k V$, the series collapses onto $\Lambda$, and only there, with $\Lambda$ diagonal, does exponentiation become entrywise. Then $V^{-1}$ and $V$ mix those scalar exponentials back into every entry of the result.

If you want to go further, ask why $e^{Qs}e^{Qt} = e^{Q(s+t)}$ holds, and why it would fail for two matrices that don't commute.

> [!quote] YOU · 2026-10-21 02:12 · matrix-exponential-linear-odes

okay then let's start this again. how is it that dp/dt = pQ = Qe^Qt. I'm having a bit of a disconnect since I don't see a complete transition between the vector and discrete sum. like where does the powerseries come from in dp/dt = PQ? to show that it links into e?

> [!abstract] TUTOR (side)

**First, a notation fix, because the equation as you wrote it mixes two different objects.** The vector equation is $\dot p = pQ$ with $p$ a row. The matrix equation is $\frac{d}{dt}e^{Qt} = e^{Qt}Q$ (also $= Qe^{Qt}$, since $Q$ commutes with its own powers). They are linked by $p(t) = p(0)e^{Qt}$: differentiate that, and you get $\dot p = p(0)e^{Qt}Q = pQ$. So "$pQ = Qe^{Qt}$" is never true; a row vector on the left, a matrix on the right.

**Now the real question: where does the series come from?** It comes from Taylor expanding the solution in $t$, and the ODE hands you every derivative. This is the same place $e^{\lambda t}$ comes from in the scalar case, so do that first.

Scalar: $\dot c = \lambda c$. Differentiate the equation itself: $\ddot c = \lambda \dot c = \lambda^2 c$, then $\dddot c = \lambda^3 c$, and in general $c^{(k)}(t) = \lambda^k c(t)$. Evaluate all of them at $t=0$: $c^{(k)}(0) = \lambda^k c(0)$. Taylor's series says
$$c(t) = \sum_{k} \frac{t^k}{k!}\,c^{(k)}(0) = c(0)\sum_k \frac{(\lambda t)^k}{k!} = c(0)\,e^{\lambda t}.$$
So the power series is not a trick you bring to the ODE. It *is* the solution, read off derivative by derivative.

Matrix: do the identical thing to $\dot p = pQ$. Differentiate the equation: $\ddot p = \dot p\,Q = pQ^2$, then $p^{(3)} = pQ^3$, in general $p^{(k)}(t) = p(t)Q^k$. At $t=0$: $p^{(k)}(0) = p(0)Q^k$. Taylor:
$$p(t) = \sum_k \frac{t^k}{k!}\,p(0)Q^k = p(0)\Big(\sum_k \frac{(Qt)^k}{k!}\Big).$$
**That is the transition from vector to sum.** $p(0)$ is the same row in every term, so it factors out to the left, and what remains is a sum of matrices: $I + Qt + Q^2t^2/2 + \cdots$. That matrix sum is what gets the name $e^{Qt}$, because it is literally the scalar series with $Q$ in place of $\lambda$, and you arrived at it the same way.

**With numbers, so you can see the terms appear.** $Q = \begin{pmatrix}-1&1\\4&-4\end{pmatrix}$, $p(0) = (1,0)$.
- $p(0)Q = (-1, 1)$
- $p(0)Q^2 = (-1,1)Q = (5,-5)$
- $p(0)Q^3 = (5,-5)Q = (-25, 25)$

So $p(t) = (1,0) + t(-1,1) + \tfrac{t^2}{2}(5,-5) + \tfrac{t^3}{6}(-25,25) + \cdots$, first component $1 - t + \tfrac{5}{2}t^2 - \tfrac{25}{6}t^3 + \cdots$. Compare with the exact answer from superposition, $0.8 + 0.2e^{-5t} = 0.8 + 0.2(1 - 5t + \tfrac{25}{2}t^2 - \tfrac{125}{6}t^3 + \cdots) = 1 - t + \tfrac52 t^2 - \tfrac{25}{6}t^3 + \cdots$. Same series, term for term. The eigenvalue $-5$ is hiding inside the powers $Q^k$, which is why the two routes agree.

**Why the series then satisfies the matrix equation.** Differentiate it term by term: $\frac{d}{dt}\frac{Q^kt^k}{k!} = Q^k\frac{t^{k-1}}{(k-1)!}$, which is $Q$ times the previous term. So the derivative of the whole sum is $Q$ times the whole sum. That is $\frac{d}{dt}e^{Qt} = Qe^{Qt}$, and it is the same bookkeeping as $\frac{d}{dt}e^{\lambda t} = \lambda e^{\lambda t}$.

If you want to go further, ask why the Taylor route and the superposition route must give the same matrix (uniqueness of the solution with $p(0)$ given).

> [!quote] YOU · 2026-10-21 02:15 · matrix-exponential-linear-odes

No, you just linked it via an observation. Not a direct line by line

> [!abstract] TUTOR (side)

**Fair. The earlier version pulled in Taylor's theorem as a black box. Here is the same thing with no theorem, only the ODE and integration, one line at a time. Every term of the series is produced by one substitution.**

**Line 1. Integrate the ODE.** $\dot p = pQ$ with $Q$ constant. Integrate both sides from $0$ to $t$:
$$p(t) - p(0) = \int_0^t p(s)\,Q\,ds = \Big(\int_0^t p(s)\,ds\Big)Q .$$
So
$$p(t) = p(0) + \Big(\int_0^t p(s)\,ds\Big)Q. \tag{1}$$
Nothing is solved yet: $p(s)$ still sits inside the integral. But (1) is an equation that holds for *every* time, so it also tells you what $p(s)$ is.

**Line 2. Feed (1) back into itself.** Replace the $p(s)$ inside the integral by its own version of (1), $p(s) = p(0) + \big(\int_0^s p(u)\,du\big)Q$:
$$p(t) = p(0) + \Big(\int_0^t \Big[\,p(0) + \Big(\int_0^s p(u)\,du\Big)Q\,\Big] ds\Big)Q .$$
Split the integral. The first piece is $\int_0^t p(0)\,ds = p(0)\,t$. So
$$p(t) = p(0) + p(0)\,Q\,t + \Big(\int_0^t\!\!\int_0^s p(u)\,du\,ds\Big)Q^2. \tag{2}$$
One substitution produced exactly one new term, $p(0)Qt$, and pushed the unknown $p$ one integral deeper, now multiplied by $Q^2$.

**Line 3. Do it again.** Replace the innermost $p(u)$ by (1) at time $u$. The known piece is $\int_0^t\!\int_0^s p(0)\,du\,ds = p(0)\int_0^t s\,ds = p(0)\,\tfrac{t^2}{2}$:
$$p(t) = p(0) + p(0)\,Q\,t + p(0)\,Q^2\,\tfrac{t^2}{2} + \Big(\text{triple integral of } p\Big)Q^3. \tag{3}$$

**Line $k$.** Each substitution does the same two things: the known part integrates $\tfrac{s^{k-1}}{(k-1)!}$ to $\tfrac{t^k}{k!}$, giving the term $p(0)Q^k\tfrac{t^k}{k!}$, and the unknown part gets one more integral and one more factor of $Q$. The leftover carries a factor $\tfrac{t^{k+1}}{(k+1)!}$, which shrinks to zero as $k$ grows, so the leftover vanishes and only the terms remain:
$$p(t) = p(0) + p(0)Qt + p(0)Q^2\tfrac{t^2}{2} + p(0)Q^3\tfrac{t^3}{6} + \cdots = p(0)\Big(I + Qt + \tfrac{Q^2t^2}{2} + \tfrac{Q^3t^3}{6} + \cdots\Big).$$
Factoring $p(0)$ out to the left is legal because it sits at the left of every term. **The matrix in the parentheses is $\sum_k \frac{(Qt)^k}{k!}$.** It was not assumed; it fell out of the ODE by repeated integration.

**Where $e$ enters, and it is not by analogy.** Run the identical three lines on the scalar $\dot c = \lambda c$. Line 1 gives $c(t) = c(0) + \lambda\int_0^t c(s)\,ds$, line 2 gives $c(0) + c(0)\lambda t + \lambda^2(\cdots)$, and the end result is $c(0)\sum_k \frac{(\lambda t)^k}{k!}$. That sum *is* $e^{\lambda t}$; the exponential function is this series, that is what $e^x$ means. So the matrix case produced, by the same steps with $Q$ in the slot where $\lambda$ was, the same series with $Q$ in the slot where $\lambda$ was. That is the entire justification for writing $e^{Qt}$ for it. The name records that the construction was the same, not that something got raised to a power.

If you want to go further, ask why the leftover integral really does go to zero, which is the only step above that was stated rather than written out.

> [!quote] YOU · 2026-10-30 03:59 · matrix-exponential-linear-odes

How is the approximation sqrt(x-p) =x+2p/x

> [!abstract] TUTOR (side)

First, a correction to how you wrote it: the statement in the reading is

$$\sqrt{S^2 - 4P} \;\approx\; S - \frac{2P}{S},$$

with a **minus** sign, and the thing under the root is $S^2 - 4P$, not $S - P$. Subtracting something under the root makes the root *smaller* than $S$, so the correction has to be negative. Your version with $+$ would say the root got bigger, which is backwards.

**Where it comes from.** Pull the big thing, $S^2$, out of the root:

$$\sqrt{S^2 - 4P} = \sqrt{S^2\left(1 - \frac{4P}{S^2}\right)} = S\,\sqrt{1 - \epsilon}, \qquad \epsilon = \frac{4P}{S^2}.$$

Now the only fact needed is about $\sqrt{1-\epsilon}$ for small $\epsilon$:

$$\sqrt{1 - \epsilon} \approx 1 - \frac{\epsilon}{2}.$$

Check it by squaring the right side: $\left(1 - \frac{\epsilon}{2}\right)^2 = 1 - \epsilon + \frac{\epsilon^2}{4}$. That equals $1 - \epsilon$ except for the leftover $\epsilon^2/4$, which is tiny when $\epsilon$ is tiny. So $1 - \epsilon/2$ is the square root of $1-\epsilon$ up to an error of order $\epsilon^2$. (It is the first term of the Taylor series of $\sqrt{1-\epsilon}$; the slope of $\sqrt{x}$ at $x=1$ is $1/2$.)

Put $\epsilon = 4P/S^2$ back in:

$$S\,\sqrt{1-\epsilon} \approx S\left(1 - \frac{2P}{S^2}\right) = S - \frac{2P}{S}.$$

**Numbers from the reading.** $S = 111$, $P = 10$: $\epsilon = 40/12321 \approx 0.0032$. Then $S - 2P/S = 111 - 20/111 \approx 110.82$, and the exact $\sqrt{12281} = 110.82$. The error is about $S\epsilon^2/8 \approx 0.0001$, invisible.

**Why it is legitimate only when $P \ll S^2$.** The whole thing rests on $\epsilon = 4P/S^2$ being small, so that $\epsilon^2$ and higher powers can be dropped. If $4P$ were comparable to $S^2$, $\epsilon$ would be near $1$ and $1 - \epsilon/2$ would be a bad guess for $\sqrt{1-\epsilon}$ (at $\epsilon = 1$ it gives $1/2$ instead of $0$). "$P \ll S^2$" is exactly the statement "$\epsilon \ll 1$".

If you want to go further, ask about how the same $\sqrt{1-\epsilon}\approx 1-\epsilon/2$ trick is the general binomial approximation $(1+x)^n \approx 1 + nx$.
