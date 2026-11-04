# The surveyor world in Nigeria: research note for the association design (2026-10-19)

Status: **desk research from public web sources, partly thin, mostly secondary (news, law-firm and commercial pages). Nothing here is a verified rule.** Use it to ask better questions, not to set requirements. It feeds [`association-subscription.md`](./association-subscription.md) and the structures listed there.

## What the sources support

- **SURCON** (Surveyors Council of Nigeria) is the statutory regulator under Cap S18 (LFN 2004). It keeps the register of surveyors; a valid plan carries the surveyor's SURCON number and seal; secondary sources say surveying for payment without registration is an offence. A Ministry of Housing release said the SURCON Council was dissolved in June 2023 and the ministry would ask the Presidency to reconstitute it. Whether that has happened is unconfirmed, so do not tie any feature to SURCON approvals or data.
- **NIS** (Nigerian Institution of Surveyors) is the professional body, separate from SURCON. Individual categories: Student, Probationer, Associate, Member, Fellow. Membership comes from the national body; members affiliate with the nearest **state branch** but may attend any. The state branch chairman sponsors every applicant, and the sponsor must be "financial" (up to date on dues). Source page dated December 2020.
- **APPSN** (Association of Private Practicing Surveyors of Nigeria) is a sub-group of NIS with **state chapters** (Lagos, Oyo, Imo and Ekiti appear in news), elected executives, delegates' general assemblies and a national conference. It is an association of **private practitioners**, not of every surveyor in a state.
- **State Surveyor-General offices:** each state has one. In Lagos a survey is registered once lodged with the state Surveyor-General and given a plan number; charting usually sits inside a Governor's Consent application; the office is moving records to e-GIS with electronic verification. The **federal Office of the Surveyor-General** (OSGOF) is the apex mapping authority with six zonal directorates and 36 state field offices; news in August 2025 reported its move to the Presidency while its own site still named the Housing ministry.
- **Practice versus state law:** surveyors have sued over state survey laws that conflict with the SURCON Act, arguing a registered surveyor may practise anywhere in Nigeria. Practice is national; chapters and registration procedures are state by state.

## Not found

Dues or fees (NIS, APPSN chapters, SURCON practising licence); the number of registered surveyors or members per chapter; how chapters collect money; firm rules (registered principal, employed surveyors, branch offices, one licence for several surveyors); procedures outside Lagos.

## What our own schema shows

- `SurfboardUser` is a person. **There is no firm entity**, only free-text `companyName`/`companyAddress` and a `payerIDType` of Individual or Commercial.
- `surconRegNumber` is unique and **defaults to a generated placeholder** (`SURCON_` plus five characters), so some accounts hold a fake number until a real one is entered.
- `residenceState` is free text underneath a dropdown, editable until KYC.
- Surfboard's MDA roles serve the Lagos Surveyor-General's offices today.

## Implications for the association design

- "Every surveyor resident in the state" overstates APPSN's membership. Membership is not residence.
- The real bodies are already a hierarchy (national, state chapter; federal, state offices), which supports a nullable parent link on the association row.
- NIS admits members by application, sponsor and standing, which matches an opt-in membership model better than automatic scoping by residence.
- No firm model exists, so a firm-pays-for-staff structure would need new design and field confirmation.
- Do not use `surconRegNumber` to prove membership or identity.

## Questions for a chapter secretary (to be asked later)

1. How do chapters collect dues today, and would they pay for members in bulk?
2. Are all private surveyors in the state members, and how does the chapter know?
3. Do surveyors register with the chapter where they live or where they work?
4. Do firms pay for staff licences, and how many registered surveyors does a typical firm have?
5. Does the national body want visibility across all chapters?

## Data check

A read-only production count (surveyors by `residenceState`, real versus placeholder SURCON numbers) is prepared in `out/db/surveyor-state-and-surcon-count.sql` and has not been run (see the task list).

Sources: [NIS membership requirements, Construction Review (Dec 2020)](https://constructionreviewonline.com/professional-associations/registration-with-the-nigeria-institution-of-surveyors) · [APPSN Lagos AGM, ThisDay (2025)](https://thisdaylive.com/index.php/2025/03/26/appsn-lagos-charges-members-to-enhance-surveying-practices) · [Office of the Surveyor-General of the Federation](https://osgof.gov.ng/history/) · [SURCON reconstitution, Federal Ministry of Information](https://fmino.gov.ng/housing-ministry-to-facilitate-reconstitution-of-surcon-belgore/) · [Surveyors sue Lagos government, Guardian](https://guardian.ng/news/surveyors-sue-lagos-govt-others-over-breaches-of-surcon-act/) (blocked on direct fetch; search excerpts used) · [Registering properties in Nigeria, Banwo & Ighodalo](https://banwo-ighodalo.com/grey-matter/registering-properties-in-nigeria-a-case-for-streamlining-the-process?leaf=6) · [SURCON guide, Profolio](https://www.profolio.ng/land-surveyor/companies-hiring).
