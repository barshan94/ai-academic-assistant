import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../actions";
import { createChapterNoteDraft, generateChapterNoteDraft, updateChapterNoteStatus } from "./actions";
import PrintNotesButton from "./print-notes-button";
import { checkFormulaSyntax } from "@/lib/ai/formula-checks";

type PageProps = { searchParams: Promise<{ create?: string; status?: string; ai?: string }> };
type NoteContent = {
  summary?: string;
  concepts?: string[];
  formulas?: string[];
  workedExamples?: string[];
  revisionPrompts?: string[];
  generatedBy?: string;
  sourceReferences?: Array<{ ref: string; questionId: string; pageId: string | null; pageNumber: number | null; extractionMethod: string | null }>;
};

function FormulaList({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return <div className="chapter-note-content-block"><h5>Formulas · syntax scan only</h5><ul>{items.map((item, index) => {
    const check = checkFormulaSyntax(item);
    return <li key={index}><span>{item}</span>{check.warnings.length ? <ul className="formula-check-warnings">{check.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : <span className="formula-check-ok">No obvious formatting issue detected · mathematical correctness not checked</span>}</li>;
  })}</ul></div>;
}
function ContentList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return <div className="chapter-note-content-block"><h5>{title}</h5><ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul></div>;
}

export default async function ChapterWorkspacePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: catalogs, error: catalogError } = await supabase.from("syllabus_catalogs")
    .select("id,board,qualification,subject,version,status")
    .eq("owner_id", user.id).order("created_at", { ascending: false });
  const catalogIds = (catalogs ?? []).map((item) => item.id);
  const { data: chapters, error: chapterError } = catalogIds.length
    ? await supabase.from("syllabus_chapters").select("id,catalog_id,title,chapter_code,sort_order")
      .eq("owner_id", user.id).in("catalog_id", catalogIds).order("sort_order").order("title")
    : { data: [] as { id: string; catalog_id: string; title: string; chapter_code: string | null; sort_order: number }[], error: null };

  const chapterIds = (chapters ?? []).map((item) => item.id);
  const { data: questions, error: questionError } = chapterIds.length
    ? await supabase.from("questions").select("id,syllabus_chapter_id,question_number,question_text,subject,document_page_id")
      .eq("owner_id", user.id).eq("review_status", "approved").in("syllabus_chapter_id", chapterIds).order("created_at", { ascending: false }).limit(300)
    : { data: [] as { id: string; syllabus_chapter_id: string | null; question_number: string | null; question_text: string; subject: string | null; document_page_id: string | null }[], error: null };

  const pageIds = Array.from(new Set((questions ?? []).map((item) => item.document_page_id).filter((id): id is string => Boolean(id))));
  const { data: pages } = pageIds.length
    ? await supabase.from("document_pages").select("id,document_id,page_number,extracted_text,extraction_method")
      .eq("owner_id", user.id).in("id", pageIds)
    : { data: [] as { id: string; document_id: string; page_number: number; extracted_text: string | null; extraction_method: string | null }[] };
  const documentIds = Array.from(new Set((pages ?? []).map((item) => item.document_id)));
  const { data: documents } = documentIds.length
    ? await supabase.from("documents").select("id,file_name,drive_web_view_link")
      .eq("owner_id", user.id).in("id", documentIds)
    : { data: [] as { id: string; file_name: string; drive_web_view_link: string | null }[] };

  const { data: notes, error: noteError } = chapterIds.length
    ? await supabase.from("chapter_note_versions")
      .select("id,catalog_id,chapter_id,version_number,title,content_json,status,supersedes_id,approved_at,created_at")
      .eq("owner_id", user.id).in("chapter_id", chapterIds).order("version_number", { ascending: false })
    : { data: [] as { id: string; catalog_id: string; chapter_id: string; version_number: number; title: string; content_json: import("@/types/database").Json; status: string; supersedes_id: string | null; approved_at: string | null; created_at: string }[], error: null };

  const noteIds = (notes ?? []).map((item) => item.id);
  const { data: sources } = noteIds.length
    ? await supabase.from("chapter_note_sources").select("id,note_version_id,source_kind,question_id,document_page_id,locator")
      .eq("owner_id", user.id).in("note_version_id", noteIds).order("created_at")
    : { data: [] as { id: string; note_version_id: string; source_kind: string; question_id: string | null; document_page_id: string | null; locator: string | null }[] };

  const questionMap = new Map((questions ?? []).map((item) => [item.id, item]));
  const pageMap = new Map((pages ?? []).map((item) => [item.id, item]));
  const documentMap = new Map((documents ?? []).map((item) => [item.id, item]));
  const catalogMap = new Map((catalogs ?? []).map((item) => [item.id, item]));
  const notice = params.create === "saved" ? "Draft saved with its source references."
    : params.create === "source_required" ? "Select at least one question or source page."
    : params.create === "invalid" ? "Some fields were invalid or exceeded their limits."
    : params.create === "save_failed" ? "The draft could not be saved. Check that the chapter and every selected source belong to your account."
    : params.ai === "generated" ? "AI draft generated and saved. Review every claim and source citation before approval."
    : params.ai === "not_configured" ? "AI generation is unavailable: configure AI_API_KEY and AI_MODEL in the server environment."
    : params.ai === "no_sources" ? "No approved questions are available for this chapter. Approve and classify source questions first."
    : params.ai === "source_error" ? "The approved source pages could not be loaded."
    : params.ai === "save_failed" ? "The generated note could not be saved. No draft was created."
    : params.ai === "failed" ? "AI generation failed or returned an invalid note. Check provider configuration and try again."
    : params.ai === "invalid" ? "The chapter selection was invalid."
    : params.status === "updated" ? "Note status updated."
    : params.status === "blocked" ? "The status change was blocked. Approval requires at least one saved source."
    : params.status === "invalid" ? "The requested status change was invalid."
    : null;

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions">
          <Link className="sign-in-link" href="/dashboard/questions">Question bank</Link>
          <Link className="sign-in-link" href="/dashboard/syllabus">Syllabus</Link>
          <Link className="sign-in-link" href="/dashboard">Dashboard</Link>
          <form action={signOut}><button className="signout-button" type="submit">Sign out</button></form>
        </div>
      </header>

      <section className="hero documents-hero">
        <p className="eyebrow">CHAPTER INTELLIGENCE · M6</p>
        <h1>Chapter <span>workspace.</span></h1>
        <p className="hero-copy">Create structured chapter notes from your own question bank and source pages. Each draft keeps immutable source links and a version history. Approval is an owner review step, not an official exam-board certification.</p>
        <div className="hero-actions">
          <Link className="sign-in-link" href="/dashboard/syllabus">Manage syllabus chapters</Link>
          <Link className="sign-in-link" href="/dashboard/questions">Open question bank</Link>
        </div>
      </section>

      {notice ? <p className="notice notice-info" role="status">{notice}</p> : null}
      {catalogError || chapterError || questionError || noteError ? <p className="notice notice-error">Some chapter workspace data could not be loaded. Refresh or check the database connection.</p> : null}

      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">YOUR KNOWLEDGE BASE</p><h2>Chapter notes</h2></div><div className="hero-actions"><span className="section-count">{notes?.length ?? 0} versions · {chapters?.length ?? 0} chapters</span>{notes?.length ? <PrintNotesButton /> : null}</div></div>
        {!catalogs?.length ? (
          <div className="empty-state"><h3>No syllabus catalogue yet</h3><p>Create a syllabus version and add chapters before building chapter notes. The workspace will not invent syllabus structure.</p><Link className="primary-action" href="/dashboard/syllabus">Create syllabus catalogue →</Link></div>
        ) : !chapters?.length ? (
          <div className="empty-state"><h3>No chapters in your catalogue</h3><p>Add chapter records to a syllabus version first. Then return here to create source-linked notes.</p><Link className="primary-action" href="/dashboard/syllabus">Add chapters →</Link></div>
        ) : (
          <div className="chapter-workspace-list">
            {(chapters ?? []).map((chapter) => {
              const catalog = catalogMap.get(chapter.catalog_id);
              const chapterQuestions = (questions ?? []).filter((item) => item.syllabus_chapter_id === chapter.id);
              const chapterNotes = (notes ?? []).filter((item) => item.chapter_id === chapter.id);
              const chapterPageIds = new Set(chapterQuestions.map((q) => q.document_page_id).filter((id): id is string => Boolean(id)));
              const chapterPages = (pages ?? []).filter((page) => chapterPageIds.has(page.id));
              return (
                <article className="chapter-workspace-card" key={chapter.id}>
                  <div className="question-card-heading">
                    <span className="document-status">{catalog?.status ?? "catalogue"}</span>
                    <span className="question-subject">{catalog?.board} · {catalog?.subject} · {catalog?.version}</span>
                  </div>
                  <h3>{chapter.chapter_code ? chapter.chapter_code + " · " : ""}{chapter.title}</h3>
                  <p className="question-card-meta">{chapterQuestions.length} linked questions · {chapterNotes.length} note versions</p>

                  <details className="chapter-note-author">
                    <summary>Create a source-linked note or revision</summary>
                    <form action={createChapterNoteDraft} className="review-form">
                      <input type="hidden" name="catalogId" value={chapter.catalog_id} />
                      <input type="hidden" name="chapterId" value={chapter.id} />
                      <div className="question-fields">
                        <label>Note title<input name="title" required maxLength={200} placeholder="e.g. Forces and motion — revision notes" /></label>
                        <label>Revision of (optional)<select name="supersedesId" defaultValue=""><option value="">New note series</option>{chapterNotes.map((note) => <option key={note.id} value={note.id}>v{note.version_number} · {note.title}</option>)}</select></label>
                      </div>
                      <label>Chapter summary<textarea name="summary" rows={3} maxLength={4000} placeholder="Write a concise explanation of the chapter." /></label>
                      <div className="question-fields">
                        <label>Key concepts (one per line)<textarea name="concepts" rows={4} maxLength={8000} placeholder="Newton's first law&#10;Resultant force&#10;Inertia" /></label>
                        <label>Formulas (one per line)<textarea name="formulas" rows={4} maxLength={5000} placeholder="F = ma&#10;W = mg" /></label>
                        <label>Worked examples (one per line)<textarea name="workedExamples" rows={4} maxLength={10000} placeholder="Question setup → method → final result" /></label>
                      </div>
                      <label>Revision prompts (one per line)<textarea name="revisionPrompts" rows={3} maxLength={5000} placeholder="Explain why ...&#10;Calculate ... when ..." /></label>

                      <div className="chapter-source-picker">
                        <strong>Attach source questions</strong>
                        {chapterQuestions.length ? chapterQuestions.map((question) => (
                          <label className="chapter-source-option" key={question.id}>
                            <input type="checkbox" name="questionIds" value={question.id} />
                            <span>{question.question_number ? question.question_number + ". " : ""}{question.question_text.slice(0, 260)}</span>
                          </label>
                        )) : <p className="question-card-meta">No questions are linked to this chapter yet. Classify questions in the question bank first.</p>}
                      </div>

                      {chapterPages.length ? <div className="chapter-source-picker">
                        <strong>Attach source document pages</strong>
                        {chapterPages.map((page) => {
                          const doc = documentMap.get(page.document_id);
                          return <label className="chapter-source-option" key={page.id}>
                            <input type="checkbox" name="documentPageIds" value={page.id} />
                            <span>{doc?.file_name ?? "Source document"} · page {page.page_number}{page.extracted_text ? " — " + page.extracted_text.slice(0, 180) : ""}</span>
                          </label>;
                        })}
                      </div> : null}

                      <p className="question-card-meta">At least one source question or page is required. Manual drafts remain available alongside AI-generated drafts.</p>
                      <button className="primary-action" type="submit">Save chapter note draft →</button>
                    </form>
                  </details>

                  {chapterNotes.length ? <div className="chapter-note-history">
                    <h4>Version history</h4>
                    {chapterNotes.map((note) => {
                      const content = note.content_json as unknown as NoteContent;
                      const noteSources = (sources ?? []).filter((source) => source.note_version_id === note.id);
                      return <article className="chapter-note-version" data-note-id={note.id} key={note.id}>
                        <div className="question-card-heading"><strong>v{note.version_number} · {note.title}</strong><span className="document-status">{note.status}</span></div><div className="hero-actions"><PrintNotesButton noteId={note.id} /></div>
                        {content.generatedBy === "ai" ? <p className="question-card-meta">AI-generated draft · not independently verified · owner review required</p> : null}
                        {content.summary ? <p className="chapter-note-summary">{content.summary}</p> : null}
                        <ContentList title="Key concepts" items={content.concepts} />
                        <FormulaList items={content.formulas} />
                        <ContentList title="Worked examples" items={content.workedExamples} />
                        <ContentList title="Revision prompts" items={content.revisionPrompts} />
                        {content.sourceReferences?.length ? <div className="chapter-note-sources"><strong>AI citation key</strong>{content.sourceReferences.map((reference) => { const question = questionMap.get(reference.questionId); const page = reference.pageId ? pageMap.get(reference.pageId) : null; const doc = page ? documentMap.get(page.document_id) : null; return <div className="chapter-note-citation" key={reference.ref}><p><strong>[{reference.ref}]</strong> {question?.question_number ? "Question " + question.question_number : "Approved question"}{doc ? " · " + doc.file_name : ""}{reference.pageNumber ? " · page " + reference.pageNumber : ""}{reference.extractionMethod ? " · " + reference.extractionMethod : ""}</p>{page?.extracted_text ? <><p className="chapter-note-source-preview">{page.extracted_text.slice(0, 360)}{page.extracted_text.length > 360 ? "…" : ""}</p><details className="chapter-note-source-full"><summary>Read full extracted page text</summary><pre>{page.extracted_text}</pre></details></> : <p className="chapter-note-source-preview">No extracted page text was available for this source.</p>}</div>; })}</div> : null}
                        <div className="chapter-note-sources"><strong>Sources ({noteSources.length})</strong>
                          {noteSources.map((source) => {
                            const question = source.question_id ? questionMap.get(source.question_id) : null;
                            const page = source.document_page_id ? pageMap.get(source.document_page_id) : null;
                            const doc = page ? documentMap.get(page.document_id) : null;
                            return <p key={source.id}>{source.source_kind === "question" ? "Question: " + (question?.question_text.slice(0, 180) ?? "Saved question") : "Document: " + (doc?.file_name ?? "Source document") + " · page " + (page?.page_number ?? "?")}</p>;
                          })}
                        </div>
                        {note.supersedes_id ? <p className="question-card-meta">Revision of an earlier version.</p> : null}
                        {note.status === "draft" ? <div className="question-review-actions">
                          <form action={updateChapterNoteStatus}><input type="hidden" name="noteId" value={note.id} /><input type="hidden" name="status" value="approved" /><button className="document-action" type="submit">Approve reviewed draft</button></form>
                          <form action={updateChapterNoteStatus}><input type="hidden" name="noteId" value={note.id} /><input type="hidden" name="status" value="archived" /><button className="document-action document-action-muted" type="submit">Archive</button></form>
                        </div> : note.status === "approved" ? <form action={updateChapterNoteStatus}><input type="hidden" name="noteId" value={note.id} /><input type="hidden" name="status" value="archived" /><button className="document-action document-action-muted" type="submit">Archive approved version</button></form> : null}
                      </article>;
                    })}
                  </div> : <div className="empty-state chapter-empty"><h4>No notes yet</h4><p>Create the first source-linked draft for this chapter when you have reviewed questions or source pages.</p></div>}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
