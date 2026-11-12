#!/bin/bash
# Every check; results in tools/run_all.log. The browser checks leave result files that tools/regress.js reads
# (layout_check.json, a11y_audit.json, playtest_results.json, build_zip.json); tools/doc_numbers.js then writes the measured
# numbers into README.md and concept_doc.md, and the last regress run checks all of it (exit code 1 if anything fails).
# The browser checks run in three groups at once (each check starts its own headless browser, no shared port). The five
# playtests stay in one group because they read and rewrite the same playtest_results.json and screen_text.json.
cd "$(dirname "$0")/.."
T=$(mktemp -d)
{
echo "== screen space and boxes side by side (5 sizes x 3 text sizes x en/ar), shots/v6_m*.png and shots/v9_*.png"
python3 tools/layout_check.py --shots
echo "== contrast"
python3 tools/a11y_audit.py | tail -1
echo "== first card for a first-time player (target 10 s), shots/v7_tut*.png"
python3 tools/first_card.py
echo "== keyboard"
python3 tools/keys_check.py
} > "$T/a.log" 2>&1 &
{
echo "== whole years through the real buttons, with the play-time estimate and every drawn text (tools/screen_text.json)"
python3 tools/playtest.py steady K7M3QX en desktop
python3 tools/playtest.py steady CLASS7 en desktop
python3 tools/playtest.py impulse CLASS7 ar desktop
python3 tools/playtest.py idle CLASS7 en phone
python3 tools/playtest.py idle K7M3QX ar phone   # an Arabic year with empty funds, for the drawn-text zero check Z2s
} > "$T/b.log" 2>&1 &
{
echo "== end screens and title, shots/v6_*.png"
python3 tools/shots_v6.py
echo "== the four screens of the Arabic review fix, shots/v8_*.png"
python3 tools/shots_v8.py
echo "== the 5th round of fixes: promised Eid card, fund card, zero statement line, forecast line row, shots/v10_*.png"
python3 tools/shots_v10.py | head -c 300; echo
echo "== the 6th round of fixes: counted nouns, why the fund was empty, three problems on a phone, card texts, shots/v11_*.png"
python3 tools/shots_v11.py | head -c 300; echo
echo "== the final fixes: one Savings number, the fund option, hand rule, second-half bills, shots/v13_*.png"
python3 tools/shots_v13.py | head -c 300; echo
echo "== the final-2 fixes: grade reasons, course payback, leftover split, turn-3 bills, shots/v14_*.png"
python3 tools/shots_v14.py | head -c 300; echo
echo "== the year's goal, the levels and the card feedback, shots/v15_*.png"
python3 tools/shots_v15.py | head -c 300; echo
echo "== the result code with goal and level, the dashboard round trip (new and old codes) and Arabic percents, shots/v16_*.png"
python3 tools/shots_v16.py | head -c 300; echo
echo "== the end screen goal lines: you and steady habits on the goal, the missed-goal savings line, shots/v17_*.png"
python3 tools/shots_v17.py | head -c 400; echo
} > "$T/c.log" 2>&1 &
wait
{
cat "$T/a.log" "$T/b.log" "$T/c.log"
echo "== submission zip"
python3 tools/build_zip.py
echo "== document numbers"
node tools/regress.js --no-docs > /dev/null
node tools/doc_numbers.js --write | tail -1
echo "== lesson, sentence, design, layout, zip and document checks"
node tools/regress.js
} > tools/run_all.log 2>&1
RC=$?
rm -rf "$T"
echo DONE >> tools/run_all.log
exit $RC
