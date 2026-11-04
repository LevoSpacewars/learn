---
slug: m-hdx-ex1-ex2
status: solid
updated: 2026-11-04T05:00:15.727Z
---
# EX1 vs EX2 from the master equation

**Status:** solid

**Lesson:** [[m-hdx-ex1-ex2]] (done, 6/7 nodes) — R1, D1, D2, R2, D3, D4 confirmed. G (envelope shapes) read; he claims expertise and ended the recall phase before the transfer check.
Next: if he agrees, one quick transfer (bleaching-bead analogue) to close G and the lesson; otherwise mark done on his word and move to the HDX milestone.
**Book:** [[book/m-hdx-ex1-ex2|EX1 vs EX2 from the master equation]] (the readings only, no cards)

## Misconceptions
- [open] believed "The quasi-steady-state approximation dO/dt ≈ 0 is justified by k_op ≪ k_cl (the open population being small)." — truth: It is justified by the total exit rate from O, k_cl + k_ch, being ≫ k_op: O relaxes to its balance much faster than C changes. Smallness of O is a separate (population) statement; which exit is larger (k_cl vs k_ch) decides EX1/EX2, not the approximation. (for 1 / against 0)

## Evidence (29, latest first)
- 2026-11-04 recall/recall ◐ 40%
  - asked: A stretch of $N$ backbone amides is protected together: when the segment opens, all $N$ are exposed at once; when it closes, all are shielded. In the mass spectrum over time, one regime shows a single isotope envelope whose center drifts smoothly from $+0$ toward $+N$ Da. The other regime shows two envelopes at fixed positions ($+0$ and $+N$) with one shrinking as the other grows. Explain which r…
  - answered: photo: work-20261103-205944.png
  - first error: Describing EX2 as 'limited by the opening rate'. That is the EX1 limit; in EX2, closing outcompetes chemical exchange, so $s = k_{ch}/(k_{cl}+k_{ch}) \ll 1$.
- 2026-11-04 recall/problem ◐ 65%
  - asked: An amide sits in a segment that opens and closes: closed $C \rightleftharpoons O$ open, and from $O$ it can exchange irreversibly to $X$. Rates per second: $k_{op} = 2$, $k_{cl} = 40$, $k_{ch} = 10$. (a) Compute the observed exchange rate $k_{obs}$ from the general formula. (b) Which limit is this closer to, EX1 or EX2, and why? What would each limiting formula have given for $k_{obs}$?
  - answered: photo: work-20261103-204008.png
  - first error: In (b), the EX2 formula $k_{obs} \approx \frac{k_{op} k_{ch}}{k_{ch}+k_{cl}}$ is the general formula, not the EX2 limiting form.
- 2026-10-18 recall/problem ◐ 65% (conf 70%)
  - asked: Chain $C \rightleftharpoons O \to X$ with $k_{op} = 4$ per second (C to O), $k_{cl} = 60$ per second (O to C), $k_{ch} = 140$ per second (O to X). (1) Write the balance equation for the open population, $dO/dt$, as inflow minus outflow using the populations $C$ and $O$ and the numbers above. (2) Set it to zero and give the quasi-steady-state $O$ as a multiple of $C$. (3) Name the one rate compari…
  - answered: 1) dO/dt = 4C - (60 + 140)O 2) dO/dt appox 0 => 4/200*C = O 3) this is okay since kop << kcl. This is relevant because it says that the appoximation of U = C is valid.
  - first error: Part (3): the comparison is stated as $k_{op} \ll k_{cl}$ instead of $k_{op} \ll k_{cl}+k_{ch}$, and the reason why it matters is not given.
- 2026-10-18 recall/recall ✓ 88% (conf 100%)
  - asked: An open site in $C \rightleftharpoons O \to X$ has two ways to leave the open state: close (rate $k_{cl}$) or exchange (rate $k_{ch}$). A student writes "the probability that a given opening ends in exchange is $k_{ch}/k_{cl}$". Give the correct expression, say what its denominator represents physically, and give one concrete reason the student's version cannot be right in general (think about wh…
  - answered: The correct probability that an open state results in an exchange is kch/(kcl + kch). where kcl and kch represent the total exits from the open state. If we used the students equation, we could get values greater than 1, which breaks normalization.
- 2026-10-17 recall/recall ✓ 90% (conf 100%)
  - asked: An amide in a folded protein is in EX2 at pH 7. You raise the pH step by step and it moves into EX1. Of the three rates $k_{op}$, $k_{cl}$, $k_{ch}$ in $C \rightleftharpoons O \to X$: which one(s) does pH change, by what factor per pH unit, and why does that push the regime from EX2 toward EX1 rather than the other way?
  - answered: photo: work-20261017-140147.png
- 2026-10-17 recall/recall ◐ 65% (conf 100%)
  - asked: For $C \rightleftharpoons O \to X$, the observed rate can be written as $k_{obs} \approx (\text{opening rate}) \times (\text{fraction of openings that end in exchange})$. Write that fraction in terms of $k_{cl}$ and $k_{ch}$, and explain why the fraction is not simply $k_{ch}/k_{cl}$.
  - answered: photo: work-20261017-134820.png
  - first error: The explanation never identifies $k_{cl}+k_{ch}$ as the total exit rate from O. It also never says why $k_{ch}/k_{cl}$ fails in general: it holds only when $k_{ch} \ll k_{cl}$ and can otherwise exceed 1.
- 2026-10-17 recall/problem ✗ 25% (conf 90%)
  - asked: Chain $C \rightleftharpoons O \to X$ with $k_{op} = 5$ per second (C to O), $k_{cl} = 200$ per second (O to C), $k_{ch} = 50$ per second (O to X). (1) Write $dO/dt$ as inflow minus outflow, with the numbers filled in. (2) Find the steady-state open population $O$ as a multiple of $C$. (3) State the single rate comparison that justifies treating $dO/dt \approx 0$.
  - answered: photo: work-20261017-133116-1.png, work-20261017-133116-2.png
  - first error: $\frac{dO}{dt} = \frac{dV}{dt}Q\big|_O = 5\frac{dC}{dt} - 250\frac{dO}{dt}$: the product should be $VQ$ (populations), not $\frac{dV}{dt}Q$, which should give $5C - 250\,O$.
- 2026-10-17 recall/recall ✓ 95% (conf 100%)
  - asked: Same chain $C \rightleftharpoons O \to X$ with rates $k_{op}$, $k_{cl}$, $k_{ch}$. In the EX1 regime: (a) what is the observed exchange rate $k_{obs}$, (b) which rate inequality puts you in EX1, and (c) if instead closing and exchange were equally fast, $k_{cl} = k_{ch}$, what would $k_{obs}$ become (in terms of $k_{op}$)?
  - answered: photo: work-20261017-130504-1.png, work-20261017-130504-2.png
- 2026-10-17 recall/recall ✓ 90% (conf 65%)
  - asked: A protected amide follows $C \rightleftharpoons O \to X$ (closed, open, exchanged) with rates $k_{op}$ (C to O), $k_{cl}$ (O to C) and $k_{ch}$ (O to X). Two inequalities are often both true for a folded protein: $k_{op} \ll k_{cl}$ and $k_{ch} \ll k_{cl}$. One of them is what actually makes the site EX2. Which one, and what does the other inequality do instead?
  - answered: EX2 is made true when k_ch << k_cl, this is because the system needs to open and close many times before exchange can occur. the other inequality tells us that the protein state population (between open and closed) is approximately entirely closed.
- 2026-10-15 recall/recall ✓ 92% (conf 100%)
  - asked: Going from pH 7 to pH 9, which of the three rates $k_{op}, k_{cl}, k_{ch}$ change, and what happens to the ratio $k_{ch}/k_{cl}$? Then one line: why does that push the site toward EX1 rather than EX2?
  - answered: only kch changes. k_ch/kcl gets larger as ph increases. Which means the exchange rate per opening is becoming almost garunteed with increased pH (depending on the numbers and how hard you push), so it will eventually look like exchange per opening event which is EX1.
- 2026-10-15 recall/explain ◐ 45% (conf 70%)
  - asked: A site has $k_{op} = 0.05$ and $k_{cl} = 20$ per second. At pH 7 its $k_{ch} = 2$ per second. (1) Give $k_{obs}$ at pH 7 and at pH 9, and name the regime at each. (2) In one sentence: why does raising pH move a site from EX2 toward EX1, and not the other way?
  - answered: photo: work-20261014-213210-1.png, work-20261014-213210-2.png
  - first error: No regime is named for either pH, and part (2) does not state that pH raises only $k_{ch}$ so that exchange outcompetes closing.
- 2026-10-15 recall/flaw ✓ 95% (conf 75%)
  - asked: Here is an argument. "Sites open at rate $k_{op}$. Once open, the site exchanges at $k_{ch}$ and closes at $k_{cl}$, so the fraction of openings that end in exchange is $k_{ch}/k_{cl}$. Hence $k_{obs} = k_{op}\cdot k_{ch}/k_{cl}$ for all values of the rates. With $k_{op}=2$, $k_{cl}=30$, $k_{ch}=70$ per second this gives $k_{obs} = 4.7$ per second." Is this right? If not, where does it go wrong, …
  - answered: photo: work-20261014-211342.png
- 2026-10-15 recall/recall ✓ 95% (conf 100%)
  - asked: $k_{op} = 2$, $k_{cl} = 30$, $k_{ch} = 70$ per second. Write $dO/dt$ as (inflow term) minus (outflow term), with the numbers in, then set it to zero and give $O$ as a number times $C$.
  - answered: photo: work-20261014-205626.png
- 2026-10-15 recall/explain ✗ 15% (conf 70%)
  - asked: $C \rightleftharpoons O \to X$ with $k_{op} = 2$, $k_{cl} = 30$, $k_{ch} = 70$ per second. (1) Write the settled value of $O$ in terms of $C$, as a number times $C$. (2) In one sentence: what single comparison of rates justifies setting $dO/dt \approx 0$ here, given that $k_{cl}$ is *not* the biggest rate?
  - answered: photo: work-20261014-205227.png
  - first error: In the first line, $\frac{dO}{dt} = C\,k_{cl} - (k_{ch}+k_{op})\,O$ treats $k_{cl}$ as the inflow into $O$ and $k_{op}$ as an exit from $O$. The directions of opening and closing are reversed.
- 2026-10-15 recall/predict ✓ 85% (conf 60%)
  - asked: $C \rightleftharpoons O \to X$, $k_{op} = 1$, $k_{cl} = 100$, $k_{ch} = 10$ per second, all in $C$ at $t=0$. After the first ~0.05 s, what does $O$ do over the next seconds? (a) grows until $O \approx C$; (b) sits nearly constant at a small value while $C$, $X$ slowly change; (c) oscillates. One letter, one line why.
  - answered: b) because the in the kcl >> kch zone the system will become well mixed by the time exchange begins. This is because the flow between C and O dominate since closing rate is so much larger than exchange and opening
- 2026-10-15 recall/predict ✗ 10% (conf 55%)
  - asked: Quick guess, no derivation. $C \rightleftharpoons O \to X$ with $k_{op} = 1$, $k_{cl} = 100$, $k_{ch} = 10$ per second. 1000 sites, all closed at $t = 0$. Open sites appear at $k_{op} C \approx 1000$ per second and leave at $(k_{cl} + k_{ch}) O$. Roughly how long until $O$ stops growing and levels off: about 10 ms, about 1 s, or about 1000 s? And what is the level, roughly?
  - answered: since k_op << kcl and kch << kcl. we reach a mixed population before exchange occurs at O/C = kop/kcl. meaning our kobs is appox kop/kcl*kch = 1/10. so it will take appoximately 1000 / (1/10) = 10000 seconds.
  - first error: Treating the time for $O$ to level off as the exchange timescale set by $k_{obs}$, rather than the fast relaxation of $O$ itself. This was compounded by computing a time as $1000/k_{obs}$.
- 2026-10-15 recall/flaw ✓ 90% (conf 100%)
  - asked: Here is your boxed last line: $\dfrac{dX}{dt} = \dfrac{U}{25} = k_{obs}$. Is it right? If not, where does it go wrong, and what is $k_{obs}$ with its units?
  - answered: photo: work-20261014-192809.png
- 2026-10-15 recall/problem ◐ 75% (conf 100%)
  - asked: Chain $C \rightleftharpoons O \to X$ with $k_{op} = 2$, $k_{cl} = 400$, $k_{ch} = 8$ per second. Exchanged sites $X$ grow as $dX/dt = k_{ch} O$. (a) What does the open count $O$ settle to, in terms of the unexchanged count $U$? Name the balance that fixes it and say why that balance gets established before much exchange happens. (b) Hence write $dX/dt$ in the form $k_{obs} U$ and give the number …
  - answered: photo: work-20261014-192430.png
  - first error: In (b), the boxed line $\frac{dX}{dt} = \frac{U}{25} = k_{obs}$ equates $k_{obs}$ with $U/25$ instead of identifying $k_{obs} = 1/25 = 0.04\ \text{s}^{-1}$. Earlier, in (a), the balance is used as $O/C = k_{op}/k_{cl}$ but never named as the flow balance $k_{op}C = k_{cl}O$.
- 2026-10-14 recall/recall ◐ 60% (conf 50%)
  - asked: $k_{op} = 2$, $k_{cl} = 300$, $k_{ch} = 20$ per second, 1000 sites, nearly all closed. (a) Mean time a site spends open, in seconds? (b) The steady-state number of open sites?
  - answered: a) 1/(k_cl + k_ch) = 1/320 b) O appox (2 * 1000)/(320) = 3.25
  - first error: In (b), $2000/320$ was evaluated as $3.25$ instead of $6.25$.
- 2026-10-14 recall/predict ✗ 0% (conf 25%)
  - asked: $k_{op} = 1$, $k_{cl} = 100$, $k_{ch} = 10$ per second, 1000 sites all closed at $t = 0$. Open sites are created at $k_{op} C$ and destroyed at $(k_{cl}+k_{ch}) O$. After about how long does $O$ stop changing appreciably, and at roughly what value does it sit?
  - answered: it is atleast 1000 seconds
  - first error: The timescale: claiming $\geq 1000$ s when the relaxation time of $O$ is set by $1/(k_{cl}+k_{ch}) \approx 10$ ms.
- 2026-10-14 recall/recall ✓ 90% (conf 45%)
  - asked: $k_{cl} = k_{ch}$ exactly, $k_{op}$ small. Give $k_{obs}$ as a multiple of $k_{op}$, one number.
  - answered: k_ch/(k_ch + k_ch) * k_op = k_obs = 0.5 k_obs
  - first error: The last term is written $0.5\,k_{obs}$ instead of $0.5\,k_{op}$, a notational slip.
- 2026-10-14 recall/boundary ◐ 60% (conf 100%)
  - asked: EX1 says $k_{obs} = k_{op}$. (a) Which single assumption does that step use, as an inequality between two rates? (b) Suppose instead $k_{cl} = k_{ch}$ exactly (neither exit wins). Is $k_{obs}$ then equal to $k_{op}$, larger, or smaller, and by roughly what factor?
  - answered: a). This assumption is based off the that k_cl << k_ch b). k_obs is going to be smaller than k_op because there will be unexchanged states that take the "closed exit" rather than the "exchange exit"
  - first error: In (b), no factor is given for how much smaller $k_{obs}$ is than $k_{op}$ when $k_{cl} = k_{ch}$.
- 2026-10-14 recall/recall ✓ 100% (conf 100%)
  - asked: Case B: $k_{op} = 1$, $k_{cl} = 100$, $k_{ch} = 10^4$ per second. $O$ is still tiny at any instant because $k_{op} \ll k_{cl}$. Yet the EX2 balance argument fails, because the inequality ____ is now false. Fill the blank.
  - answered: photo: work-20261013-194040.png
- 2026-10-14 recall/recall ◐ 50% (conf 55%)
  - asked: $k_{op} = 1$, $k_{cl} = 200$, $k_{ch} = 20$ per second. An open site's exits are close at 200 and exchange at 20, so the exchange share per opening is $20/220 \approx 0.09$, and a site hops $C \rightleftharpoons O$ about eleven times before leaking. Therefore the pair sits at its balance $k_{op}C = k_{cl}O$ throughout. Fill the blank: the inequality between two rates that this argument used is __…
  - answered: k_op << k_cl and k_ch << k_cl. Therefor the systems are well mixed before any leaking begins to occur
  - first error: Including $k_{op} \ll k_{cl}$ as an inequality the argument used.
- 2026-10-14 recall/recall idk
  - asked: An open site has exactly two exits: close at $k_{cl}$ or exchange at $k_{ch}$. Which comparison between two rates justifies treating $C$ and $O$ as sitting at their balanced split $k_{op}C = k_{cl}O$ throughout the experiment, and in one sentence, why?
- 2026-10-14 recall/explain ◐ 60% (conf 95%)
  - asked: Same chain, $k_{op} = 2$, $k_{cl} = 50$, $k_{ch} = 5$ per second, 1000 unexchanged sites, closing fast compared with exchange. Explain in your own words how you get $k_{obs}$: start from $dX/dt = k_{ch} O$, say what fixes $O$ and why, and finish with the number for $k_{obs}$. Show the steps on paper.
  - answered: photo: work-20261013-192359-1.png, work-20261013-192359-2.png
  - first error: The step "since this is in equilibrium the ratio of $O,C$ is constant" asserts balance without the mechanism, namely that $C\rightleftharpoons O$ exchanges much faster than $k_{ch}$ drains $O$. $O\approx 40$ is also never computed.
- 2026-10-14 recall/recall ✓ 100% (conf 100%)
  - asked: Chain $C \rightleftharpoons O \to X$ with $k_{op} = 2$, $k_{cl} = 50$, $k_{ch} = 5$, all per second. State order $(C, O, X)$. Give (a) the middle row of $Q$ (the $O$ row) and (b) the equation for $dX/dt$ in terms of the number of open sites $O$.
  - answered: photo: work-20261013-190759-1.png, work-20261013-190759-2.png
- 2026-10-13 quiz ✓ (conf 100%)
  - asked: Completion. Same chain, now $k_{op} = 2$, $k_{cl} = 198$, $k_{ch} = 5$ per s. The open fraction at balance is $\pi_O = 2/200 = 0.01$. The effective exchange rate is $k_{obs} \approx k_{ch} \cdot \pi_O = \_\_$ per s.
  - answered: 0.05
- 2026-10-13 recall/predict ✗ 0% (conf 0%)
  - asked: Chain $C \rightleftharpoons O \to X$ with $k_{op} = 1$, $k_{cl} = 100$, $k_{ch} = 10$, all per second. Start with everything closed. After the first few milliseconds the exchanged count $X(t)$ grows like $1 - e^{-k_{obs} t}$ with a single effective rate. Guess $k_{obs}$ to within a factor of a few, and say in one line what is slowing exchange down.
  - answered: photo: work-20261012-211221-1.png, work-20261012-211221-2.png
  - first error: After writing $\pi = (\pi_o, \pi_c)$, the work stops. No value of $\pi_o$ or $k_{obs}$ is obtained, and no reason for the slowdown is stated.
