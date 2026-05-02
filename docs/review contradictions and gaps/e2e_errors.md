  1) [chromium] › e2e\svod.spec.ts:168:3 › Summary page (/svod) › division filter shows real division names as pill buttons 

    Error: expect(locator).toBeVisible() failed

    Locator: getByRole('button', { name: /Updated Division Name/ })
    Expected: visible
    Timeout: 8000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 8000ms
      - waiting for getByRole('button', { name: /Updated Division Name/ })


      174 |     await expect(
      175 |       page.getByRole('button', { name: new RegExp(seededDivisionName) })
    > 176 |     ).toBeVisible()
          |       ^
      177 |   })
      178 |
      179 |   // Checklist 2.5 — Export XLSX button present
        at C:\Work\Study\Projects\workload_calculation_system\frontend\e2e\svod.spec.ts:176:7

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results\svod-Summary-page-svod-div-3d168-ision-names-as-pill-buttons-chromium\test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results\svod-Summary-page-svod-div-3d168-ision-names-as-pill-buttons-chromium\video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results\svod-Summary-page-svod-div-3d168-ision-names-as-pill-buttons-chromium\error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results\svod-Summary-page-svod-div-3d168-ision-names-as-pill-buttons-chromium\trace.zip
    Usage:

        npx playwright show-trace test-results\svod-Summary-page-svod-div-3d168-ision-names-as-pill-buttons-chromium\trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  2) [chromium] › e2e\svod.spec.ts:256:3 › Summary page (/svod) › division filter scopes results and clearing restores all rows 

    Error: expect(locator).toBeVisible() failed

    Locator: getByRole('button', { name: /Updated Division Name/ })
    Expected: visible
    Timeout: 8000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 8000ms
      - waiting for getByRole('button', { name: /Updated Division Name/ })


      261 |
      262 |     const divisionPill = page.getByRole('button', { name: new RegExp(seededDivisionName) })
    > 263 |     await expect(divisionPill).toBeVisible()
          |                                ^
      264 |
      265 |     const totalBefore = await page.getByRole('row').count()
      266 |
        at C:\Work\Study\Projects\workload_calculation_system\frontend\e2e\svod.spec.ts:263:32

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results\svod-Summary-page-svod-div-4f798--clearing-restores-all-rows-chromium\test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results\svod-Summary-page-svod-div-4f798--clearing-restores-all-rows-chromium\video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results\svod-Summary-page-svod-div-4f798--clearing-restores-all-rows-chromium\error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results\svod-Summary-page-svod-div-4f798--clearing-restores-all-rows-chromium\trace.zip
    Usage:

        npx playwright show-trace test-results\svod-Summary-page-svod-div-4f798--clearing-restores-all-rows-chromium\trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  2 failed
    [chromium] › e2e\svod.spec.ts:168:3 › Summary page (/svod) › division filter shows real division names as pill buttons 
    [chromium] › e2e\svod.spec.ts:256:3 › Summary page (/svod) › division filter scopes results and clearing restores all rows 
  8 skipped
  48 passed (4.1m)