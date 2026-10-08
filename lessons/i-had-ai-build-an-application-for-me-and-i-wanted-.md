# I had AI build an application for me, and I wanted to understand the math that went into it. I consider this a high priority, along side with enhanced sampling techniques with molecular dyanmics, and also learning about hydrogen exchange: The approach, as it stood in the July theory session and the August bleed.py work, has a single spine: a conformational CTMC with generator $Q$ drives the molecule between states, each site $i$ exchanges at a state-dependent rate $k_{i,s}$, and irreversible labeling means a site only sees the trajectory through its occupation times $\boldsymbol\tau$. Everything else is machinery for computing with that. The topics below are ordered so each one is needed by the next.1. Continuous-time Markov chains. The generator $Q$ (zero row sums, nonnegative off-diagonals), the master equation $\dot{\mathbf p} = \mathbf p^\top Q$, and why $\exp(Qt)$ is a stochastic matrix. Jump chain $P$ and exponential holding times. Stationary distribution $\boldsymbol\pi$, reversibility and detailed balance, and why an asymmetric $Q$ need not be irreversible. Absorbing states and phase-type distributions, since the cluster renewal kernels in bleed.py are phase-type. Norris, Markov Chains, chapters 2 and 3 cover this.2. The matrix exponential and spectral theory of $Q$. Eigenstructure of $Q$: the zero eigenvalue, the negative real parts, the spectral gap. How $\exp(Qt)$ decomposes into modes with rates $\lambda_j$. This is where "fast modes near $-3$, slow modes at $-0.06$ and $-0.002$" comes from. Numerical evaluation of $\exp(Qt)$ (scaling and squaring, Padé) and its cost. Moler and Van Loan, "Nineteen dubious ways," is the standard reference.3. Killing, sub-generators, and Feynman–Kac. The tilted matrix $Q - D_i$ with $D_i = \operatorname{diag}(k_{i,s})$ is a sub-generator; its semigroup is sub-stochastic and the lost mass is the exchanged probability. The identity$$\mathbb E\!\left[e^{-\int_0^t k_i(X_u)\,du}\right] = \boldsymbol\pi^\top \exp\big((Q-D_i)t\big)\mathbf 1$$is the discrete Feynman–Kac formula. Learn it from both sides: as an absorbing-state construction and as a Laplace transform of the occupation-time functional.4. Occupation times and their distribution. $\tau_s = \int_0^t \mathbf 1[X_u = s]\,du$, the vector $\boldsymbol\tau$ on the simplex $t\Delta$, and the sufficiency argument: $\Lambda_i = \sum_s k_{i,s}\tau_s$ depends on the path only through $\boldsymbol\tau$, so order of excursions is irrelevant. The joint density $\rho(\boldsymbol\tau \mid t)$ is the central object of the envelope integral. Sericola's occupation-time results and Darroch–Morris are the sources.5. Uniformization. Write $Q = \lambda(P - I)$ with $\lambda \ge \max_s |Q_{ss}|$. Condition on $N \sim \mathrm{Poisson}(\lambda t)$ jumps; given $N$, jump times are uniform order statistics and the holding times are a Dirichlet allocation. This turns $\exp(Qt)$ into a Poisson-weighted sum over the discrete chain and gives $\rho(\boldsymbol\tau\mid t)$ semi-analytically. Fox–Glynn truncation bounds the Poisson tail. This is the practical, differentiable path-integral.6. Path expansions. The Dyson series / time-ordered exponential of $Q - D_i$: term $n$ is the sum over all $n$-jump paths with nested time integrals. The directed-cycle case gives hypoexponential (Erlang) elapsed times. Understand how uniformization is the resummed form of this series.7. Poisson-binomial envelopes. Conditional on $\boldsymbol\tau$ sites are independent Bernoulli with $p_i = 1 - e^{-\Lambda_i}$, so the mass envelope is a Poisson-binomial; FFT evaluation in $O(n\log n)$. Closure under Bernoulli thinning is why post-quench back-exchange passes through as a per-site retention factor without coupling to the dynamics. The full forward model is$$P(\text{env}\mid t) = \int \rho(\boldsymbol\tau\mid t)\,\mathrm{PB}\big(\{1 - e^{-\sum_s k_{i,s}\tau_s}\}_i\big)\,d\boldsymbol\tau .$$8. Metastability and aggregation. Nearly-completely-decomposable chains, Simon–Ando–Courtois aggregation with $O(\varepsilon)$ error, lumpability (Kemeny–Snell, Buchholz for approximate), quasi-stationary distributions within a cluster, and PCCA+ for identifying clusters from the spectrum. This is where EX1 and EX2 fall out: fast interconversion gives $\boldsymbol\tau/t \to \boldsymbol\pi$ and a single unimodal PB; slow interconversion gives a crossing-weighted mixture $\sum_c W_c(t)\,\mathrm{PB}_c$ with $W_c(t)\sim e^{-\lambda_{\text{slow}}t}$. Cheeger-type bounds explain when the gap is not sharp.9. Renewal theory and the bleed.py architecture. Multi-entry clusters reduce to matrix-valued renewal kernels $\psi_{e\to f}(\tau)$ on boundary nodes, computable from the cluster sub-generator. Memoization by sufficient-statistic key (cluster, entry node, age) is what collapses the exponential path tree to polynomial dynamic programming; linearity and time-homogeneity justify treating any arrival as a scaled, shifted impulse response. Semi-Markov processes are needed for the residence-time-dependent exchange case. Also learn why the boundary-kernel reduction discards interior occupation, which the active-cluster regime needs.10. Singular perturbation and averaging for Markov chains. The frozen / active / equilibrated classification of edges by $|\lambda_j|\,t$ is a multiscale averaging argument. Yin and Zhang, Continuous-Time Markov Chains and Applications: A Two-Time-Scale Approach, is the direct reference.11. Validation and inference. Gillespie SSA as the Monte Carlo baseline and why its variance explodes in the rare-event tail. Laplace ill-posedness of recovering rate spectra from finite noisy timepoints; evidence-based or RJMCMC complexity selection; log-spaced timepoints for uniform resolving power per decade.A reasonable order is 1, 2, 3, 4 as the foundation, then 5 and 7 together since they give the first working computation, then 8 and 9 since they are the content of bleed.py, with 6, 10 and 11 filling in as needed.



> [!quote] YOU

> [!note] SKILL loaded: teach

Bring: I had AI build an application for me, and I wanted to understand the math that went into it. I consider this a high priority, along side with enhanced sampling techniques with molecular dyanmics, and also learning about hydrogen exchange: The approach, as it stood in the July theory session and the August bleed.py work, has a single spine: a conformational CTMC with generator $Q$ drives the molecule between states, each site $i$ exchanges at a state-dependent rate $k_{i,s}$, and irreversible labeling means a site only sees the trajectory through its occupation times $\boldsymbol\tau$. Everything else is machinery for computing with that. The topics below are ordered so each one is needed by the next.1. Continuous-time Markov chains. The generator $Q$ (zero row sums, nonnegative off-diagonals), the master equation $\dot{\mathbf p} = \mathbf p^\top Q$, and why $\exp(Qt)$ is a stochastic matrix. Jump chain $P$ and exponential holding times. Stationary distribution $\boldsymbol\pi$, reversibility and detailed balance, and why an asymmetric $Q$ need not be irreversible. Absorbing states and phase-type distributions, since the cluster renewal kernels in bleed.py are phase-type. Norris, Markov Chains, chapters 2 and 3 cover this.2. The matrix exponential and spectral theory of $Q$. Eigenstructure of $Q$: the zero eigenvalue, the negative real parts, the spectral gap. How $\exp(Qt)$ decomposes into modes with rates $\lambda_j$. This is where "fast modes near $-3$, slow modes at $-0.06$ and $-0.002$" comes from. Numerical evaluation of $\exp(Qt)$ (scaling and squaring, Padé) and its cost. Moler and Van Loan, "Nineteen dubious ways," is the standard reference.3. Killing, sub-generators, and Feynman–Kac. The tilted matrix $Q - D_i$ with $D_i = \operatorname{diag}(k_{i,s})$ is a sub-generator; its semigroup is sub-stochastic and the lost mass is the exchanged probability. The identity$$\mathbb E\!\left[e^{-\int_0^t k_i(X_u)\,du}\right] = \boldsymbol\pi^\top \exp\big((Q-D_i)t\big)\mathbf 1$$is the discrete Feynman–Kac formula. Learn it from both sides: as an absorbing-state construction and as a Laplace transform of the occupation-time functional.4. Occupation times and their distribution. $\tau_s = \int_0^t \mathbf 1[X_u = s]\,du$, the vector $\boldsymbol\tau$ on the simplex $t\Delta$, and the sufficiency argument: $\Lambda_i = \sum_s k_{i,s}\tau_s$ depends on the path only through $\boldsymbol\tau$, so order of excursions is irrelevant. The joint density $\rho(\boldsymbol\tau \mid t)$ is the central object of the envelope integral. Sericola's occupation-time results and Darroch–Morris are the sources.5. Uniformization. Write $Q = \lambda(P - I)$ with $\lambda \ge \max_s |Q_{ss}|$. Condition on $N \sim \mathrm{Poisson}(\lambda t)$ jumps; given $N$, jump times are uniform order statistics and the holding times are a Dirichlet allocation. This turns $\exp(Qt)$ into a Poisson-weighted sum over the discrete chain and gives $\rho(\boldsymbol\tau\mid t)$ semi-analytically. Fox–Glynn truncation bounds the Poisson tail. This is the practical, differentiable path-integral.6. Path expansions. The Dyson series / time-ordered exponential of $Q - D_i$: term $n$ is the sum over all $n$-jump paths with nested time integrals. The directed-cycle case gives hypoexponential (Erlang) elapsed times. Understand how uniformization is the resummed form of this series.7. Poisson-binomial envelopes. Conditional on $\boldsymbol\tau$ sites are independent Bernoulli with $p_i = 1 - e^{-\Lambda_i}$, so the mass envelope is a Poisson-binomial; FFT evaluation in $O(n\log n)$. Closure under Bernoulli thinning is why post-quench back-exchange passes through as a per-site retention factor without coupling to the dynamics. The full forward model is$$P(\text{env}\mid t) = \int \rho(\boldsymbol\tau\mid t)\,\mathrm{PB}\big(\{1 - e^{-\sum_s k_{i,s}\tau_s}\}_i\big)\,d\boldsymbol\tau .$$8. Metastability and aggregation. Nearly-completely-decomposable chains, Simon–Ando–Courtois aggregation with $O(\varepsilon)$ error, lumpability (Kemeny–Snell, Buchholz for approximate), quasi-stationary distributions within a cluster, and PCCA+ for identifying clusters from the spectrum. This is where EX1 and EX2 fall out: fast interconversion gives $\boldsymbol\tau/t \to \boldsymbol\pi$ and a single unimodal PB; slow interconversion gives a crossing-weighted mixture $\sum_c W_c(t)\,\mathrm{PB}_c$ with $W_c(t)\sim e^{-\lambda_{\text{slow}}t}$. Cheeger-type bounds explain when the gap is not sharp.9. Renewal theory and the bleed.py architecture. Multi-entry clusters reduce to matrix-valued renewal kernels $\psi_{e\to f}(\tau)$ on boundary nodes, computable from the cluster sub-generator. Memoization by sufficient-statistic key (cluster, entry node, age) is what collapses the exponential path tree to polynomial dynamic programming; linearity and time-homogeneity justify treating any arrival as a scaled, shifted impulse response. Semi-Markov processes are needed for the residence-time-dependent exchange case. Also learn why the boundary-kernel reduction discards interior occupation, which the active-cluster regime needs.10. Singular perturbation and averaging for Markov chains. The frozen / active / equilibrated classification of edges by $|\lambda_j|\,t$ is a multiscale averaging argument. Yin and Zhang, Continuous-Time Markov Chains and Applications: A Two-Time-Scale Approach, is the direct reference.11. Validation and inference. Gillespie SSA as the Monte Carlo baseline and why its variance explodes in the rare-event tail. Laplace ill-posedness of recovering rate spectra from finite noisy timepoints; evidence-based or RJMCMC complexity selection; log-spaced timepoints for uniform resolving power per decade.A reasonable order is 1, 2, 3, 4 as the foundation, then 5 and 7 together since they give the first working computation, then 8 and 9 since they are the content of bleed.py, with 6, 10 and 11 filling in as needed.. Use lesson slug "i-had-ai-build-an-application-for-me-and-i-wanted-" and note "lessons/i-had-ai-build-an-application-for-me-and-i-wanted-.md". No fixed time budget.

> [!note] Learner file: relevant slice loaded


> [!question] Recall — Recall
> A single amide hydrogen exchanges with solvent deuterium irreversibly, at a constant rate $k$ (per second). It starts unexchanged at $t=0$.
>
> What is the probability it is **still unexchanged** at time $t$? And *why* that form — what assumption about the exchange process gives it?


> [!warning] Recall — partial ◐ (40%)
> Your answer: e^(-kt). This can be derived from free energy I believe.
> Confidence: 30% · 176s
> Read as: The learner gave P = e^(-kt) and said the form 'can be derived from free energy I believe' (confidence 30/100).
> First error: Attributes the exponential form to free energy instead of the constant-rate / memoryless assumption (dS/dt = -kS).
>
> Your formula e^(-kt) is right. Free energy isn't what produces that shape, though; it can influence how big k is. Ask yourself what it means for the rate to be the same in every instant regardless of history, and write the differential equation that follows from that for the surviving probability S(t).


> [!abstract] PI

You have the formula. The reason you gave (free energy) isn't the right one, and that tells me where the edge is. Next, what "rate" actually means:


> [!question] Quiz
> A site that hasn't exchanged yet has exchange rate $k = 0.1\ \text{s}^{-1}$. Which statement is what that rate literally means?
>
> 1. In any tiny interval $dt$, a site exchanges with probability $k\,dt$, growing the longer it has waited
> 2. The site exchanges after exactly $1/k = 10$ s
> 3. In any tiny interval $dt$, a not-yet-exchanged site exchanges with probability $k\,dt$, whatever happened before
> 4. In any 1 s interval, a not-yet-exchanged site exchanges with probability exactly $0.1$


> [!failure] Quiz — incorrect ✗
> Your answer: 4. In any 1 s interval, a not-yet-exchanged site exchanges with probability exactly $0.1$
> Correct answer: 3
> Confidence: 100% · 171s
>
> A rate is a probability per unit time *in the limit of a tiny interval*, and it's the same at every instant no matter how long the site has waited (memoryless). Over a whole second the probability is $1-e^{-0.1}\approx 0.095$, not exactly 0.1, because the site can only exchange once and the surviving population shrinks during the second. $1/k$ is the *mean* waiting time, not a fixed one.


> [!abstract] PI

You were 100% sure on that one, so it matters. Before I explain anything, one more question to see how deep it goes:


> [!question] Recall — Predict
> Same setup, but now a fast site: $k = 3\ \text{s}^{-1}$. It starts unexchanged.
>
> What is the probability it has exchanged **by** $t = 1$ s? Give a number (rough is fine) and say how you got it.


> [!warning] Recall — partial ◐ (30%)
> Your answer: I took the integral of e(-3t)dt from 0 to 1. I got 1/3(1-e^-3)
> Confidence: 50% · 148s
> Read as: The learner integrated e^{-3t} from 0 to 1 and got (1/3)(1 - e^{-3}), about 0.32. They gave no explicit number.
> First error: They used e^{-3t} as the probability density instead of 3e^{-3t}. The density is missing the rate factor k.
>
> Integrating a waiting-time density from 0 to 1 is the right approach, and your answer correctly stays below 1. However, the density you integrated isn't normalized: check what e^{-3t} integrates to from 0 to infinity, which should be 1 for a true probability density. Fix that, and also give the final numerical value.


> [!question] Recall — Recall
> A protein flips between two conformations, **C** (closed) and **O** (open), checked once per nanosecond (discrete time). Each step:
> - from C: stays C with prob $0.9$, goes to O with prob $0.1$
> - from O: goes to C with prob $0.5$, stays O with prob $0.5$
>
> 1. Write this as a $2\times 2$ transition matrix $P$ (rows = "from").
> 2. If it starts in C with certainty, what's the probability distribution over {C, O} after **two** steps?
> 3. What's the long-run fraction of time spent in O?


> [!failure] Recall — incorrect ✗ (0%)
> Your answer: give me  phone for photo
> Confidence: 0% · 551s
> Read as: The learner did not answer the question. They wrote 'give me  phone for photo', which looks like a request to upload a photo of handwritten work, but no photo or work is attached.
> First error: No answer was provided for part 1. The submission is a request to upload a photo, not a solution.
>
> Your submission came through without any work, only a note about sending a photo. Please upload the photo of your solution, or type your answers for all three parts: the matrix P, the distribution after two steps, and the long-run fraction of time in O.


> [!abstract] PI

That was a request to send a photo, not a wrong answer, so I'm ignoring the grade. Here it is again with the photo option on. Open the `/phone` page and send your paper work:


> [!question] Recall — Recall
> A protein flips between two conformations, **C** (closed) and **O** (open), checked once per nanosecond (discrete time). Each step:
> - from C: stays C with prob $0.9$, goes to O with prob $0.1$
> - from O: goes to C with prob $0.5$, stays O with prob $0.5$
>
> 1. Write this as a $2\times 2$ transition matrix $P$ (rows = "from").
> 2. If it starts in C with certainty, what's the probability distribution over {C, O} after **two** steps?
> 3. What's the long-run fraction of time spent in O?
>
> Work it on paper and send a photo from your phone, or type your answer.


> [!warning] Recall — cancelled
> (user skipped)


> [!question] Question
> You cancelled the transition-matrix question. What would you like to do?
>
> 1. Retry it — I'll send a photo this time
> 2. Retry it — I'll type the answer
> 3. Skip it — I don't know this material yet, treat it as a gap
> 4. The photo upload isn't working
> 5. Stop for now


> [!example] Answer
> 1. Retry it — I'll send a photo this time


> [!question] Recall — Recall
> A protein flips between two conformations, **C** (closed) and **O** (open), checked once per nanosecond (discrete time). Each step:
> - from C: stays C with prob $0.9$, goes to O with prob $0.1$
> - from O: goes to C with prob $0.5$, stays O with prob $0.5$
>
> 1. Write this as a $2\times 2$ transition matrix $P$ (rows = "from").
> 2. If it starts in C with certainty, what's the probability distribution over {C, O} after **two** steps?
> 3. What's the long-run fraction of time spent in O?
>
> (Send a photo of your paper work from the `/phone` page.)
>
> Work it on paper and send a photo from your phone, or type your answer.
