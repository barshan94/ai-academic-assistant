# Optional web research setup

The owner can manually search for external source leads using Brave Search API. This is optional and disabled until a server-side API key is configured.

Only the manually entered query is sent to Brave Search. The question text, uploaded PDFs, OCR text and saved AI answers are not sent. Do not enter personal or confidential information. Search-provider data handling and possible charges apply; approve the provider terms and budget before enabling it.

The app stores up to ten HTTPS results per search: title, URL, snippet, rank, provider-supplied publication date and retrieval time. Results are append-only and visible only to the question owner. The app does not verify publishers, inspect linked pages or certify official syllabus/mark-scheme status. Open each source and check its publisher, version and exact page/section before relying on it.

Configuration: set `WEB_SEARCH_PROVIDER=brave` and `BRAVE_SEARCH_API_KEY` in the server environment. Never use a public-prefixed variable or commit the key.

Limits: five searches per owner per 15-minute window and 20 per UTC day; ten results per search; 12-second request timeout. Non-HTTPS, malformed, duplicate and empty results are discarded. Provider response bodies and keys are not shown in errors. Search results are not automatically added to AI prompts.