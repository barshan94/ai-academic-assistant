# Accessibility acceptance

Status: automated keyboard/mobile smoke checks are not equivalent to full accessibility acceptance. Screen-reader, contrast and real-device checks remain **NOT RUN** until recorded by a human tester.

## Automated baseline

Run the repository's existing lint, typecheck, unit and browser smoke checks during the approved testing phase. Preserve their output with the tested commit SHA. Automated scans are useful regression signals, not proof of WCAG conformance.

## Manual acceptance scope

Test the sign-in, dashboard, document upload/OCR correction, question creation, answer generation, syllabus catalogue, review queue, teacher invitation/review and settings flows.

### Keyboard-only

- Complete every critical flow without a pointer.
- Verify logical Tab/Shift+Tab order and no keyboard traps.
- Verify visible focus is not obscured by sticky headers, dialogs or mobile navigation.
- Verify Enter/Space activation, Escape dismissal and arrow-key behavior for any composite widgets.
- Verify dialogs move focus inside on open, keep focus contained while modal, and return focus to the invoking control on close.
- Verify validation errors are announced and focus can reach the first invalid field.
- Verify upload, save, processing, success and failure states are available without hover.

### Screen reader

Test at minimum one desktop pairing (NVDA with Firefox or Chrome) and one mobile pairing (TalkBack with Android Chrome; add VoiceOver/Safari if iOS is a supported target).

- Verify page title, landmarks, headings and navigation labels communicate the page structure.
- Verify every form control has a programmatic name, role, state and helpful error text.
- Verify buttons and icon-only controls have meaningful accessible names.
- Verify dynamic status, upload progress, OCR state, generated-answer completion and errors are announced without forcing focus.
- Verify tables identify header relationships and meaningful row/column context.
- Verify dialogs, menus and tabs expose correct semantics and keyboard operation.
- Verify Bengali and English text use appropriate language metadata where practicable; ensure math/equations have a meaningful text alternative or documented limitation.
- Verify reading order matches visual and task order; decorative imagery is ignored.

### Contrast and visual presentation

- Measure text contrast against its actual rendered background: 4.5:1 for normal text and 3:1 for large text.
- Measure meaningful non-text controls, focus indicators and graphical state indicators against adjacent colors at 3:1 where WCAG requires it.
- Check hover, focus, disabled, error, success and selected states; do not rely on color alone.
- Check zoom/reflow at 200% and narrow viewport widths without loss of content or functionality.
- Check reduced-motion preference and avoid essential information conveyed only by animation.

### Real-device checks

Use at least one current Android phone with TalkBack and touch exploration. Check portrait and landscape where supported, browser zoom, touch target size, virtual keyboard overlap, file picker, camera/image selection, long content scrolling and network interruption. Record device model, OS version, browser version, assistive technology version and tested build.

## Defect severity

- **Blocker:** critical workflow impossible for a keyboard or screen-reader user; focus trap; inaccessible authentication or destructive action.
- **High:** missing names/roles/states, unannounced critical status/errors, severe contrast or reflow failure.
- **Medium:** confusing reading order, redundant announcements, minor navigation inconsistency.
- **Low:** cosmetic issues that do not materially impede use.

No critical or high issue may remain open for release. Record each defect with reproducible steps, affected component, assistive technology/device, severity, owner and retest evidence.

## Acceptance record

| Platform / test | Tester | Build/commit | Result |
| --- | --- | --- | --- |
| Keyboard-only critical flows | NOT ASSIGNED | | NOT RUN |
| NVDA desktop screen reader | NOT ASSIGNED | | NOT RUN |
| TalkBack Android screen reader | NOT ASSIGNED | | NOT RUN |
| Contrast measurements | NOT ASSIGNED | | NOT RUN |
| 200% zoom and reflow | NOT ASSIGNED | | NOT RUN |
| Real Android device acceptance | NOT ASSIGNED | | NOT RUN |

Do not mark this document complete merely because automated accessibility or keyboard smoke tests pass. A named tester must complete the matrix and attach sanitized evidence.
