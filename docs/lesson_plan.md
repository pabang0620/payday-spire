# Payday Spire: a 45-minute lesson plan

For a class of students aged about 15 to 22. Each student needs a phone, tablet or computer with a browser. The teacher needs a projector and `teacher.html` open on the teacher's computer. Nothing is sent or saved: the game and the dashboard run in the browser.

Goal of the lesson: students feel, in their own year, why paying the whole card bill and keeping an emergency fund matter, and they leave with one habit to keep.

## Before the lesson (10 minutes, the day before)

1. Pick a class code: 6 letters and digits, no 0, 1, I or O (for example `CLASS7`). Every student who types the same code plays the same year, at level 1.
2. Decide the year goal. Students pick one on the title screen (money for family, a studio of my own, wedding gold), each with its own jar. To give the whole class the same goal, share the link with it: `index.html?code=CLASS7&goal=studio` (`goal=home`, `studio` or `gold`). One goal for all makes the talk easier; three goals let the class compare.
3. Open `teacher.html`, type the code under **Preview this year** and press **Show the year**. You see the twelve months: the money problems with their amounts, and what else each month brings (Ramadan, Eid, the market dip, the payroll delay, the shop). Note one or two months to ask about (for example the breakdown in month 4 or the payroll delay in month 8). Do not show this table to students before they play.
4. Press **Load a sample class** once to see what the summary will look like: the sample class reached <!--n:sample_goalPct-->25<!--/n-->% of its year goals (<!--n:sample_goalR-->5<!--/n--> of <!--n:sample_goalN-->20<!--/n-->; money for family <!--n:sample_home-->3 of 9<!--/n-->, a studio <!--n:sample_studio-->0 of 4<!--/n-->, wedding gold <!--n:sample_gold-->2 of 7<!--/n-->).
5. Read **Five questions for the talk** at the bottom of the dashboard. Each has the main points of a good answer.

## The lesson

| Time | Step | What the teacher does | What students do |
|---|---|---|---|
| 0-5 min | Start | Write the class code on the board. Say: "This is your first working year in Dubai. Bills, breakdowns and sales are the enemies; your habits are the cards. Try to end the year with no card debt." Play one turn on the projector: pay the agent fee with the glowing card. | Open the game, type the class code, press **Start my year**. |
| 5-20 min | Play one year | Walk around. Ask one student at a time: "What will this card do to next month?" Do not give the best move. | Play the twelve months. Students who finish early press **Play the same year again** and try to beat **Past you**. A student whose card is frozen before month 12 has finished too: they read the three reasons on the end screen, then play the same year again to keep the card open. |
| 20-30 min | Class summary | Ask students to press **Copy result** (it is at the top of the end screen) and paste the text into the class chat or LMS. Copy all of it into the dashboard box and press **Show class summary**. Put the numbers, **Start the discussion here** and the year goals table (who reached their goal) on the projector. | Copy and send the result. Look at where the class did well and where it lost money. |
| 30-40 min | Talk | Start with the first topic of **Start the discussion here**. Then use the five questions. Ask students to find the month where it happened in their own year. Use the model answer points to close each question. | Answer with examples from their own year: the month, the card they played, what it cost. |
| 40-45 min | Wrap up | Ask each student to write one habit to keep. Print the summary with **Print summary** if you want a record. | Write one habit (for example: "I pay the whole card bill", or "I fill the emergency fund first"). |

## If time is short

The play-time estimate (`tools/playtest.py`) is about 10 to 11 minutes for a year plus about 3 minutes on the end screen. A first-time player who reads every line takes longer, so the plan gives 15 minutes and the steps below.

- A student who has not finished by minute 22 keeps playing at home with the same code; the class summary works with the results you have.
- Skip the second year. One year and the talk are the core of the lesson.
- With only 30 minutes: start (3), play (15), summary (5), two of the five questions (7).

## The five questions and the points of a good answer

1. **Your card bill is AED 2,000 and you pay AED 1,900. Why does the interest count the whole AED 2,000?**
   Paying less than the whole bill loses the interest-free days, so interest is counted on the whole bill from the day of each purchase, not on the AED 100 left. Paying the whole bill by its due date is the only way to pay no interest.
2. **How big should an emergency fund be on a salary of AED 7,500 a month? Why?**
   Start with one month of living costs (AED 4,300 in the game), then build up to three to six months. It is for what cannot wait (a breakdown, a late salary), so these become a plan instead of card debt.
3. **Why does waiting 24 hours work against a sale?**
   A sale works by hurry, and the wish fades in a day. Waiting gives time to ask "Did I plan this? Would I buy it at the full price?" and to compare. Most wants are gone tomorrow; real needs are still there.
4. **The flight was shown 3 months ahead. How much a month would have covered it?**
   AED 2,200 over three months is about AED 734 a month. Putting money aside each month for a cost you can see coming means it is no shock when it arrives.
5. **Pay-later has no interest when paid on time. What does it still cost you?**
   It takes part of the next salaries before you get them, so less is free for bills and the emergency fund. A missed part brings a late fee, and it makes buying feel easier than it is.

More questions (the move-in costs, unpaid bills, Ramadan and Eid, the rent raise, the market dip, lending to a friend, zakat, the frozen card) are under **More questions from the discussion cards** on the dashboard and on each student's discussion cards in the game.

## Notes for the teacher

- The game uses AED and situations from the UAE. Amounts are examples for teaching, not financial advice.
- Result codes hold no names. The dashboard shows rows in the order they were pasted, with each student's goal, level and goal jar. A code from an older copy of the game (`PS1`) still reads, without goal or level.
- In a pilot (see `docs/pilot_onepager.md`), press **Download results (CSV)** under **Pilot measurement** after the summary, and print **Open the pilot results page** for the school or the sponsor. Neither holds a name.
- The whole lesson works in Arabic too: students press the language button on the title screen, and the dashboard has its own language button.
