For a knowledge-map, give each item a SHORT name of 1-3 words (max 22 characters) that a physicist would recognise as the same thing. Keep technical nouns (e.g. 'Fokker-Planck', 'BAOAB', 'PCA via SVD', 'Uptake curves'). No verbs, no articles. Reply with ONLY a JSON object mapping id -> short name, no prose.

m:math/approx-craft: Approximation craft: expand in the right small parameter and know when it fails
m:math/laplace-saddle: Derive Stirling and the thermodynamic limit by Laplace's method
m:math/spectral-svd: Derive PCA as SVD of centered data and run it on a trajectory
m:math/matrix-calc: Derive gradients of matrix expressions
m:math/gen-functions: Prove the CLT via cumulant generating functions; isotope envelope as example
m:math/bayes: Bayesian inference from scratch: conjugacy, Metropolis MCMC, hierarchical models, evidence
m:math/markov: Markov chains and Markov reward processes
m:math/langevin-fp: Derive Fokker-Planck from Langevin and show Boltzmann is stationary
m:math/info-theory: Derive Boltzmann as maximum entropy; KL, Gibbs inequality, mutual information
m:math/optimization: Convexity, duality, and gradient-descent stability
m:math/ldt: Large deviations: Cramér via Chernoff, rate function as Legendre transform, Gärtner-Ellis
m:math/fluct-theorems: Derive Jarzynski and Crooks and the LDT view of work distributions
m:math/groups: Groups and representations for equivariant networks
m:md/dissect-setup: Dissect one of your own OpenMM/Amber setups and defend every choice
m:md/integrator: Build velocity-Verlet + Langevin (BAOAB) in numpy
m:md/validate-traj: Validate a production trajectory with honest error bars
m:md/forcefield-pme: Derive the force-field form and Ewald/PME; critique a ligand parameterization
m:md/pca-msm: Build PCA + a Markov state model with implied timescales
m:md/enhanced-sampling: Get a PMF with umbrella sampling or metadynamics + MBAR
m:md/ml-potential: Train/run an ML potential (MACE/ANI) and critique its stability
m:md/method-prototype: Prototype your own method idea
m:fep/rbfe-cycle: Draw the RBFE thermodynamic cycle for two of your HPK ligands
m:fep/zwanzig: Derive Zwanzig (EXP) and its cumulant expansion; test on harmonic oscillators
m:fep/ti-mbar: Implement TI and BAR/MBAR on the toy and compare with pymbar
m:fep/noneq-switching: Nonequilibrium switching: Jarzynski, Crooks, BAR on work distributions
m:fep/run-edge: Run one RBFE edge in OpenFE
m:fep/diagnose-edge: Diagnose and fix a bad edge
m:fep/network-benchmark: Run an RBFE network on a congeneric series and benchmark it
m:fep/fep-limits: Critique where FEP fails: ABFE, charge changes, protonation, binding-mode changes
m:hdx/ll-as-markov: Write Linderstrøm-Lang as a 3-state Markov chain and derive EX1/EX2
m:hdx/bleed-forward-model: Derive the bleed.py forward model: CTMC + killing -> occupation times -> Poisson-binomial envelope, and get EX1/EX2 out of the spectrum
m:hdx/intrinsic-rates: Compute intrinsic exchange rates by hand (Bai 1993 / Nguyen 2018)
m:hdx/dg-op: Native-state HDX: protection factors to ΔG_op; foldons
m:hdx/pf-models: Critique phenomenological PF models and how HX-ESP used them
m:hdx/residue-bayes: Bayesian residue-level inference from overlapping peptides
m:hdx/ensemble-reweight: Max-ent reweighting of MD ensembles to HDX (HDXer) vs HX-ESP selection
m:hdx/paper-critique: Critique a recent HDX paper against the Masson 2019 recommendations
m:hdx/msm-exchange-method: Original method: MSM rates -> exchange kinetics
m:ms/isotope-envelope: Compute a peptide isotope envelope by convolution and compare to your library
m:ms/orbitrap-physics: Derive Orbitrap frequency, the FT step, and resolution vs transient length
m:ms/envelope-fit: Fit deuterated envelopes with uncertainties (least squares and Bayesian)
m:ms/fragmentation: Fragmentation: CID/HCD vs ETD/ECD, scrambling, residue-level HDX
m:ms/search-fdr: Build a toy database search with target-decoy FDR
m:ms/lfq-stats: Label-free quant statistics: normalization, missingness, linear models
m:ms/critique-own-library: Critique and redesign your own HDX-MS library
m:ai/micrograd: Build scalar autograd and train a tiny MLP; gradient-check it
m:ai/mlp-lm: Derive cross-entropy as max likelihood; train an MLP language model in PyTorch
m:ai/gpt: Build a GPT from scratch, deriving attention
m:ai/why-it-works: Generalization, double descent, and a mini scaling-law reproduction
m:ai/diffusion: Derive the DDPM loss and implement it on 2D data
m:ai/rl-bellman: Derive the Bellman equation; implement value iteration and policy gradient
m:ai/equivariant-gnn: Build an E(3)-equivariant GNN and test its equivariance
m:ai/ssm: Derive SSMs/Mamba: discretization, linear recurrence vs attention
m:ai/critique-apply: Critique a new architecture paper in an afternoon; prototype an HDX/MS predictor
m:linux/strace: strace a Python script and explain every syscall
m:linux/memory: Explain RSS vs VSZ, page faults and the OOM killer from /proc
m:linux/vm-admin: Build and harden a VM: users, systemd service, journald, SSH, firewall, LVM
m:linux/network: Read a DNS lookup and TCP handshake in tcpdump; subnetting and routing
m:linux/slow-job: Diagnose a slow Slurm job: affinity, NUMA, I/O, perf
m:linux/mpi-rdma: Run MPI over InfiniBand/RDMA with OSU benchmarks; explain with alpha-beta
m:linux/containers: Container internals: namespaces, cgroups, Apptainer vs Docker, GPUs
m:linux/cluster-critique: Critique an HPC cluster design or product spec from work
m:wafer-optics/resolution: Estimate resolution, pixel size and depth of focus from λ and NA
m:wafer-optics/darkfield: Explain darkfield vs brightfield via Rayleigh scattering
m:wafer-optics/fourier-imaging: Imaging as convolution: pupil/OTF, coherent vs incoherent, spatial filtering
m:wafer-optics/detection: Die-to-die subtraction, noise, thresholds, ROC and nuisance rate
m:wafer-optics/throughput: Estimate full-wafer data rate and FLOPs and map to HPC hardware
m:wafer-optics/ml-classification: ML defect classification and nuisance filtering (review paper)
m:wafer-optics/ebeam: E-beam vs optical; inspection vs metrology
m:finance/cashflow: Build a one-page cash flow, savings rate and emergency fund
m:finance/accounts: Order account priorities: 401k match, HSA, Roth vs traditional, mega-backdoor
m:finance/allocation: Choose an asset allocation; index funds and fees
m:finance/equity-comp: Decide on KLA RSUs/ESPP and concentration risk
m:finance/map-unknowns: Map the rest: insurance, mortgage, estate
c:taylor-series-error: Taylor series with remainder; choosing the expansion point and small parameter
c:asymptotic-orders: Orders of magnitude, O/o notation, convergent vs asymptotic series
c:gaussian-integrals: Gaussian integrals and completing the square (1D and multivariate)
c:eigendecomposition: Eigendecomposition of symmetric matrices (spectral theorem)
c:svd: Singular value decomposition and low-rank approximation
c:matrix-calculus: Matrix calculus: gradients of scalar functions of vectors/matrices
c:moment-generating-functions: Moment and cumulant generating functions
c:lagrange-multipliers: Constrained optimization with Lagrange multipliers
c:convexity-duality: Convex functions and Lagrange duality
c:legendre-transform: Legendre-Fenchel transform
c:group-representations: Group representations: SO(3)/E(3), irreps, equivariance
c:matrix-exponential-linear-odes: Linear ODE systems and the matrix exponential
c:linear-maps-matrix-products: Matrices as linear maps; matrix products, projections, dot-product similarity
c:chain-rule-jacobians: Multivariable chain rule, Jacobians, reverse-mode autodiff
c:discrete-convolution-generating-functions: Convolution of discrete distributions via polynomial generating functions
c:fourier-transform-convolution: Fourier transform, convolution theorem, sampling and frequency resolution
c:ill-posed-inverse-problems: Ill-posed inverse problems, identifiability, regularization
c:markov-chains: Markov chains: transition matrices/generators, stationary distribution, detailed balance
c:bellman-equation: Markov reward processes and the Bellman equation
c:ito-calculus: Itô calculus basics: Wiener process, Itô's lemma
c:bayes-posteriors: Bayes' theorem, priors, likelihoods, posteriors, conjugacy
c:mcmc-metropolis: Metropolis-Hastings MCMC and why it samples the target
c:maximum-likelihood: Maximum likelihood estimation (and cross-entropy as negative log-likelihood)
c:kl-divergence: Entropy and KL divergence
c:importance-sampling: Importance sampling and the variance of reweighting estimators
c:autocorrelation-ess: Autocorrelation time, effective sample size, block averaging
c:hypothesis-testing-fdr: Hypothesis tests, p-values, multiple testing and false discovery rate
c:nonlinear-least-squares: Nonlinear least squares and parameter uncertainties (covariance from the Jacobian)
c:linear-models: Linear models / regression with design matrices
c:bias-variance: Bias-variance decomposition and generalization
c:signal-detection-roc: Signal detection theory, thresholds, ROC curves
c:langevin-equation: Langevin equation: friction, noise, fluctuation-dissipation
c:boltzmann-partition: Boltzmann weights, partition functions, free energy as -kT ln Z
c:thermodynamic-cycles: Thermodynamic cycles and state functions
c:symplectic-integrators: Hamiltonian dynamics and symplectic (Verlet) integrators
c:ewald-summation: Ewald summation and particle-mesh Ewald
c:first-order-kinetics: First-order and two-state kinetics; steady-state and pre-equilibrium approximations
c:arrhenius-ph-rates: Arrhenius temperature dependence and acid/base catalysis (pH dependence) of rates
c:diffraction-limit-abbe: Abbe/Rayleigh resolution limit, NA, depth of focus
c:rayleigh-scattering: Rayleigh scattering cross-section (d^6/λ^4) and Mie regime
c:gradient-descent: Gradient descent, step size and stability, SGD/Adam
c:processes-syscalls: Processes, fork/exec, file descriptors, system calls
c:virtual-memory: Virtual memory, page tables, page faults
c:tcp-ip-layers: TCP/IP layering, TCP handshake and state machine, DNS
c:cidr-subnetting: IP addressing, CIDR subnetting, routing tables
c:memory-hierarchy-cache: Memory hierarchy, cache lines, NUMA
c:roofline-amdahl: Amdahl's law and the roofline model (arithmetic intensity)
c:latency-bandwidth-model: Alpha-beta latency/bandwidth model of communication
c:compound-growth-pv: Compound growth, present value, real vs nominal returns
c:marginal-vs-effective-tax: Marginal vs effective tax rates; tax-deferred vs tax-free growth
c:diversification-correlation: Diversification, correlation, expected return vs volatility