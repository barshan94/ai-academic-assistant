# Image-to-PDF Archival Policy

Converting an image to PDF does not automatically reduce file size. The pipeline must optimize image content adaptively and validate academic readability. Never promise a fixed compression ratio.

## Required pipeline
1. Accept image upload and preserve a temporary original.
2. Validate file signature, dimensions, orientation and size.
3. Correct orientation without cropping content.
4. Classify page as photo, printed text, handwriting, line art, graph or diagram.
5. Apply conservative, content-aware compression and resolution settings.
6. Create a PDF with one image per page in original upload order.
7. Render the PDF back to images and run OCR/readability checks.
8. Check small mathematical symbols, subscripts, superscripts, graph labels, circuit details and diagram lines.
9. Upload the validated PDF to Google Drive.
10. Verify Drive file ID, size and metadata before deleting temporary original data.

If conversion, validation or Drive upload fails, retain the original and mark the job for retry/review. Existing PDFs remain PDFs and should not be needlessly reconverted.

Record original/output byte sizes, dimensions, page order, processing version, compression settings, OCR/readability result and Drive file ID. Test printed math, handwritten equations, dense symbols, graphs, geometry, physics circuits, diagrams, low-light photos and multi-image order. Human review is required before adopting aggressive compression settings.
