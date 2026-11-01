# AI answer golden-set evaluation

Status: **dataset draft created; live-provider evaluation and human grading pending**.

This is an internally authored smoke/evaluation set, not an official Edexcel, Cambridge, SSC or HSC question bank. It must not be used to claim syllabus coverage or exam-board alignment. Each model run should record provider, model, prompt version, timestamp, answer JSON, deterministic check results and human scores. Do not include API keys or student personal data.

## Evaluation rubric

Score each dimension from 0 to 4:

| Dimension | 0 | 2 | 4 |
|---|---|---|---|
| Factual correctness | Fundamentally wrong | Partly correct with a material error | Correct and complete |
| Reasoning / working | Missing or invalid | Some valid steps, gaps remain | Clear, logically complete steps |
| Subject conventions | Incorrect notation, units or terminology | Minor omissions | Correct notation, units and terminology |
| Context discipline | Invents syllabus/source facts | Some unsupported assumptions | Uses only supplied context and labels uncertainty |
| Bengali explanation | Missing or misleading | Understandable but incomplete | Accurate, natural teaching explanation |
| English explanation | Missing or misleading | Understandable but incomplete | Accurate, clear teaching explanation |
| Safety / honesty | Claims unsupported verification or fabricates sources | Caveats incomplete | Clearly distinguishes generated draft, deterministic checks and human review |

Maximum: 28 points. Record critical errors separately; a critical factual error, fabricated citation, unsafe instruction, or false verification claim prevents a case from passing regardless of total score.

Two independent reviewers should grade each answer. Resolve any dimension scores differing by more than one point before release. Keep both original scores and the adjudicated score; do not overwrite prior evaluations.

## Golden cases

All cases are original evaluation prompts. The expected points are grading anchors, not a complete mark scheme.

### G-001 — Mathematics: linear equation

- Context: subject Mathematics; qualification and board not supplied.
- Prompt: `Solve 2x + 5 = 17. Show each algebraic step and check the result.`
- Expected answer: `x = 6`.
- Required points:
  - Subtract 5 from both sides: `2x = 12`.
  - Divide both sides by 2: `x = 6`.
  - Substitute back: `2(6) + 5 = 17`.
  - State that the solution satisfies the original equation.
- Critical errors: x=11, x=5, invalid inverse operations, or claiming a numerical check passed when it did not.

### G-002 — Physics: Newton's second law

- Context: subject Physics; qualification and board not supplied.
- Prompt: `A resultant force accelerates a 2.0 kg object at 3.0 m/s². Calculate the resultant force, show the formula and give the SI unit.`
- Expected answer: `F = ma = 2.0 × 3.0 = 6.0 N`.
- Required points:
  - Identify `F = ma`.
  - Substitute mass and acceleration with units.
  - Calculate 6.0.
  - Derive or state `kg m s⁻² = N`.
- Critical errors: wrong multiplication, confusing mass with weight, or incorrect final unit.

### G-003 — Chemistry: balancing a simple equation

- Context: subject Chemistry; qualification and board not supplied.
- Prompt: `Balance the equation Mg + O₂ → MgO and explain how you know it is balanced.`
- Expected answer: `2Mg + O₂ → 2MgO`.
- Required points:
  - Two magnesium atoms on each side.
  - Two oxygen atoms on each side.
  - Coefficients change molecule counts; subscripts are not changed.
- Critical errors: changing the formula to MgO₂, or claiming the unbalanced equation is balanced.
- Deterministic check limitation: atom-count checks do not establish reaction feasibility or chemical mechanism.

### G-004 — ICT: primary and secondary storage

- Context: subject ICT; qualification and board not supplied.
- Prompt: `Explain one difference between primary memory and secondary storage, and give one example of each.`
- Expected points:
  - Primary memory is directly accessible by the CPU for current processing; RAM is a valid example.
  - Secondary storage retains data for longer-term storage; SSD or HDD is a valid example.
  - Do not claim all primary memory is volatile (ROM is primary memory and non-volatile).
- Critical errors: stating that secondary storage is always slower in every possible system, or claiming ROM is volatile.

### G-005 — Mathematics: percentage change

- Context: subject Mathematics; qualification and board not supplied.
- Prompt: `A price increases from 80 to 92. Calculate the percentage increase and show the method.`
- Expected answer: increase = 12; percentage increase = (12 / 80) × 100 = 15%.
- Required points:
  - Calculate the change relative to the original value, not the new value.
  - Show `12 ÷ 80 × 100 = 15%`.
  - Label the result as an increase.
- Critical errors: 13.04% (using 92 as denominator), or reporting 12% without calculation.

## Run record template

For every model/prompt run, copy this block into the evaluation record:

- Case ID:
- Run date/time (UTC):
- Provider / model:
- Prompt version:
- Context supplied:
- Deterministic checks and results:
- Factual correctness (0–4):
- Reasoning / working (0–4):
- Subject conventions (0–4):
- Context discipline (0–4):
- Bengali explanation (0–4):
- English explanation (0–4):
- Safety / honesty (0–4):
- Critical error (yes/no; explain):
- Reviewer:
- Adjudication required (yes/no):
- Final outcome (pass / revise / fail):

## Release gate

Do not call M3's golden-set criterion complete until all five cases have been run against the configured production-intended model, two reviewers have scored each output, critical errors are resolved, and the evaluated model/prompt version is pinned in the release evidence. Unit tests of the parser and deterministic checks do not replace this evaluation.
