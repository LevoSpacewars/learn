> [!quote] YOU

> [!note] SKILL loaded: review

28 card(s) are due. Nothing is timed: he may walk away mid-answer and come back later. Never mention time, pace, speed or a budget; stop only when he says stop or the goal lands.

> [!abstract] PI

Starting the review: I'll pull the due cards and pose them one at a time.

> [!abstract] PI

Ten cards this session, mixed topics. First one is on paper if you like.

> [!question] Recall — Problem
> A pool of $N$ unreacted molecules loses a fraction $r \cdot dt$ of its *current* members in each thin slice $dt$, so one slice gives $N_{new} = N - r \cdot dt \cdot N$.
>
> (a) From this one-slice rule, derive the differential equation for $N(t)$.
>
> (b) Numerically: $N = 400$, $r = 3$ per second. Compute $(N_{new} - N)/dt$ for $dt = 0.1$ s and for $dt = 0.0001$ s. Why does this ratio not shrink toward zero as $dt \to 0$, even though $N_{new} - N$ does?
>
> Work it on paper and send a photo from your phone, or type your answer.

> [!warning] Recall — partial ◐ (70%)
> Your answer (photo):
> ![[work-20261103-202419.png|500]]
> Read as: (a) $N_n = N - r\cdot dt\cdot N$, then $\frac{N_n - N}{N} = -r\,dt$, so $\frac{dN}{N} = -r\,dt$, then $e^N = -rt$, boxed $N(t) = e^{-rt}$. (b) $N_{new}(0.1) = 400(1-0.3) = 280$, giving $\frac{280-400}{0.1} = -1200$. $N_{new}(0.0001) = 400(1-0.0003) = 399.88$, giving $\frac{399.88-400}{0.0001} = -1200$. Explanation: "the ratio is constant because $dN$ changes at the same rate as $dt$, leaving a constant ratio."
> First error: The line $e^N = -rt$: integrating $\frac{dN}{N}$ does not give $e^N$, and the boxed $N(t) = e^{-rt}$ has no initial amount $N_0$.
>
> Part (b) is right: both ratios come out to $-1200$, and you correctly explain that the change in $N$ shrinks in step with $dt$, so the ratio stays fixed. In (a), $\frac{dN}{N} = -r\,dt$ is a valid form of the differential equation, though it is not written as $dN/dt = -rN$. The step after it goes wrong: $\int \frac{dN}{N}$ is not $e^N$, and the boxed $N(t) = e^{-rt}$ is missing the starting amount, so the final boxed result is not correct.
>
> Card: hard

> [!abstract] PI

The ratio part was exactly right. One slip outside what was asked: $\int dN/N = \ln N$, not $e^N$, so the solution is $N_0 e^{-rt}$ with the starting amount in front.

> [!question] Recall — Problem
> An amide sits in a segment that opens and closes: closed $C \rightleftharpoons O$ open, and from $O$ it can exchange irreversibly to $X$. Rates per second: $k_{op} = 2$, $k_{cl} = 40$, $k_{ch} = 10$.
>
> (a) Compute the observed exchange rate $k_{obs}$ from the general formula.
>
> (b) Which limit is this closer to, EX1 or EX2, and why? What would each limiting formula have given for $k_{obs}$?
>
> Work it on paper and send a photo from your phone, or type your answer.

> [!warning] Recall — partial ◐ (65%)
> Your answer (photo):
> ![[work-20261103-204008.png|500]]
> Read as: (a) $k_{obs} = \frac{k_{op} k_{ch}}{k_{cl}+k_{ch}} = \frac{2\cdot 10}{40+10} = \frac{20}{50} = \frac{2}{5}$ (boxed). (b) "this is closer to Ex2 since $k_{cl} > k_{ch}$ by $\times 4$"; "for Ex1 $k_{obs} \approx k_{op}$"; "Ex2 $k_{obs} \approx \frac{k_{op}\cdot k_{ch}}{k_{ch}+k_{cl}}$".
> First error: In (b), the EX2 formula $k_{obs} \approx \frac{k_{op} k_{ch}}{k_{ch}+k_{cl}}$ is the general formula, not the EX2 limiting form.
>
> Part (a) is right, $k_{obs} = 2/5 = 0.4$/s. You also correctly chose EX2 because $k_{cl}$ is four times $k_{ch}$, and $k_{obs} \approx k_{op}$ is the correct EX1 form. However, the expression you wrote for EX2 is the same general formula as in (a), not its limiting form. You also gave no numbers for either limit, so the comparison with your 0.4/s is missing.
>
> Card: hard

> [!abstract] PI

Right call on EX2. The EX2 *limit* drops $k_{ch}$ from the denominator: $k_{obs} \approx \frac{k_{op}}{k_{cl}} k_{ch} = 0.5$/s here, versus the EX1 limit $k_{op} = 2$/s. The general $0.4$/s sits between them.

> [!question] Recall — Problem
> Three states for a site: $C$ (closed), $O$ (open), $X$ (exchanged, which nothing ever leaves). One-step matrix with rows = FROM, columns = TO:
>
> $$P = \begin{pmatrix} 0.8 & 0.2 & 0 \\ 0.5 & 0.3 & 0.2 \\ 0 & 0 & 1 \end{pmatrix}$$
>
> Counts now: $v = (600, 300, 100)$ for $(C, O, X)$.
>
> (a) Compute the counts after one step, showing what each term in each sum counts.
>
> (b) Check that the total is conserved. Explain *why* it is conserved, and give a concrete wrong answer that would still pass the total check.
>
> Work it on paper and send a photo from your phone, or type your answer.

> [!warning] Recall — partial ◐ (60%)
> Your answer (photo):
> ![[work-20261103-205219-1.png|500]]
> ![[work-20261103-205219-2.png|500]]
> Read as: (a) Writes $v = 10(6,3,1)$, multiplies $vP$ and gets $(480+150+0,\ 120+90+0,\ 0+60+100) = (630, 210, 160)$ (boxed). No labels say what each term counts. (b) $600+300+100 = 1000$ and $630+210+160 = 1000$. "This is conserved because each row sums to 1, meaning no mass is created or lost." Then: "We could transpose the matrix and get a conserved mass?"
> First error: In (a), no term is labeled with what it counts. In (b), the proposed wrong answer (transposing $P$) does not conserve the total: $vP^T = (540, 410, 100)$ sums to $1050$.
>
> Your product $vP = (630, 210, 160)$ is correct, every term is computed right, and the conservation reason (each row of $P$ sums to 1, so nothing is created or lost) is exactly right. Part (a) never says what each term counts, for example what the $150$ in the first component represents. In (b), transposing the matrix would not pass the total check: $vP^T = (540, 410, 100)$ totals $1050$, since the columns of $P$ don't sum to 1. So the answer is still missing a wrong result that would keep the total at $1000$.
>
> Card: hard

> [!abstract] PI

Numbers and the conservation reason were right. Transposing does *not* pass the check: columns of $P$ don't sum to 1, so $vP^T$ totals 1050. What slips through is an offsetting error, e.g. putting the 150 open-that-closed into $O$ and the 120 into $C$: $(600, 240, 160)$ still totals 1000.

> [!question] Recall — Recall
> A stretch of $N$ backbone amides is protected together: when the segment opens, all $N$ are exposed at once; when it closes, all are shielded.
>
> In the mass spectrum over time, one regime shows a single isotope envelope whose center drifts smoothly from $+0$ toward $+N$ Da. The other regime shows two envelopes at fixed positions ($+0$ and $+N$) with one shrinking as the other grows.
>
> Explain which regime is which, what about the per-opening exchange produces each shape (name the statistical structure), and what single quantity the two spectra nonetheless have in common at every time.

> [!warning] Recall — partial ◐ (40%)
> Your answer (photo):
> ![[work-20261103-205944.png|500]]
> Read as: Transcribed: "The first regime is EX2 because we see slow exchange meaning we're limited by the opening rate. The second one was in a EX1 because as the sites open they immediately exchange." Then a lone "?", which I take to mean no answer for the shared quantity.
> First error: Describing EX2 as 'limited by the opening rate'. That is the EX1 limit; in EX2, closing outcompetes chemical exchange, so $s = k_{ch}/(k_{cl}+k_{ch}) \ll 1$.
>
> You matched the regimes correctly (sliding hump = EX2, two fixed peaks = EX1), and 'sites exchange immediately on opening' is the right picture for EX1. Calling EX2 'limited by the opening rate' is backwards: that is the EX1 limit. The answer also does not name the statistical structure (independent per-site exchange versus all-or-nothing correlated exchange) or identify the quantity the two spectra share.
>
> Card: hard


> [!example] Recall — ended
> Recall phase ended; starting the lesson.


> [!abstract] PI

On to the lesson.


> [!quote] YOU

> [!note] SKILL loaded: teach

Continue the lesson "Matrix exponential for linear ODEs: modes of the Linderstrøm-Lang chain" (slug: matrix-exponential-linear-odes). RECALL PHASE ENDED BY THE LEARNER: he wants to learn something new now. No warm-up re-check, no review cards, no checks on earlier nodes. Go straight to teaching the first pending (new) node.


> [!abstract] PI

## Reading — The spectrum of the three-state Linderstrøm-Lang chain

This section finds the eigenvalues and left eigenvectors of the rate matrix for the Linderstrøm-Lang chain $C \rightleftharpoons O \to X$ (closed, open, exchanged), so that the superposition formula $p(t) = \sum_i c_i e^{\lambda_i t} v_i$ can be written out for it explicitly.

## Why we need this now

Everything built so far (the collapse of $\dot p = pQ$ to $\dot c = \lambda c$ along an eigenvector, superposition, $e^{Qt} = V^{-1} e^{\Lambda t} V$) begins with the words "given the left eigenvectors $v_i$ and eigenvalues $\lambda_i$ of $Q$". For a general $3\times3$ matrix that means a cubic equation. The exchange chain is not a general matrix, though: it has structure, and the structure does most of the work.

## The rate matrix

States in the order $(C, O, X)$, rows = FROM, columns = TO. Rates: $k_{op}$ for $C \to O$, $k_{cl}$ for $O \to C$, $k_{ch}$ for $O \to X$. Each diagonal entry is minus the total exit rate from that state, so each row sums to zero:

$$Q = \begin{pmatrix} -k_{op} & k_{op} & 0 \\ k_{cl} & -(k_{cl}+k_{ch}) & k_{ch} \\ 0 & 0 & 0 \end{pmatrix}$$

The third row is all zeros because nothing leaves $X$: it is absorbing.

## Step 1: the absorbing state hands us one eigenvalue for free

We want $v$ and $\lambda$ with $vQ = \lambda v$. Try the simplest candidate, $v = (0,0,1)$. Multiplying on the left picks out row 3 of $Q$, which is $(0,0,0)$. So $vQ = 0 = 0 \cdot v$: the eigenvalue is $\lambda_0 = 0$ with left eigenvector $(0,0,1)$. Meaning: the population "everything in $X$" never changes. That is the stationary mode, and it is where every start ends up.

## Step 2: the other two eigenvalues come from the $2\times2$ block

Write $v = (a, b, c)$ and look at the first two components of $vQ = \lambda v$. Because column 1 and column 2 of $Q$ have a zero in the third row, $c$ never appears in them:

$$(a, b)\, A = \lambda\,(a, b), \qquad A = \begin{pmatrix} -k_{op} & k_{op} \\ k_{cl} & -(k_{cl}+k_{ch}) \end{pmatrix}$$

So $(a,b)$ must be a left eigenvector of the $2\times2$ block $A$ (the $C$–$O$ part of the chain, with the leak to $X$ showing up only inside the diagonal entry $-(k_{cl}+k_{ch})$). The third component then follows from column 3: $b\,k_{ch} = \lambda c$, so $c = b\,k_{ch}/\lambda$.

For a $2\times2$ matrix the eigenvalues solve $\lambda^2 - (\mathrm{tr}\,A)\lambda + \det A = 0$. Here

$$\mathrm{tr}\,A = -(k_{op} + k_{cl} + k_{ch}) \equiv -S, \qquad \det A = k_{op}(k_{cl}+k_{ch}) - k_{op}k_{cl} = k_{op}k_{ch}.$$

Notice the cancellation in the determinant: the $k_{op}k_{cl}$ from the back-and-forth between $C$ and $O$ drops out, leaving only the product of the two rates on the one-way path $C \to O \to X$. So

$$\lambda^2 + S\lambda + k_{op}k_{ch} = 0, \qquad \lambda_{\pm} = \frac{-S \pm \sqrt{S^2 - 4k_{op}k_{ch}}}{2}.$$

Both roots are real and negative: the discriminant equals $(k_{op} - k_{cl} - k_{ch})^2 + 4k_{op}k_{cl} > 0$, and the roots have sum $-S < 0$ and product $k_{op}k_{ch} > 0$. So the full spectrum is

$$\{\,0,\ \lambda_+,\ \lambda_-\,\}, \qquad 0 > \lambda_+ > \lambda_-,$$

one stationary mode and two decaying modes, one slow ($\lambda_+$, closer to zero) and one fast ($\lambda_-$).

## A check that costs nothing: nonzero-eigenvalue modes are deviations

Each row of $Q$ sums to zero, i.e. $Q\mathbf{1} = 0$ with $\mathbf{1} = (1,1,1)^T$. Multiply $vQ = \lambda v$ on the right by $\mathbf{1}$: the left side is $v(Q\mathbf{1}) = 0$, the right side is $\lambda\,(v\cdot\mathbf{1})$. So whenever $\lambda \neq 0$, the entries of $v$ must sum to zero. This is the three-state version of the $(1,-1)$ story: every decaying mode is a redistribution, not a population, and if a computed eigenvector for $\lambda_\pm$ does not sum to zero, something is wrong.

## Worked instance

Take $k_{op} = 2$, $k_{cl} = 4$, $k_{ch} = 5$ (per second).

$$Q = \begin{pmatrix} -2 & 2 & 0 \\ 4 & -9 & 5 \\ 0 & 0 & 0 \end{pmatrix}$$

**Eigenvalues.** $S = 2 + 4 + 5 = 11$, $k_{op}k_{ch} = 10$. The quadratic is $\lambda^2 + 11\lambda + 10 = (\lambda + 1)(\lambda + 10) = 0$, so $\lambda_+ = -1$, $\lambda_- = -10$, plus $\lambda_0 = 0$. Sanity: sum of the two roots is $-11 = -S$, product is $10 = k_{op}k_{ch}$.

**Left eigenvector for $\lambda_+ = -1$.** Write $v = (a,b,c)$ and read $vQ = -v$ one column at a time.
- Column 1: $-2a + 4b = -a \Rightarrow a = 4b$. Pick $b = 1$, so $a = 4$.
- Column 3: $5b = -c \Rightarrow c = -5$.
- Column 2 as a check: $2a - 9b = 8 - 9 = -1$, and $\lambda b = -1$. Consistent.

So $v_+ = (4, 1, -5)$. Entries sum to zero, as they must.

**Left eigenvector for $\lambda_- = -10$.**
- Column 1: $-2a + 4b = -10a \Rightarrow 8a = -4b \Rightarrow b = -2a$. Pick $a = 1$, $b = -2$.
- Column 3: $5b = -10c \Rightarrow c = -b/2 = 1$.
- Column 2 check: $2a - 9b = 2 + 18 = 20$, and $\lambda b = (-10)(-2) = 20$. Consistent.

So $v_- = (1, -2, 1)$, again summing to zero.

**Stationary mode.** $v_0 = (0,0,1)$ with $\lambda_0 = 0$.

The three vectors are linearly independent (three distinct eigenvalues guarantee it), so any start $p(0)$ expands uniquely as $c_0 v_0 + c_+ v_+ + c_- v_-$, and

$$p(t) = c_0\,(0,0,1) + c_+ e^{-t}\,(4,1,-5) + c_- e^{-10t}\,(1,-2,1).$$

Since $p(t) \to c_0 (0,0,1)$ and total population is conserved, $c_0$ must equal the total, here 1 for a probability vector.

## What this hangs off

The eigenvalue-zero mode is the same object as the stationary split you found for $2\times2$ chains by solving $vQ = 0$; here the absorbing row makes it trivial. The two decaying modes are the three-state version of the $(1,-1)$ deviation mode: the sum-to-zero argument is literally $vQ\mathbf{1} = 0$. And once the $v_i$ and $\lambda_i$ are in hand, the superposition formula and $e^{Qt} = V^{-1}e^{\Lambda t}V$ apply verbatim. The next section reads the physics off this spectrum: the slow eigenvalue $\lambda_+$ is the observed exchange rate, and the EX1 and EX2 limits are what $\lambda_+$ becomes when $k_{ch} \gg k_{cl}$ or $k_{ch} \ll k_{cl}$.
