# Blog publication record — October 29, 2026

Six articles live in `src/content/blog/` and are approved by the user for publication. All now use `draft: false` and the publication date October 29, 2026 (America/Chicago). This records editorial approval, not proof of a successful production deployment.

## Source review

Network access was rechecked before publication. The following sources were retrieved and read successfully:

- USAGov: Naturalization; How to Get a Green Card; Renew or Replace a Green Card; Proving U.S. Citizenship; Check Your Immigration Case Status.
- State Department: What Is a U.S. Visa; Visa Expiration Date; Visitor Visas; the 1924 Immigration Act historical overview. The Visa Bulletin and International Travel landing pages were also reachable.
- GovInfo: the original Public Law 89-236 (79 Stat. 911), including the numerical framework, preferences, nondiscrimination provision, and quota transition ending June 30, 1968.
- The American Presidency Project: Lyndon Johnson’s October 3, 1965 signing remarks, including the Liberty Island location.
- National Park Service: Ellis Island History & Culture and Chronology. The article now specifies that the 12 million figure refers to 1892–1924.
- National Archives: Immigration Records and Naturalization Records.

The proposed National Archives 1965 milestone link returned 404 and was removed. The replacement is the actual statute on GovInfo, supplemented by the signing remarks. A broad demographic-impact claim was replaced with directly supported statutory details.

USCIS and its case-status/processing-time endpoints returned origin access-denied or bot-protection responses. Their official URLs remain useful reader resources, but this session did not verify their page contents. Accessible USAGov pages were used to cross-check stable naturalization, card-renewal, citizenship-documentation, and case-status distinctions. No article claims newly verified 2026 fees, deadlines, or processing times. No attorney review or named human authorship is claimed.

## Publication implementation

The blog index links all six posts. Each generated article has a canonical URL on `https://ircoffice.com`, article Open Graph metadata, BlogPosting JSON-LD, UTC-stable publication-date display, and a link back to the blog. Article typography and tables have narrow-screen checks. The site uses the apex domain because live requests confirmed a permanent redirect from www to apex.

## Search intent and publication order

| Draft slug | Primary topic / query | Reader intent | Internal destination |
| --- | --- | --- | --- |
| green-card-vs-citizenship | green card vs citizenship | Understand status and form differences | Green card; citizenship |
| naturalization-paperwork-preparation-minneapolis | N-400 paperwork preparation Minneapolis | Prepare for a local service appointment | Citizenship; contact |
| uscis-receipt-notice-case-status | USCIS receipt notice vs approval | Understand notices and organize follow-up | Contact |
| visa-passport-admission-differences | visa expiration vs authorized stay | Avoid confusing travel documents and admission | Visa; Umrah |
| 1965-immigration-act-history | Immigration Act of 1965 explained | Learn historical context | Visa / family petitions |
| ellis-island-immigration-history-records | Ellis Island immigration records | Research family history responsibly | Citizenship; contact |

These targets are editorial search-intent hypotheses, not measured search-volume or ranking claims. Practical guides should be considered first because they directly support the site's services. Historical articles add context rather than competing with service pages for the same query.

## Future editorial maintenance

- Recheck cited sources periodically, and retry USCIS pages in a normal browser for a fuller source review.
- Check each numbered claim against its source, especially status vs card expiration, I-94 terminology, citizenship through parents, and descriptions of legislation.
- Have a qualified immigration reviewer check legal explanations before publication; do not imply the business provides legal advice or representation.
- Confirm the historical dates, visitor totals, and descriptions of selection rules against the NPS / Archives / State Department sources.
- Confirm local service scope and contact details with the business. Do not add testimonials, case outcomes, language lists, prices, or credentials without support.
- Set an actual publication date and a real author/reviewer attribution if available. Do not invent a staff author or claim government endorsement.
- For future posts, change only approved drafts to `draft: false` and validate the generated page, metadata, internal links, and sitemap entry.
- Recheck article typography and narrow-screen readability whenever templates or tables change. Publication tests now cover all six article routes.
- Recheck practical guides when USCIS or State Department rules change. Revisit historical citations if source pages move.

## SEO approach

Each post has a unique title, meta description, descriptive slug, a direct opening answer, clear section headings, relevant internal links, and numbered official references. There is no keyword stuffing, invented search-volume data, backdating, or promise of ranking. The existing blog template supplies the page H1, canonical URL, and article Open Graph type; article bodies begin below that H1.

Source verification and useful, accurate answers take priority over a publication calendar.
