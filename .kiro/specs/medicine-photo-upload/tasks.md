# Implementation Plan: Medicine Photo Upload

## Overview

Implement the `MedicinePhotoUpload` feature as four TypeScript files under `apps/web/components/medicine/`. The work proceeds in dependency order: pure validation utility first, then the XHR upload hook, then the React component tree, and finally the barrel export. Property-based tests (fast-check) cover the pure validator; unit tests cover the hook; integration tests cover the assembled component.

## Tasks

- [ ]   1. Create `validateMedicineFile` utility
    - Create `apps/web/components/medicine/validateMedicineFile.ts`
    - Define the `ValidationResult` discriminated union type (`{ valid: true } | { valid: false; error: string }`)
    - Implement the pure function: check `file.type` against `{"image/jpeg","image/png","image/webp"}` and `file.size` against `5 * 1024 * 1024` bytes
    - Return `{ valid: false, error: "Only JPG, PNG, and WebP images are supported." }` for bad MIME type
    - Return `{ valid: false, error: "File is too large. Maximum size is 5 MB (your file: X.X MB)." }` for oversized files, including the actual size in MB to one decimal place
    - Return `{ valid: true }` when both checks pass
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

    - [ ]\* 1.1 Write property tests for `validateMedicineFile`
        - Create `apps/web/components/medicine/__tests__/validateMedicineFile.test.ts`
        - **Property 1: Validation type safety** — for any `{ type, size }`, the result is always `{ valid: true }` or `{ valid: false, error: <non-empty string> }`; the function never throws
        - **Validates: Requirements 2.1, 2.3, 2.5**
        - **Property 2: No upload on invalid file (type axis)** — for any MIME type not in the allowed set, `validateMedicineFile` returns `{ valid: false }`
        - **Validates: Requirements 2.1, 2.2**
        - **Property 3: Files over 5 MB always fail** — for any size > 5 × 1 048 576, `validateMedicineFile` returns `{ valid: false }`
        - **Validates: Requirements 2.3, 2.4**
        - Also add example-based unit tests: exact 5 MB boundary (`valid: true`), 5 MB + 1 byte (`valid: false`), `image/webp` at 0 bytes (`valid: true`), `image/gif` (`valid: false`)
        - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]   2. Create `useUpload` hook
    - Create `apps/web/components/medicine/useUpload.ts`
    - Define the `UploadState` discriminated union: `idle | uploading | success | error`
    - Define the `UseUploadReturn` interface with `state`, `upload`, `reset`, and `cancel`
    - Implement `upload(file)`: guard with `state.status !== "idle"` no-op check; set state to `{ status: "uploading", progress: 0 }`; build `FormData`; open XHR to `POST /api/upload`; wire `xhr.upload.onprogress` to compute `Math.round((event.loaded / event.total) * 100)` when `lengthComputable`; resolve on `xhr.onload` with status 200–299; reject with server error message on non-2xx; reject with `"Network error during upload"` on `xhr.onerror`; reject with `"Upload cancelled"` on `xhr.onabort`; on success set `{ status: "success", secureUrl }` and call `onUploadComplete`; on failure set `{ status: "error", message }`
    - Store the active XHR in a `useRef` so `reset()` and `cancel()` can call `xhr.abort()`
    - Implement `reset()`: call `xhrRef.current?.abort()`, set `xhrRef.current = null`, set state to `idle`
    - Implement `cancel()`: call `xhrRef.current?.abort()`, set `xhrRef.current = null`, set state to `idle`
    - Add a `useEffect` cleanup that calls `xhrRef.current?.abort()` on unmount
    - _Requirements: 1.1, 3.2, 5.1, 5.2, 5.4, 6.3, 6.4, 12.1, 12.2, 12.3, 12.4, 14.3_

    - [ ]\* 2.1 Write unit tests for `useUpload`
        - Create `apps/web/components/medicine/__tests__/useUpload.test.ts`
        - Mock `XMLHttpRequest` (jest fake or manual mock)
        - Test state transitions: `idle → uploading → success`
        - Test state transitions: `idle → uploading → error` (non-2xx response)
        - Test state transitions: `idle → uploading → error` (network error via `onerror`)
        - Test `onUploadComplete` is called exactly once on success and never on failure or cancellation
        - Test `reset()` aborts in-flight XHR and returns state to `idle`
        - Test `cancel()` aborts in-flight XHR and returns state to `idle`
        - Test `upload()` is a no-op when `state.status !== "idle"`
        - Test unmount cleanup aborts in-flight XHR
        - _Requirements: 1.1, 5.1, 5.2, 5.4, 12.1, 12.2, 12.3, 14.3_

- [ ]   3. Checkpoint — Ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

- [ ]   4. Implement `MedicinePhotoUpload` component
    - Create `apps/web/components/medicine/MedicinePhotoUpload.tsx` with `"use client"` directive
    - Define `MedicinePhotoUploadProps` interface: `onUploadComplete`, optional `onError`, optional `label`, optional `disabled`
    - Implement `UploadDropzone` internal sub-component:
        - Render a styled `<div>` with `tabIndex={0}`, `aria-label`, and `aria-disabled` when disabled
        - Include a visually-hidden `<label htmlFor={inputId}>` and a hidden `<input type="file" id={inputId} accept="image/jpeg,image/png,image/webp" capture="environment" aria-hidden="true" tabIndex={-1}>` — no `multiple` attribute
        - Handle `keydown` for `Enter` and `Space` to programmatically trigger the file input
        - Handle `dragover` (call `preventDefault`, apply highlight class), `dragleave` (remove highlight), and `drop` (call `preventDefault`, extract `files[0]`, ignore rest)
        - Ignore all drag-and-drop events and disable input when `disabled === true`
        - _Requirements: 7.1, 7.2, 7.3, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 11.1, 11.2, 11.3_
    - Implement `UploadProgressBar` internal sub-component:
        - Render a `<div role="progressbar" aria-label="Upload progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>`
        - Render an animated inner bar with width proportional to `progress`
        - Show percentage text alongside the bar
        - _Requirements: 3.1, 3.3, 9.10_
    - Implement `ImagePreview` internal sub-component:
        - Render `<img src={src} alt="Uploaded medicine packaging">`
        - Render a remove button with `aria-label="Remove uploaded photo"` that calls `onRemove`
        - _Requirements: 4.1, 4.2, 4.3, 4.4, 9.11_
    - Wire `MedicinePhotoUpload` together:
        - Call `useUpload(onUploadComplete)` to get `state`, `upload`, `reset`, `cancel`
        - On file selected (from dropzone or input change): call `validateMedicineFile(file)`; if invalid, set error state and call `onError` if provided; if valid, call `upload(file)`
        - Render `UploadDropzone` when `state.status === "idle"` or `state.status === "error"`
        - Render `UploadProgressBar` with `state.progress` when `state.status === "uploading"`
        - Render a cancel button during upload that calls `cancel()`
        - Render `ImagePreview` with `state.secureUrl` when `state.status === "success"`; `onRemove` calls `reset()`
        - Render inline error message with `role="alert"` and a "Try again" button with `aria-label="Try uploading again"` when `state.status === "error"`; "Try again" calls `reset()`
        - Render `<div aria-live="polite">` status region with: `"Uploading… {progress}%"` during upload, `"Upload complete"` on success, `"Upload failed: {message}"` on error, `""` on idle
        - Disable file input and upload button while `state.status === "uploading"`
        - _Requirements: 1.1, 3.1, 4.1, 4.3, 5.1, 6.1, 6.2, 6.3, 6.4, 6.6, 6.7, 9.5, 9.6, 9.7, 9.8, 9.9, 9.12, 11.3, 12.4, 13.2, 13.3, 14.1, 14.2_

    - [ ]\* 4.1 Write integration tests for `MedicinePhotoUpload`
        - Create `apps/web/components/medicine/__tests__/MedicinePhotoUpload.test.tsx`
        - Use Jest + `@testing-library/react` with jsdom; mock `XMLHttpRequest`
        - Test happy path: simulate file selection → assert progress bar appears → mock XHR success → assert image preview renders → assert `onUploadComplete` called with mocked URL
        - Test validation failure: simulate selection of a PDF → assert error message renders with `role="alert"` → assert no XHR is opened
        - Test oversized file: simulate selection of a 6 MB file → assert error message includes actual size
        - Test "Try again" button: after error, click "Try again" → assert component returns to idle state
        - Test cancel: simulate file selection → mock XHR in-progress → click cancel → assert state returns to idle → assert `onUploadComplete` not called
        - Test drag-and-drop: simulate `dragover` → assert highlight class applied; simulate `drop` with a valid file → assert upload initiated
        - Test disabled state: render with `disabled={true}` → assert `aria-disabled="true"` on dropzone → assert drag-and-drop events ignored
        - Test aria-live region: assert region contains `"Uploading… 0%"` during upload, `"Upload complete"` on success, `"Upload failed: …"` on error, `""` after reset
        - Test server error: mock XHR returning HTTP 500 with `{ error: "Upload service unavailable" }` → assert error message displayed
        - _Requirements: 1.1, 2.6, 3.1, 4.1, 5.1, 5.2, 6.1, 6.2, 6.3, 6.4, 6.6, 6.7, 9.5, 9.6, 9.7, 9.8, 12.2, 12.4, 13.2_

- [ ]   5. Create barrel export
    - Create `apps/web/components/medicine/index.ts`
    - Export `MedicinePhotoUpload` as a named export: `export { MedicinePhotoUpload } from "./MedicinePhotoUpload"`
    - Export `validateMedicineFile` and `ValidationResult` for consumers that need the validator directly
    - Export `UploadState` type for parent components that need to type-check the callback
    - _Requirements: 5.1_

- [ ]   6. Final checkpoint — Ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical boundaries
- Property tests (fast-check) validate universal correctness properties of the pure validator
- Unit tests validate the hook's state machine and XHR lifecycle
- Integration tests validate the assembled component end-to-end
- The `/api/upload` route is already implemented — no changes needed there
- No new runtime dependencies: uses `XMLHttpRequest`, `lucide-react`, and `tailwindcss`, all already in the project
