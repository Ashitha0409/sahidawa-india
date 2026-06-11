# Requirements Document

## Introduction

The `medicine-photo-upload` feature provides a reusable, accessible React component (`MedicinePhotoUpload`) that allows citizens to photograph or select medicine packaging images and upload them to Cloudinary for downstream AI-powered fake medicine detection. The component integrates with the existing `/api/upload` Next.js route, validates files client-side before upload, tracks real-time upload progress via `XMLHttpRequest`, displays a post-upload image preview, and returns the Cloudinary secure URL to the parent component via a callback. The component supports mobile camera capture, desktop drag-and-drop, keyboard navigation, and meets WCAG 2.1 AA accessibility standards.

## Glossary

- **MedicinePhotoUpload**: The top-level exported React component that orchestrates file selection, validation, upload, progress display, preview, and error handling.
- **UploadDropzone**: Internal sub-component that renders the interactive drop/select area in the `idle` state.
- **UploadProgressBar**: Internal sub-component that renders an animated progress bar during upload.
- **ImagePreview**: Internal sub-component that displays the uploaded image and a remove/re-upload action.
- **Validator**: The `validateMedicineFile` pure function that checks file MIME type and size.
- **Upload_Route**: The existing Next.js API route at `/api/upload` that signs and forwards upload requests to Cloudinary.
- **useUpload**: The React hook that manages the upload state machine and `XMLHttpRequest` lifecycle.
- **UploadState**: The discriminated union type representing the component's upload lifecycle: `idle | uploading | success | error`.
- **Cloudinary**: The third-party image storage and CDN service used to store uploaded medicine photos.
- **onUploadComplete**: The parent-supplied callback invoked with the Cloudinary `secure_url` after a successful upload.
- **XHR**: `XMLHttpRequest` — the browser API used for upload requests to enable real-time progress events and request cancellation.

---

## Requirements

### Requirement 1: File Upload via Cloudinary

**User Story:** As a citizen, I want to upload a medicine photo to Cloudinary through the app, so that the AI pipeline can analyse the image for fake medicine detection.

#### Acceptance Criteria

1. WHEN a user submits a valid image file, THE MedicinePhotoUpload component SHALL POST the file to `/api/upload` as `multipart/form-data` using `XMLHttpRequest`.
2. WHEN the Upload_Route receives a file, THE Upload_Route SHALL generate a SHA-1 HMAC signature server-side and forward the file to the Cloudinary REST API.
3. WHEN Cloudinary returns a successful response, THE Upload_Route SHALL return `{ secure_url }` to the client with HTTP 200.
4. IF the Upload_Route cannot reach Cloudinary or Cloudinary returns an error, THEN THE Upload_Route SHALL return a JSON error response with the appropriate HTTP status code.
5. THE Upload_Route SHALL read Cloudinary credentials exclusively from server-side environment variables (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).

---

### Requirement 2: Client-Side Validation

**User Story:** As a citizen, I want the app to check my file before uploading, so that I receive immediate feedback if I select an unsupported or oversized file without wasting bandwidth.

#### Acceptance Criteria

1. WHEN a user selects a file, THE Validator SHALL check that the file's MIME type is one of `image/jpeg`, `image/png`, or `image/webp`.
2. IF the file's MIME type is not in the allowed set, THEN THE Validator SHALL return `{ valid: false, error: "Only JPG, PNG, and WebP images are supported." }`.
3. WHEN a user selects a file, THE Validator SHALL check that the file size does not exceed 5 MB (5 × 1,048,576 bytes).
4. IF the file size exceeds 5 MB, THEN THE Validator SHALL return `{ valid: false, error }` where the error message includes the actual file size in MB.
5. WHEN a file passes both type and size checks, THE Validator SHALL return `{ valid: true }`.
6. IF validation returns `{ valid: false }`, THEN THE MedicinePhotoUpload component SHALL NOT initiate any network request.

---

### Requirement 3: Upload Progress Indicator

**User Story:** As a citizen, I want to see upload progress while my photo is being sent, so that I know the upload is proceeding and can estimate when it will complete.

#### Acceptance Criteria

1. WHILE an upload is in progress, THE MedicinePhotoUpload component SHALL display the `UploadProgressBar` component showing the current upload percentage (0–100).
2. WHEN the XHR `progress` event fires with `lengthComputable === true`, THE useUpload hook SHALL update the upload progress to `Math.round((event.loaded / event.total) * 100)`.
3. THE UploadProgressBar SHALL render with `role="progressbar"`, `aria-label="Upload progress"`, `aria-valuenow` set to the current progress integer, `aria-valuemin={0}`, and `aria-valuemax={100}`.

---

### Requirement 4: Image Preview After Successful Upload

**User Story:** As a citizen, I want to see the uploaded photo after it has been sent, so that I can confirm the correct image was uploaded before the AI analysis begins.

#### Acceptance Criteria

1. WHEN an upload succeeds, THE MedicinePhotoUpload component SHALL transition to `success` state and display the `ImagePreview` component using the Cloudinary `secure_url` as the image source.
2. THE ImagePreview component SHALL render an `<img>` element with `alt="Uploaded medicine packaging"`.
3. WHEN the user activates the remove button in the `ImagePreview`, THE MedicinePhotoUpload component SHALL reset state to `idle` and clear the preview.
4. THE ImagePreview remove button SHALL have `aria-label="Remove uploaded photo"`.

---

### Requirement 5: onUploadComplete Callback

**User Story:** As a developer integrating this component, I want to receive the Cloudinary URL after a successful upload, so that I can pass it to the AI detection pipeline.

#### Acceptance Criteria

1. WHEN an upload succeeds, THE MedicinePhotoUpload component SHALL call `onUploadComplete` exactly once with the Cloudinary `secure_url` string.
2. IF an upload fails due to a network error or server error, THEN THE MedicinePhotoUpload component SHALL NOT call `onUploadComplete`.
3. IF validation fails, THEN THE MedicinePhotoUpload component SHALL NOT call `onUploadComplete`.
4. IF an upload is cancelled, THEN THE MedicinePhotoUpload component SHALL NOT call `onUploadComplete`.
5. WHEN `onUploadComplete` is called, THE MedicinePhotoUpload component SHALL pass a non-empty string beginning with `"https://res.cloudinary.com/"`.

---

### Requirement 6: Error Handling

**User Story:** As a citizen, I want clear error messages when something goes wrong, so that I understand what happened and know how to recover.

#### Acceptance Criteria

1. WHEN a file with an unsupported MIME type is selected, THE MedicinePhotoUpload component SHALL transition to `error` state and display the validation error message inline.
2. WHEN a file exceeding 5 MB is selected, THE MedicinePhotoUpload component SHALL transition to `error` state and display the validation error message inline.
3. WHEN a network error occurs during upload, THE MedicinePhotoUpload component SHALL transition to `error` state with the message `"Network error during upload"`.
4. WHEN the Upload_Route returns a non-2xx HTTP response, THE MedicinePhotoUpload component SHALL transition to `error` state and display the server-provided error message.
5. IF `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, or `CLOUDINARY_API_SECRET` are not set in the server environment, THEN THE Upload_Route SHALL return HTTP 500 with `{ error: "Server is missing Cloudinary credentials." }`.
6. WHEN an error is displayed, THE MedicinePhotoUpload component SHALL render the error message container with `role="alert"` so that screen readers announce the error immediately.
7. WHEN an error is displayed, THE MedicinePhotoUpload component SHALL show a "Try again" button that allows the user to manually retry.

---

### Requirement 7: Mobile Camera Capture Support

**User Story:** As a citizen using a mobile device, I want to use my camera directly to photograph medicine packaging, so that I do not need to navigate to a photo gallery.

#### Acceptance Criteria

1. THE UploadDropzone file input SHALL have `accept="image/jpeg,image/png,image/webp"` to restrict the file picker to supported image types.
2. THE UploadDropzone file input SHALL have `capture="environment"` to invoke the rear-facing camera on mobile devices.
3. THE UploadDropzone file input SHALL NOT have the `multiple` attribute, enforcing single-file selection.

---

### Requirement 8: Drag-and-Drop Support on Desktop

**User Story:** As a citizen on a desktop browser, I want to drag and drop a medicine photo onto the upload area, so that I can upload without using the file picker dialog.

#### Acceptance Criteria

1. WHEN a user drags a file over the `UploadDropzone`, THE UploadDropzone SHALL call `event.preventDefault()` and apply a visual highlight to indicate the drop target is active.
2. WHEN a user's drag leaves the `UploadDropzone` boundary, THE UploadDropzone SHALL remove the visual highlight.
3. WHEN a user drops one or more files onto the `UploadDropzone`, THE UploadDropzone SHALL call `event.preventDefault()`, extract `event.dataTransfer.files[0]`, and pass it to the validation pipeline.
4. WHEN a user drops multiple files, THE UploadDropzone SHALL process only the first file (`files[0]`) and silently discard the remaining files.
5. WHILE the component is disabled, THE UploadDropzone SHALL ignore all drag-and-drop events and not process any dropped files.

---

### Requirement 9: WCAG 2.1 AA Accessibility

**User Story:** As a citizen using assistive technology or keyboard navigation, I want the upload component to be fully accessible, so that I can use it without a mouse or visual display.

#### Acceptance Criteria

1. THE UploadDropzone SHALL have `tabIndex={0}` and respond to `keydown` events for `Enter` and `Space` by programmatically triggering the hidden file input.
2. THE UploadDropzone SHALL have an `aria-label` attribute describing its purpose (e.g. `"Upload medicine photo — click or drag and drop"`).
3. WHEN the component is disabled, THE UploadDropzone SHALL have `aria-disabled="true"`.
4. THE hidden file input SHALL have an associated visually-hidden `<label>` element linked via `htmlFor` to the input's `id`.
5. THE MedicinePhotoUpload component SHALL render a region with `aria-live="polite"` that reflects the current upload status for screen reader announcement.
6. WHEN the upload state is `uploading`, THE aria-live region SHALL contain text in the form `"Uploading… {progress}%"`.
7. WHEN the upload state is `success`, THE aria-live region SHALL contain the text `"Upload complete"`.
8. WHEN the upload state is `error`, THE aria-live region SHALL contain text in the form `"Upload failed: {message}"`.
9. WHEN the upload state returns to `idle`, THE aria-live region SHALL be cleared to an empty string.
10. THE UploadProgressBar SHALL have `role="progressbar"`, `aria-label="Upload progress"`, `aria-valuenow`, `aria-valuemin={0}`, and `aria-valuemax={100}` as specified in Requirement 3.
11. THE ImagePreview remove button SHALL have `aria-label="Remove uploaded photo"` as specified in Requirement 4.
12. THE "Try again" button in the error state SHALL have `aria-label="Try uploading again"`.

---

### Requirement 10: No Hardcoded API Keys

**User Story:** As a security-conscious operator, I want all Cloudinary credentials to come from environment variables, so that no secrets are ever committed to source control or exposed to the browser.

#### Acceptance Criteria

1. THE Upload_Route SHALL read `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` from server-side environment variables only.
2. THE MedicinePhotoUpload component SHALL NOT read, reference, or expose `CLOUDINARY_API_KEY` or `CLOUDINARY_API_SECRET` in any client-side code.
3. THE project SHALL document all required Cloudinary environment variables in `.env.example` with placeholder values.

---

### Requirement 11: Single-File Selection Enforcement

**User Story:** As a citizen, I want the component to accept only one photo at a time, so that the upload process is simple and predictable.

#### Acceptance Criteria

1. THE UploadDropzone file input SHALL NOT have the `multiple` attribute.
2. WHEN a user selects multiple files via drag-and-drop, THE UploadDropzone SHALL process only the first file and discard the rest.
3. WHILE an upload is in progress, THE MedicinePhotoUpload component SHALL disable the file input and upload button to prevent a second file from being selected.

---

### Requirement 12: Request Cancellation Support

**User Story:** As a citizen, I want to be able to cancel an upload in progress, so that I can select a different photo without waiting for the current upload to finish.

#### Acceptance Criteria

1. THE useUpload hook SHALL store the active `XMLHttpRequest` instance in a ref so it can be aborted at any time.
2. WHEN `cancel()` is called on the useUpload hook, THE useUpload hook SHALL call `xhr.abort()` on the active XHR instance and transition state to `idle`.
3. WHEN the MedicinePhotoUpload component unmounts while an upload is in progress, THE useUpload hook SHALL abort the in-flight XHR via the `useEffect` cleanup function.
4. WHEN an upload is cancelled, THE MedicinePhotoUpload component SHALL NOT call `onUploadComplete`.

---

### Requirement 13: Manual Retry Only

**User Story:** As a citizen, I want to control when a failed upload is retried, so that I am not surprised by unexpected network activity.

#### Acceptance Criteria

1. WHEN an upload fails, THE MedicinePhotoUpload component SHALL NOT automatically retry the upload.
2. WHEN an upload fails, THE MedicinePhotoUpload component SHALL display a "Try again" button as the sole retry mechanism.
3. WHEN the user activates the "Try again" button, THE MedicinePhotoUpload component SHALL call `reset()` to return to `idle` state.

---

### Requirement 14: Double-Upload Prevention

**User Story:** As a citizen, I want the component to prevent me from accidentally starting a second upload while one is already in progress, so that I do not create duplicate entries or waste bandwidth.

#### Acceptance Criteria

1. WHILE `state.status === "uploading"`, THE MedicinePhotoUpload component SHALL set the upload button and file input to `disabled`.
2. WHILE `state.status === "uploading"`, THE UploadDropzone SHALL ignore all drag-and-drop events.
3. THE useUpload hook SHALL enforce that `upload()` is a no-op if `state.status !== "idle"`, providing a programmatic guard in addition to the UI-level disabled state.
