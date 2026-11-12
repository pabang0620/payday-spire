# Payday Spire

A finance deck-builder for the Zoud GameLab 2026 jam. Your first year in Dubai is 12 card battles: one month, one battle.
Money problems (bills, surprise costs, sales, the card bill) are the enemies; your money habits are the deck.
Pure HTML, CSS and JavaScript. No server, no CDN, no external fonts. Open `index.html` straight from disk (file://).
English and Arabic (right to left). One year takes about <!--n:playLo-->11<!--/n--> to <!--n:playHi-->13<!--/n--> minutes, plus about <!--n:endMin-->3<!--/n--> minutes to read the end screen (estimate from `tools/playtest.py`, see Play time below), so a 45-minute lesson fits two years and a class talk.

## For judges: 2 minutes

1. Open `index.html?code=K7M3QX`. Press **Start my year**. Month 1 teaches by doing: one card glows at a time with a one-line guide (pay the Agent fee, put the rest on the card, see the card bill it makes), so a first card is played about <!--n:firstCard-->7<!--/n--> s after Start (`tools/first_card.py`). Press it (or drag it, or key 1-5), then **End turn** (E). Read the month-end summary, then answer the quick guess (or Skip). (about 60 s)
2. On the title screen press **For teachers: class dashboard** (or open `teacher.html`), then **Load a sample class (20 students)**: class summary, the three topics to discuss first, guesses before and after. Under **Pilot measurement** press **Open the pilot results page**: the one-page sheet a school or a sponsoring bank gets after a pilot. (about 40 s)
3. Press **Partner theme preview** on the title screen (or open `index.html?brand=demo-bank`): the white-label frame with a fictional partner. (about 15 s)

More: play to the end and press **Play the same year again** to race **Your last run**; open `index.html?lang=ar` for Arabic.
The documents are `concept_doc.md` (concept, learning goals, research, market, roadmap, team) and `budget.md` (USD 66,110, five milestones).

### The teacher tools in 2 minutes

1. Open `teacher.html` and press **Load a sample class (20 students)** (made-up students, marked as sample). (10 s)
2. Read **Class summary** and **Start the discussion here**: the three topics this class found hardest, with the questions to ask. The summary also has **Reached their year goal** and a table of the year goals and levels: the sample class reached <!--n:sample_goalPct-->25<!--/n-->% of its year goals (<!--n:sample_goalR-->5<!--/n--> of <!--n:sample_goalN-->20<!--/n-->; money for family <!--n:sample_home-->3 of 9<!--/n-->, a studio <!--n:sample_studio-->0 of 4<!--/n-->, wedding gold <!--n:sample_gold-->2 of 7<!--/n-->). (30 s)
3. Under **Pilot measurement** press **Open the pilot results page**, then **Print this page**: one A4 sheet with blank lines for the school and sponsor, the share who finished the year, left a card bill not paid in full, reached the emergency fund goal or reached their year goal, and right answers in month 1 and at year end. Press **العربية** at the top for the Arabic sheet. (30 s)
4. Press **Download results (CSV, one row per result)** and **Download the summary (CSV)**: the same numbers as spreadsheet files, no names. The results file has `goal`, `level`, `goal_reached` and `goal_jar_aed` columns; the summary has the share who reached their goal, each goal apart, and the levels. (15 s)
5. Under **Plan the lesson** type `K7M3QX` and press **Show the year**: the twelve months a class will meet. **Five questions for the talk** are at the bottom, with the points of a good answer. (35 s)

For a school or bank: `docs/pilot_onepager.md` (`dist/Payday_Spire_School_Pilot.pdf`) is a one-page 4-week pilot plan; `docs/lesson_plan.md` is the 45-minute lesson.

## How to play

1. Optional: type a 6-character class code (same code = same year for the whole class). Press **Start my year**.
2. Payday pays rent, food and transport (AED 4,300 of AED 7,500) first. The AED 3,200 left is your cash for the month.
   Month 1 is the move-in month: the first salary pays 24 days (AED 6,000, so AED 1,700 cash) and the agent fee (AED 1,100), the room deposit (AED 1,800, due on turn 2 when you get the keys, returned when you move out) and the moving van (AED 400, turn 3) cost more than that. You meet Put it on the card at once, and month 2 starts with your first Card bill. A first-time player on this device gets no text window here: the glowing card is the lesson (a second run skips it; `?tut=1` shows it again).
3. Each month is a battle of 3 turns. Each turn you draw 5 cards and have 3 focus. Every card says what it does as a result sentence.
4. Enemies show what they will do next (icon + sentence):
   - **Bill**: pay it by month end, or it stays owed, gets an AED 100 late fee and comes back next month. Some bills arrive at turn 2 (shown greyed until then).
   - **Surprise cost**: shows the turn it is due. Before then you choose how to pay it: **Emergency fund pays** (a 0-focus card that is in your hand while a surprise cost or last month's card bill is on screen and the fund has money; it can also pay the card bill before its due date), Pay from cash, or Put it on the card. Compare prices cuts its price first. What is unpaid when it is due goes on the card, with a worry (mind -12) if the fund could not have covered it. The fund sits in its own account: it pays only when you move the money. Months 3 and 4 end with a small one (laptop repair, flat tyre).
   - Every card a month promises is in its first hand: one way to answer each kind of problem (Compare prices for a surprise cost, Wait 24 hours for a sale, Negotiate for a rent raise; a temporary card when your deck has none), the planned joy its intro names (Iftar groceries and Give sadaqah in Ramadan, Eid gifts at Eid) and a sale's pay-later offer (`PS.E.promised`, checked over 200 codes x every play style). Single-problem months get a second, smaller bill (Salik toll top-up in month 5, extra baggage in the flight month, trial subscriptions in month 12).
   - **Card bill**: what you put on the card last month, due at the end of turn 2. Pay it all and it costs nothing. Less: interest on the whole bill. Under the minimum: an AED 240 late fee too. After a bill not paid in full, the next bill has no interest-free period (interest even if paid in full), as on real UAE cards.
   - **Rent raise**: negotiate it away, or rent goes up for the rest of the year.
   - **Sale**: slips Impulse buys into your hand (AED 200 each if still in hand). Wait 24 hours walks it down.
5. Month end (one window): this month's card spending closes (it becomes next month's card bill). Over AED 10,000 the card is frozen and the year ends. Leftover cash goes to the emergency fund, goal savings or fun (or fills the fund to its goal and saves the rest).
   From month 2, each Put it on the card slips an Impulse buy into your deck.
6. After month 1: two quick guesses (skippable), asked again with new numbers at year end.
7. Pick one habit card after each month. After months 3, 6 and 9 the same window also offers a skills course (from savings, then from emergency fund money above its goal) or a coach who drops a card (one pick in all). Bills on autopay is offered from the window after month 3, and it pays from cash only.
8. Month 8: **payroll delay**. The salary comes two weeks late (turn 3, after the card bill's due date). The emergency fund pays rent and living costs; without it, rent becomes a cash advance (fee and interest from day one) and the rest goes on the card.
9. Months 4 to 6: the flight home (AED 2,200) is shown 3 months ahead. Save ahead puts money aside for it only.
10. End screen: grade, net worth, interest and fees, three sentences on why (a frozen card first, then what the card cost, biggest first, then other money lost; each cause carries only the interest its own card money made, and a part worth AED 0 is left out of the sentence), Before and after, the same year with steady habits (and Your last run; with a goal, whether you and steady habits reached it), on a missed goal a line when savings and the emergency fund held what was short, a zakat check, the result card with a result code for the teacher, and printable discussion cards.

### Keys and access

- 1-9 play a card, T or arrow keys change the target, E ends the turn, H opens help, Esc closes a window. Everything is also a button (Tab + Enter).
- Settings: language, text size (3 steps), motion on/off (follows the system "reduce motion"), sound, music, sound captions.
- Captions for every sound sit in their own line (the status bar, the open window or under the grade), never over the game.
- Okabe-Ito colours; every colour cue also has an icon, a border style and a word. Dialogs keep focus inside and are named by their heading. Live regions announce turns, card results and month ends.
- Desktop and phone. The battle screen has a space budget: the status bar, End turn and the hand always stay on the screen; the problems area scrolls inside itself; a hand wider than the screen scrolls sideways; at large text or on a short screen the cards get wider, then their text smaller. Checked at 1920x1080, 1280x720, 1280x800, 390x844, 390x560 and 360x640, three text sizes, English and Arabic (`tools/layout_check.py`). `?lang=ar` opens in Arabic, `?code=CLASS7` fills the class code, `?brand=demo-bank` shows the partner theme.

## For teachers

- Give the class one code (for example `CLASS7`). Everyone plays the same year, at level 1.
- To give the whole class one year goal too, share the link with it: `index.html?code=CLASS7&goal=studio` (`goal=home`, `studio` or `gold`). Without `?goal=` each student picks a goal on the title screen.
- At year end each student presses **Copy result** and sends the text. The text holds a result code (`<!--n:code_ver-->PS2<!--/n-->-CLASS7-...`): the year's numbers, the goal, the level and whether the goal jar was full; no names, two check letters catch typos. Codes from an older copy of the game (`PS1-...`, no goal or level) still read, shown as "Older code".
- Open `teacher.html`, paste the texts, press **Show class summary**, print. Nothing is sent or saved.
- **Pilot measurement** on the dashboard: download the results as CSV (one row per student, no names) or print the one-page pilot results page for the school or a sponsor.
- **Discussion cards** on the end screen print two questions for each problem and decision the student met.

## Files

| File | What it does |
|---|---|
| `index.html` | Game page, loads everything in order |
| `teacher.html` | Teacher dashboard (paste result codes, class summary, print) |
| `css/style.css` | Tokens (Gulf evening look, Okabe-Ito), title, dialogs, end screen, phone rules |
| `css/battle.css` | Status bar, enemy cards, focus, hand of cards |
| `css/class.css` | Caption lines, Your last run, partner theme, result card, before and after, discussion cards, print |
| `css/teacher.css` | Teacher dashboard |
| `js/data.js` | Money constants with sources, <!--n:cards-->31<!--/n--> cards, <!--n:foes-->31<!--/n--> enemies, the 12-month year, seeded random, class codes |
| `js/ledger.js` | Where card debt came from: every AED on the card carries its cause; payments and interest are shared out in proportion, so the end screen can name what each cause cost |
| `js/engine.js` | Rules only, no DOM: payday (move-in month, payroll delay), turns, bills that arrive later, card effects, enemy actions, card bill and the interest-free period, month-end summary, leftover |
| `js/engine_more.js` | Rules between battles: habit cards, the course and the coach, decisions (friend, market dip), zakat |
| `js/policy.js` | Steady, impulse and idle play styles and `PS.simYear` (end screen comparison, playtests, sample class) |
| `js/i18n_en.js` / `js/i18n_ar.js` | Game text, plus the number formatter (left-to-right isolates for Arabic) |
| `js/i18n_more.js` / `js/i18n_teacher.js` | Text for the class tools and the dashboard (English and Arabic) |
| `js/class.js` | Grade, result card, result code (`PS2` with goal and level, still reads `PS1`), discussion cards |
| `js/why.js` | The three reasons on the end screen: sentences built from a head and clauses (a clause worth AED 0 is dropped), fees from the ledger, order rules |
| `js/check.js` | Quick guesses after month 1 and the year-end check (Before and after) |
| `js/past.js` | Your last run (last run on the same code, this browser only) |
| `js/brand.js` | Partner theme preview (`?brand=demo-bank`, `?brand=demo-school`, fictional) |
| `js/music.js` / `js/audio.js` | WebAudio music loop (maqam Hijaz) and sound effects with captions |
| `js/icons.js`, `js/artload.js` | Line icons (SVG) and the game's own pictures from `art_b/manifest.js` (made by `python3 tools/art_manifest.py`; any missing picture falls back to the icons and CSS borders) |
| `js/ui.js`, `js/flow.js`, `js/screens.js`, `js/main.js` | Battle screen, year flow, title/settings/end screen, start-up |
| `js/teacher.js`, `js/sample_class.js` | Dashboard logic and the 20-student sample class |
| `js/teacher_pilot.js` | Pilot measurement: results and summary CSV, the one-page pilot results page |
| `tools/regress.js` | `node tools/regress.js`: lesson check on 8 class codes plus <!--n:checks-->63<!--/n--> design, class-tool, sentence, layout, zip and document checks; exit code 1 if any fails (`tools/regress_why.js`, `tools/regress_design.js`, `tools/policies.js`) |
| `tools/layout_check.py` | Screen space on 5 screen sizes x 3 text sizes x 2 languages: no sideways scroll, every hand card and End turn on the screen and not covered (`tools/layout_check.json`, `shots/v6_*.png`) |
| `tools/doc_numbers.js` | Writes the measured numbers into this file and `concept_doc.md` (`--write`); regress check D1 fails when one differs |
| `tools/build_zip.py` | Builds `dist/PaydaySpire.zip` (pages, css, js, the pictures in `art_b/manifest.js` only), unzips it and opens it from file:// |
| `tools/run_all.sh` | Runs every check in order and writes `tools/run_all.log` |
| `tools/sample_class.js` | `node tools/sample_class.js --write`: regenerates the sample class from the current rules |
| `tools/first_card.py` | A first-time player from Start to the first played card (target 10 s, same reading model as playtest.py), the month 1 steps one glowing card at a time, and no lesson on a second run (`tools/first_card.json`, `shots/v7_tut*.png`) |
| `tools/playtest.py` | Headless full year through the real buttons, with the play-time estimate: `python3 tools/playtest.py <steady|impulse|idle> [CODE] [en|ar] [desktop|phone] [shot_prefix]` |
| `tools/shots_v4.py` | v4 screenshots (`shots/v4_*.png`) and checks: move-in month, first card bill, payroll delay, habit window with the shop, end screen with no emergency fund, dashboard round trip, Your last run, partner theme, phone A++, Arabic caption and comparison amounts on one line (`tools/shots_v3.py` is the earlier set) |
| `tools/a11y_audit.py` | Contrast audit (WCAG 2.2 AA) on <!--n:a11yScreens-->20<!--/n--> screens (11 in English and 11 in Arabic) |
| `tools/keys_check.py` | Keyboard-only check of the first month |
| `concept_doc.md`, `budget.md` | Concept document and budget for the judges |
| `docs/lesson_plan.md`, `docs/pilot_onepager.md` | The 45-minute lesson, and the one-page school pilot plan (`python3 tools/build_pilot_pdf.py` makes `dist/Payday_Spire_School_Pilot.pdf`) |
| `DESIGN.md` | The design before building |

## Balance (`node tools/regress.js`, same engine as the browser)

Average over <!--n:codes-->8<!--/n--> class codes (CLASS7, K7M3QX, ABCDEF, MAJLSX, DUBA22, GULF26, SANDY9, Z4QPRW):

| Style | Net worth | Share of steady | Interest and fees | Impulse buys | Card frozen |
|---|---|---|---|---|---|
| Steady (cash first, emergency fund from leftovers, wait out sales, card bill paid in full on time) | AED <!--n:net_steady-->21,594<!--/n--> | 100% | <!--n:fees_steady-->0<!--/n--> | <!--n:imp_steady-->1,200<!--/n--> | <!--n:frozen_steady-->0<!--/n--> of 8 |
| Every bill on the card, card bill paid in full when it can (same planned joy as steady) | AED <!--n:net_swipeAll-->18,883<!--/n--> | <!--n:pct_swipeAll-->87<!--/n-->% (<!--n:lo_swipeAll-->81<!--/n-->-<!--n:hi_swipeAll-->93<!--/n-->%) | <!--n:fees_swipeAll-->0<!--/n--> | <!--n:imp_swipeAll-->2,650<!--/n--> | <!--n:frozen_swipeAll-->0<!--/n--> of 8 |
| No emergency fund (leftovers to goal savings instead) | AED <!--n:net_noBuffer-->16,076<!--/n--> | <!--n:pct_noBuffer-->74<!--/n-->% (<!--n:lo_noBuffer-->50<!--/n-->-<!--n:hi_noBuffer-->84<!--/n-->%) | <!--n:fees_noBuffer-->225<!--/n--> | <!--n:imp_noBuffer-->2,425<!--/n--> | <!--n:frozen_noBuffer-->0<!--/n--> of 8 |
| Doing nothing (no cards played) | AED <!--n:net_nothing-->-12,292<!--/n--> | below 0 | <!--n:fees_nothing-->11,505<!--/n--> | <!--n:imp_nothing-->4,825<!--/n--> | <!--n:frozen_nothing-->8<!--/n--> of 8 |
| Impulse (card for everything, pay-later, cash advance, card minimum only) | AED <!--n:net_impulse-->-9,324<!--/n--> | below 0 | <!--n:fees_impulse-->1,379<!--/n--> | <!--n:imp_impulse-->2,900<!--/n--> | <!--n:frozen_impulse-->8<!--/n--> of 8, in <!--n:frozenAt_impulse-->months 8 to 10<!--/n--> |

These numbers are written by `node tools/doc_numbers.js --write` and checked by regress (D1). Steady habits end highest on every code, with no interest or fees. The test fails if a year with no emergency fund ends above 90% of steady on any code, if that year has no interest or fees, or if its end screen does not name the late salary or a surprise cost on the card among the three reasons. Other checks: every month of 12 codes has a decision (M1) and months 1-4 have at most 2 quiet turns (M2); no reason or discussion card says "AED 0", the ledger adds up to the year's fees and each AED of interest is told once by the cause that made it (W1-W4, 100 years in English and Arabic); burnout is named unless three bigger card costs fill the list; a silver nisab answer is shown and counted apart. Putting bills on the card and paying in full is close to free, as with a real card; what it costs is the Impulse buys it lets in and the card bill that lands in the payroll delay month, so the test holds this style at or under <!--n:limit_swipeAll-->95<!--/n-->% of steady on every code.

## Play time (`python3 tools/playtest.py steady K7M3QX`)

The playtest presses the real buttons and adds up a time for a person: each new line read once at 230 words a minute (adult silent reading of non-fiction, Brysbaert 2019: 238), a line seen before with only new numbers is a 0.5 s glance, 2 s to choose and press a card, 1 s per end turn, 1 s plus 1 s per problem on screen to look at each turn, 2 s for a window with a choice and 1 s for a window with one button. Careful year (K7M3QX): <!--n:playK7-->12.1<!--/n--> minutes, <!--n:pressK7-->159<!--/n--> presses (CLASS7: <!--n:playC7-->11.6<!--/n-->); impulse year: <!--n:playImp-->10.4<!--/n--> minutes (the card freezes in month 8); the end screen is about <!--n:endMin-->3<!--/n--> minutes of reading. A first-time player who reads everything slowly will take longer; the second year on the same code is faster.

## Simplifications (also said in the game)

The card limit (AED 10,000) is lower than real first-job limits (often 2-3 salaries) so one short year can show the spiral. Interest on a card bill not paid in full is shown as one month at 3% on the whole bill (real cards count each day from the purchase). Bill late fees (AED 100), surprise cost prices, the payroll delay and fund returns are example values, not a product.
The Arabic text was checked with an AI language review and still needs a native speaker before release.

## Art and AI use

The <!--n:pics-->27<!--/n--> pictures in `art_b/` (title and battle backgrounds, two ending scenes, <!--n:portraits-->19<!--/n--> enemy portraits, 4 card frames) are Payday Spire's own art: generated with Google Nano Banana from the developer's own prompts during this jam (November 2026), then checked and placed by the developer. Code, line icons (SVG), sounds and music (WebAudio), the English text and the first Arabic draft were made with Claude (Anthropic) as a coding and writing assistant. No third-party stock images, audio or fonts. The submission zip (`python3 tools/build_zip.py`) holds only the pages, `css/`, `js/` and the pictures listed in `art_b/manifest.js`.

## License

Source available for noncommercial use under the [PolyForm Noncommercial License 1.0.0](LICENSE.md). Schools, teachers, students and researchers may use, copy and change it for free. Commercial use needs written permission from the author.

Required Notice: Copyright 2026 Wonho Lee
