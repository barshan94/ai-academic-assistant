# Academic, privacy and operational acceptance

Status: **review package prepared; external approvals and operator assignment remain outstanding**.

This document separates software behavior from academic authority, legal review and operational ownership. Code cannot self-certify an official syllabus, mark scheme, privacy compliance or human grading quality.

## 1. Official syllabus validation

For every supported board/qualification/subject/syllabus version:

- Obtain the official specification from the awarding body or relevant education authority.
- Record publisher/authority, official URL, document title, issue/version, publication date, effective examination session and access date.
- Map each catalogue chapter/topic to exact official section/page references.
- Have a qualified subject teacher independently compare the mapping and flag omissions, obsolete topics, wording differences and assessment-objective mismatches.
- Preserve source provenance and review history. Do not convert an owner-entered URL or an AI suggestion into an official mapping without review.
- Mark unsupported or ambiguous mappings as pending; do not silently infer equivalence across syllabus versions.

Acceptance requires a signed subject-by-subject review record identifying reviewer, qualification, date, source version, reviewed coverage and unresolved exceptions.

## 2. Human grading and answer-quality review

Use a representative, rights-cleared sample across subjects and question types, including multi-step calculations, diagrams, graphs, practical/experimental questions, command words, extended responses and Bengali teaching explanations.

For each sample, an independent qualified teacher should assess:

- factual and conceptual correctness;
- method, working and final answer;
- units, significant figures, notation and diagrams;
- alignment with the applicable official specification and mark scheme;
- allocation of marks and treatment of alternative valid methods;
- clarity and age/qualification appropriateness of English exam answers and Bengali/English explanations;
- whether uncertainty, assumptions and limitations are explicit.

Record question ID, board, qualification, subject, syllabus version, answer version, reviewer, rubric scores, error category, severity, correction and retest outcome. Use a second reviewer for disputed/high-impact samples. A teacher's review is not official awarding-body endorsement.

Do not describe a generated answer as verified, exam-board approved or guaranteed correct merely because deterministic arithmetic/dimensional checks passed.

## 3. Privacy and legal review

Prepare a data inventory and data-flow diagram covering:

- account identifiers and authentication data;
- question text, uploaded PDFs/images, OCR text and answer history;
- syllabus sources, teacher invitations and review records;
- Google Drive file IDs and encrypted OAuth refresh tokens;
- AI provider requests, model/provider metadata and any fallback;
- optional Brave search queries and stored source leads;
- logs, analytics, backups, retention and deletion paths.

For each flow, document purpose, data fields, user choice/consent or other applicable basis, recipient/subprocessor, hosting/processing location, retention, deletion, security control and whether data leaves Bangladesh. Verify current vendor terms and data-processing arrangements directly.

Review account deletion, backup expiry, teacher revocation, OAuth disconnect, incident response, access requests, children's data risk, cross-border transfer, retention and breach notification with a qualified privacy/legal professional familiar with applicable Bangladesh law and any other relevant jurisdictions. Do not claim legal compliance before that review.

Until approval, keep the service restricted to authorized adult test users and synthetic or otherwise properly authorized data. Do not upload identifiable student work to external AI/search providers without an approved basis and explicit operational controls.

## 4. Named operator and runbook

The service owner must assign a named primary operator and backup operator before production use. Record their role, contact route in the organization's approved directory, availability, access approval and training date. Do not put personal contact details or credentials in this public repository.

The operator runbook must cover:

- monitoring application, Supabase and GitHub Actions failures;
- queue backlog, stale jobs, retry exhaustion and manual recovery;
- Drive OAuth expiry/revocation and encryption-key custody;
- AI provider outage, fallback policy, budget and quota stop;
- backup schedule, restore drill and incident escalation;
- account access, teacher invitation/revocation and suspected data exposure;
- release/rollback, migration review and post-incident records.

A named person must acknowledge operational ownership and demonstrate the runbook in a non-production exercise. An empty role template is not an assignment.

## 5. Release acceptance record

| Gate | Required evidence | Status |
| --- | --- | --- |
| Official syllabus provenance and mapping | Subject/qualification review records | NOT ASSIGNED |
| Human answer grading | Independent rubric-based sample review | NOT RUN |
| Privacy/data-flow review | Approved inventory and qualified review | NOT RUN |
| Legal review | Written jurisdiction-specific advice/approval | NOT RUN |
| Primary operator | Named owner and runbook acknowledgement | NOT ASSIGNED |
| Backup operator | Named backup and access/coverage confirmation | NOT ASSIGNED |
| Incident and recovery exercise | Non-production exercise record | NOT RUN |

No production launch should be represented as fully accepted while any mandatory gate above remains outstanding.
