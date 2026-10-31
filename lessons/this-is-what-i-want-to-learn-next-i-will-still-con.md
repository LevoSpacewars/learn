# this is what I want to learn next. I will still continue on the HDX for now, but this should be added into my list of items I want to learn Inverse functions of monotone maps. A strictly monotone continuous function has an inverse; the graph is the same set read either way. Here: $t_f(d)=D_f^{-1}(d)$ exists and $\ln t_g-\ln t_f$ is a width of a region read horizontally. Spivak, Calculus, ch. 12.



> [!quote] YOU

> [!note] SKILL loaded: teach

Bring: this is what I want to learn next. I will still continue on the HDX for now, but this should be added into my list of items I want to learn Inverse functions of monotone maps. A strictly monotone continuous function has an inverse; the graph is the same set read either way. Here: $t_f(d)=D_f^{-1}(d)$ exists and $\ln t_g-\ln t_f$ is a width of a region read horizontally. Spivak, Calculus, ch. 12.. Use lesson slug "this-is-what-i-want-to-learn-next-i-will-still-con" and note "lessons/this-is-what-i-want-to-learn-next-i-will-still-con.md". Nothing is timed: he may walk away mid-answer and come back later. Never mention time, pace, speed or a budget; stop only when he says stop or the goal lands.


> [!abstract] PI

Not logged in · Please run /login


> [!quote] YOU

Area as a double integral and Fubini’s theorem. The area of a region between two curves can be sliced vertically or horizontally; Fubini says both give the same number. Here: $\int(g-f)\,d\ln t=\int_0^N\ln\frac{t_g}{t_f}\,dd$. Apostol, Calculus vol. 2, ch. 11, or any multivariable text’s treatment of iterated integrals over regions of type I and II. Practice by computing $\int_0^1\int_0^x$ both ways until the swap is automatic.
Change of variables in one integral. Needed to move between $dt$, $d\ln t$, and $dd$ as the integration variable, including the Jacobian $dd=D'(t)\,dt$. Spivak ch. 19.
Improper integrals and the Frullani integral. $\int_0^\infty\frac{e^{-at}-e^{-bt}}{t}dt=\ln\frac ba$, including why the integrand is finite at $0$ and why the integral converges at $\infty$. Derive it by writing $\frac{e^{-at}-e^{-bt}}{t}=\int_a^b e^{-st}ds$ and swapping order, which is Fubini again. Whittaker and Watson §4.5, or any table of integrals with the proof.
Laplace and Mellin transforms of exponential sums. $\int_0^\infty e^{-kt}t^{s-1}dt=\Gamma(s)k^{-s}$. Frullani is the $s\to0$ limit of the Mellin transform of $g-f$. This is the rigorous form of the “singularities on the real axis” intuition. Arfken and Weber, chapter on integral transforms.
Monotonicity and sandwich (comparison) arguments. If $f_1\le g\le f_2$ pointwise and all are monotone, then inverses are ordered the same way. This is the whole error bound: $f(t/P_{\min})\le g(t)\le f(t/P_{\max})$ implies $P_{\min}\le t_g/t_f\le P_{\max}$. Spivak ch. 7 and the exercises on inverse functions; practice with $e^{-at}$ vs $e^{-bt}$.
Integral bounds via sup norms. $\left|\int_A h\right|\le|A|\,\sup_A|h|$. This converts the sandwich into the truncation bound $\frac{d_1+(N-d_2)}{N}\ln\frac{P_{\max}}{P_{\min}}$. Same chapter.
Quadrature error for Riemann sums. The discrete version of the method is a Riemann sum of $\ln\frac{t_g}{t_f}$ over a grid in $d$; its error is bounded by grid spacing times the variation of the integrand. Trefethen, Approximation Theory and Approximation Practice, ch. 1 and 19, or the midpoint-rule error bound in any numerical analysis text.
Weighted integrals and the moment problem. $\int_0^N\phi(d)\epsilon(d)\,dd$ for polynomial $\phi$, and the fact that a bounded function on a bounded interval is determined by its polynomial moments (Weierstrass approximation plus Hausdorff moment problem). Trefethen ATAP ch. 6 for Weierstrass; Akhiezer, The Classical Moment Problem, ch. 1 for the statement only.
Products of exponential sums. $(\sum_i e^{-k_it})^2=\sum_{ij}e^{-(k_i+k_j)t}$. Trivial algebra, but it is the reason the moment route stays inside Frullani’s reach. Pair with: when is $\ln\frac{k_i+k_j}{c_i+c_j}$ equal to $\frac12(\ln P_i+\ln P_j)$, and what is the leading term when it is not. That last question is a Taylor expansion in $\ln P_i-\ln P_j$; Spivak ch. 20.
Jensen’s inequality. Sign of the pointwise error $\epsilon(d)$ at early versus late $d$ comes from convexity of $e^{-u}$ in $\ln u$, which flips at $u=1$. Steele, The Cauchy-Schwarz Master Class, ch. 6.


> [!abstract] PI

Not logged in · Please run /login


> [!quote] YOU

> [!note] SKILL loaded: teach

Continue the lesson "this is what I want to learn next. I will still continue on the HDX for now, but" (slug: this-is-what-i-want-to-learn-next-i-will-still-con). Nothing is timed: he may walk away mid-answer and come back later. Never mention time, pace, speed or a budget; stop only when he says stop or the goal lands.


> [!abstract] PI

Not logged in · Please run /login


> [!quote] YOU

let's try this again


> [!quote] YOU

> [!note] SKILL loaded: teach

Continue the lesson "this is what I want to learn next. I will still continue on the HDX for now, but" (slug: this-is-what-i-want-to-learn-next-i-will-still-con). Nothing is timed: he may walk away mid-answer and come back later. Never mention time, pace, speed or a budget; stop only when he says stop or the goal lands.


> [!abstract] PI

I'm picking up the open lesson. The slice shows no nodes yet, so I'll read the lesson note first to recover where we stopped.


> [!abstract] PI

Now I'll register the new fundamentals with short names and domains so they show on the knowledge map, all in parallel.


> [!question] Question
> The topics are filed. What do you want to do in this session?
>
> 1. Just file it, I'm done for now
> 2. Start the first piece now: monotone inverses and Fubini
> 3. Go back to the matrix-exponential lesson (HDX path)


> [!example] Answer
> 3. Go back to the matrix-exponential lesson (HDX path)


> [!question] Question
> Anything you want to discuss before the first question?
>
> First up is a completion problem on the two-mode substitution (superposition), then the spectrum of the 3-state chain.
>
> 1. Ready, ask the first question
> 2. I want to discuss first


> [!example] Answer
> 1. Ready, ask the first question
