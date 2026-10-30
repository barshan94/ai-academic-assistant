# Project Memory

Last updated: 2026-10-30

## Project
AI Academic Assistant — personal academic workspace for Edexcel O Level/A Level, SSC and HSC.

## Owner's teaching subjects
Physics, Mathematics A, Mathematics B, Further Pure Mathematics, General Mathematics, Higher Mathematics, ICT and Computer Science.

## Confirmed decisions
- Personal single-owner application initially.
- Responsive web app, PWA-ready.
- Bengali and English explanations; exam-ready answer in English by default.
- Task-based AI provider routing behind provider adapters.
- Hybrid retrieval: own uploaded/library knowledge first; web research only when needed.
- Supabase Free only; no upgrades or charges authorized.
- Supabase organization: Barshan.
- Supabase project: academic-assistant.
- Supabase region: ap-south-1 (Mumbai).
- Supabase project reference: uqpyzicftxxegajaocxi.
- Google Drive is the long-term document archive; Supabase stores metadata and Drive file IDs.
- Images are converted to optimized PDFs, then checked for readability before source cleanup.
- Existing PDFs remain PDFs and are not needlessly reconverted.
- Public GitHub repository is explicitly accepted by owner: https://github.com/barshan94/ai-academic-assistant

## Academic processing rules
- Chunk large documents; never rely on one oversized model context for a whole book/chapter.
- Persist page/question chunks and build topic/chapter summaries hierarchically.
- Keep AI-generated, machine-checked and teacher-verified statuses distinct.
- Preserve source provenance and teacher corrections.
- Use symbolic/numeric/unit/dimensional checks where applicable; do not claim universal verification.

## Planned milestones
M1 10% foundation; M2 25% document intelligence; M3 45% solver; M4 58% verification; M5 68% syllabus intelligence; M6 82% chapter intelligence; M7 93% exam preparation; M8 100% production readiness.

## Current verified state
- Supabase project created and returned ACTIVE_HEALTHY.
- Project API URL: https://uqpyzicftxxegajaocxi.supabase.co
- No credentials or service-role key should be committed.
- GitHub repository exists and is public by owner's choice.
- Initial README commit exists.
- Application has not yet been connected to Supabase, migrations have not been applied, and no application tests/build/deployment have been completed.
- Google Drive OAuth has not been configured.

## Next tasks
1. Upload the complete starter source and documentation to GitHub.
2. Add safe CI checks and verify dependency installation/build.
3. Configure Supabase environment locally without committing secrets.
4. Apply schema and RLS migrations; test authentication and ownership.
