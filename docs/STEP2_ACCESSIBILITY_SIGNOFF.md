# CareerOS Step 2 — manual accessibility sign-off

**Status: NOT EXECUTED.** This checklist is for a protected staging environment with disposable real accounts. Automated CI cannot claim a human screen-reader pass.

## Environments

- Browser desktop Chromium with keyboard only, 200% and 400% zoom.
- Browser mobile Safari/VoiceOver and/or Android Chrome/TalkBack.
- Desktop VoiceOver (macOS) or NVDA (Windows).
- 320 CSS pixel responsive viewport; 375 and 768 pixel visual checks.
- Use only disposable staging accounts A and B; do not test on live customer data.

## Key journeys

1. Sign in, navigate with Tab/Shift+Tab and Enter/Space, and find a visible keyboard focus on every action.
2. Activate **Skip to main content**, verify focus movement lands on the main application content and navigation is not trapped.
3. Open and close the mobile navigation using keyboard/screen reader; verify links expose meaningful names, active page state and touch targets.
4. Open a new Career Vault record form, enter data, trigger missing required fields/errors, then save and edit an existing record; errors and success announcements must be understandable and correctly associated with controls.
5. Load Career Vault with zero records and multiple records; category/record counts and filters must be spoken accurately, and headings must have coherent hierarchy.
6. Import a text PDF and a DOCX in the browser; observe an extraction status message, understandable extraction failure, labeled preview field, required consent checkboxes and length limits.
7. Approve/reject suggestions; distinguish unreviewed from confirmed facts without relying on color alone. After approval, ensure focus and screen-reader reading order remain usable despite server refresh.
8. Inspect account/Vault exports and intentionally open, **but do not submit**, irreversible clearing/deletion controls; verify the warnings, checkbox names and cancel actions.
9. Test text reflow without horizontal page scrolling at 320 pixels / 400% zoom and contrast in light/dark themes.
10. Confirm reduced-motion preferences and accessibility for sign-out, login error and session expiry.

## Recording evidence

For each browser/screen-reader combination, record: date/time, build commit, disposable environment reference, tester, observed pass/fail, steps to reproduce, screenshot or issue ID **without any private applicant data or passwords**, severity and retest outcome.

**Release acceptance:** Zero critical/high severity keyboard, focus, name/role/value, privacy announcement or reflow defects; documented owner sign-off. Automated Playwright focus/overflow checks in `tests/e2e/staging-career-vault.spec.ts` are a starting point, not an independent WCAG conformance audit. Do not claim compliance until a qualified manual audit and remediation are complete.
