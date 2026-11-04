---
slug: let-s-continue-from-the-last-lesson
title: "HDX kinetics math (rates, Markov chains, first-order decay)"
readings: 0
updated: 2026-10-20T03:12:04.053Z
---
# HDX kinetics math (rates, Markov chains, first-order decay)

*The book of this lesson: only what the tutor wrote for you to read, in teaching order. Questions, answers and grades stay in the lesson log.*

**Goal.** Understand the math behind the HDX application: rates, first-order decay, transition matrices, generator Q; end by writing C⇌O→X as a rate matrix + master equation.

## Map

```mermaid
graph TD
  R1["rate = prob k·dt per tiny dt, memoryless"]
  R2["next distribution = current mixed through rows of P"]
  D1["bookkeeping → dS/dt = −kS → S = e^(−kt)"]
  D2["consequences: 1−e^(−kt), density k·e^(−kt), mean 1/k"]
  D3["two-step propagation + stationary = balanced flows"]
  D4["tiny time step: P ≈ I + Q·dt → generator Q"]
  G["C ⇌ O → X as rate matrix Q + master equation"]
  R1 --> D1 --> D2
  R2 --> D3
  R1 --> D4
  D3 --> D4
  D2 --> G
  D4 --> G
```

## Contents

1. rate = prob k·dt per tiny dt, memoryless (definition) *(not written yet)*
2. bookkeeping → dS/dt = −kS → S = e^(−kt) *(not written yet)*
3. consequences: 1−e^(−kt), density k e^(−kt), mean 1/k *(not written yet)*
4. next distribution = current mixed through rows of P *(not written yet)*
5. two-step propagation + stationary = balanced flows *(not written yet)*
6. tiny time step: P ≈ I + Q dt → generator Q *(not written yet)*
7. C ⇌ O → X as rate matrix Q + master equation *(not written yet)*
