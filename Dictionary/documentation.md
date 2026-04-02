# Instant Dictionary Extension

## Overview

A Chrome extension for looking up word definitions, phonetics, and usage examples. Users type any word or sentence into the search bar, submit the form, and get a full dictionary entry fetched from the Free Dictionary API — with pronunciation, part of speech, definitions, and example sentences.

## Existing Features (Verified from Code)

* **Search form with text input** — type any word or sentence and submit via Enter or Search button
* **Search results display** — word content rendered in `#wordContent` div after lookup
* **Data shown per word entry** (from Free Dictionary API):
  * Word (headword)
  * Phonetics — IPA notation and audio pronunciation (if available from API)
  * Part of speech (noun, verb, adjective, etc.)
  * Definitions list
  * Example sentences (where provided by API)
* **Loading spinner** — shows "Looking up meaning..." during API fetch
* **Error state** — displays error message if word not found or API fails
* **Empty state** — prompt text shown before first search: "Type a word to get definition, phonetics and examples"
* **"Clear" button** — resets the search input and hides results
* **Status text** — shows "Ready" or current operation state
* **Autocomplete off** on the search input to prevent browser interference
* Internet connection required — uses Free Dictionary API (dictionaryapi.dev)

## New Features to Add (Proposed Upgrades)

* **Contextual Meaning Inference** → When a word is selected on a webpage and the popup is triggered, read the surrounding sentence context and surface the most relevant definition for that usage.
* **Word Relationship Map** → Below the definition, show clickable chips for Synonyms and Antonyms — clicking any chip instantly looks up that word.
* **Personal Vocabulary Builder** → Star icon per word — saves the word to a local vocabulary list (term + definition + date saved + source URL).
* **Daily Word Flashcard** → Show one saved vocabulary word as a flashcard when the popup opens — word first, definition revealed on click.
* **Double-Click on Page Trigger** → Double-clicking any word on a webpage activates the popup pre-filled with that word — no manual typing needed.

## Feature Workflow

1. User opens the extension popup.
2. Types a word or sentence in the search input.
3. Presses Enter or clicks "Search".
4. Loading spinner appears — "Looking up meaning..." text shows.
5. Results appear: phonetics, part of speech, definitions, examples.
6. User reads the definition; if a pronunciation audio is available, the browser may play it inline.
7. User clicks "Clear" to reset for the next word.

## Productivity Impact

* Full dictionary entry in a popup means no tab switching to look up words during research or reading.
* IPA phonetics alongside definitions bridges meaning and pronunciation in one view.
* Example sentences provide contextual usage — more useful than definitions alone for language learners.
* Clear button enables rapid sequential lookups without manual field clearing.

## Edge Cases & Limitations

* Results depend entirely on the Free Dictionary API — words not in the API's database (slang, very technical jargon, proper nouns) will return a "Not Found" error.
* Audio pronunciation is only available when the API returns a phonetics audio URL — not guaranteed for all words.
* Internet connection is required — offline use is not supported.
* Multi-word phrases and sentences are supported as search input but API coverage for them is limited compared to single words.
* No local caching — every search triggers a fresh API call even for recently looked-up words.

## Future Scope

* Full spaced repetition algorithm (SM-2) applied to vocabulary flashcards.
* Multi-language support — look up words in Spanish, French, German, or Japanese with English definitions.
* Reading mode companion — create a glossary from all words looked up while reading a specific article.
