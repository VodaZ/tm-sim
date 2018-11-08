!! This project is was tested in Ramda REPL (https://ramdajs.com/repl)

Turing Machine
----

M = (Q, Σ, Γ, δ, q0, qf);

* Q ... finite set of states
* Σ ... input alphabet: finite set of input symbols
* Γ ... tape alphabet: finite set of stack symbols
* δ ... transfer function: subset of (Q \ {qf}) x Γ &rarr; Q x (Γ U {L, R})
* q0 ... initial state (q0 is element of Q)
* qf ... terminating state (qf is element of Q)

Definition used in project
----

The machine takes Δ as blank tape symbol. Γ contains Δ implicitly. In project we suppose:

```
Σ = Γ \ {Δ}
```

Function *TM* is used to create Turing machine.

```javascript
const TM = (Γ, δ, q0, qf, tapes) => { ... }
```

Parameter *tapes* can be used to define initial tapes content. Number of tapes is infered implicitly from rules and from content of *tapes* parameter. Example of TM:

```javascript
const q0 = getState(); // uses states generator to avoid duplicit states
const qf = 'qf';
const Q = [q0, 'q1', qf];
const Σ = ['a', 'b', 'c', 'x', 'y', 'z'];
const Γ = [...Σ, Del];

cosnt δ = [
	"(q1, a) -> (q3, (0, R))",
	"(q1, a, b) -> (q3, (0, R), (1, a))",
	...
];

TM(Γ, δ, q0, qf, {0: 'ΔaΔ', 1: 'Δ'})
```

Rules are defined as follows (it is JS string):

```javascript
(q1, a, b) -> (q3, (0, R), (1, a))
```

Where

* q1 ... state from
* a ... symbol on *tape 0*
* b ... symbol on *tape 1*
* q3 ... state to
* (0, R) ... move *tape 0* right
* (1, a) ... write symbol *a* to tape 1

Function TM returns object defining final state of TM.

TM Halting Problem
----
It is not possible to say, whether TM is computing towards finite state, or it is cycling. To avoid this, program uses counter *maxSteps* to set maximum TM steps. Enlarge value of this variable to when you are suspicious that  TM needs more steps.