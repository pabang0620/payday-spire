/* Payday Spire - numbers, cards, money problems and the year. Text lives in i18n_en.js / i18n_ar.js.
   Money values and their sources are the same as Jar Rush (../zoud/js/data.js, engine.js) and
   ../조사/zoud_UAE실데이터_2026-11-10.md. Pure data plus a seeded random, no DOM. */
(function () {
  const PS = (window.PS = window.PS || {});

  PS.CONST = {
    SALARY: 7500, // first job in Dubai, in hand (UAE has no personal income tax)
    // living costs taken on payday before the month starts (shared room 1,800, food 1,000, transport 800,
    // phone 200, utilities and internet 300, other 200 = 4,300; Jar Rush checked values)
    LIVING: 4300,
    RENT: 1800, // the shared room, part of LIVING
    CARD_RATE: 0.03, // card interest on the balance left after the statement: typical UAE cards charge 2-4% a month
    MIN_PAY_RATE: 0.05, // minimum payment 5% of the balance...
    MIN_PAY_FLOOR: 100, // ...or AED 100, whichever is higher (common UAE card terms)
    CASH_ADV_FEE: 105, // cash advance fee (many UAE banks: about 3%, minimum AED 100 or more); interest runs from day one
    CASH_ADV_PCT: 0.03, // the fee is the higher of AED 105 and 3% of the amount
    FIRST_DAYS: 24, // you start work on the 7th: the first salary pays 24 of 30 days (UAE salaries are pro-rated from the joining date)
    // payroll delay: the salary comes two weeks late (start of turn 3, after the card bill's due date). Rent and living costs are due on the 1st: the emergency fund
    // pays them, then savings (a transfer from your own account), and what they cannot pay is a cash advance (rent needs cash or a
    // transfer, not a card purchase). Late salaries do happen; the UAE Wage Protection System tracks every payroll and from
    // June 2026 the deadline is stricter (Ministerial Resolution 340, reported; no grace-day count is assumed here).
    LATE_TURN: 2,
    // a bill not paid by month end is not moved to the card: it stays owed, a late fee is added, and it comes back next month
    // (example value; utilities and telecoms charge late fees and can cut the service)
    BILL_LATE: 100,
    // card statement: closes at month end, due 25 days later (Emirates NBD key facts: due 25 days after the statement date),
    // which is the middle of the next month = the end of turn 2 here. Paid in full by then: no interest. Not paid in full:
    // interest on the whole statement from each transaction date (FAB and Emirates NBD key facts), shown as one month at CARD_RATE.
    CARD_DUE_TURN: 1,
    CARD_LATE: 240, // late payment fee if not even the minimum arrives by the due date (Emirates NBD and Standard Chartered UAE: AED 241.50)
    // pay-later: an instalment the cash cannot meet is charged to the card on file (that is not a failed payment, so no late fee;
    // Tabby UAE charges 15/30/60, capped at AED 105 per order, only when the charge fails)
    LIMIT: 10000, // card limit. Real limits are often 2-3 salaries; lowered so one short year can show the spiral (said on the end screen)
    EXIT_FEE: 0.02, // selling the fund early
    MIND_MAX: 40,
    MIND_STRESS: 6, // work and life wear the mind down each new month...
    FUND_CALM: 3, // ...less with a full emergency fund (one month of costs): -3 instead of -6
    DEBT_WORRY: 2, // and owing money weighs on it: -2 per AED 1,000 owed, up to -8
    DEBT_WORRY_MAX: 8,
    BURNOUT_MIND: 15, // mind after a burnout (still tired)
    // the month after a burnout: tired spending on delivery and taxis, a missed shift (example value). Burnout costs more than
    // the mind it gives back, so wearing yourself out is never a way to earn (tools/regress_lesson.js)
    BURNOUT_SPEND: 1500,
    SHOCK_WORRY: 8, // a breakdown the emergency fund could not take goes on the card: up to mind -8 (the late salary on credit too)...
    SHOCK_WORRY_PER: 300, // ...-1 per AED 300 the fund could not cover (a few dirhams on the card worry less than thousands; debt worry is per AED 1,000)
    SAVE_WORRY: 3, // taking money out of savings meant for a goal (the course, the fund): the goal is set back, mind -3
    GIGS_PER_MONTH: 1, // a weekend side gig: one a month (the other weekends are rest; a UAE part-time permit covers set hours)
    LOW_MIND: 12, // a tired month (mind under 12 at its start): tired spending on delivery and taxis, and one more Impulse buy
    TIRED_SPEND: 400, // slips into the draw pile (stress and short-sighted spending: Haushofer and Fehr 2014). Burnout itself is at 0
    FOCUS: 3,
    HAND: 5,
    HAND_SAME: 2, // at most two copies of one card in a fresh hand while another kind is in the piles (js/engine.js varyHand)
    TURNS: 3,
    ZAKAT_RATE: 0.025,
    // gold nisab 85 g x AED 497.25 (24K, dubai-online.com gold rate, 10 Nov 2026) = AED 42,266. Some scholars use the silver nisab (595 g).
    NISAB: Math.round(85 * 497.25),
    COURSE_COST: 1200, // shop: a skills course...
    COURSE_RAISE: 300, // ...adds AED 300 to every later salary (example value)
    SPEND_JOY_PER: 250, // spending the leftover cash on fun lifts the mind a little: +1 per AED 250...
    SPEND_JOY_MAX: 8, // ...up to +8 (fun does not stack forever)
    LOAN: 1500, // a friend asks to borrow this (qard hasan: only the same amount comes back, two months later)
  };

  // cost = focus. kind: target = what the card is aimed at. Every card text is a result sentence (i18n c.<id>.d).
  PS.CARDS = {
    pay: { cost: 1, amt: 600, aim: 'bill', icon: 'coin', tone: 'cash' },
    // paying by card makes impulse buys easier (Prelec and Simester 2001; Thomas, Desai and Seenivasan 2011):
    // from month 2 each swipe slips an Impulse buy into the draw pile
    swipe: { cost: 0, amt: 900, aim: 'bill', icon: 'card', tone: 'debt' },
    buffer: { cost: 1, amt: 500, icon: 'shield', tone: 'save' },
    wait: { cost: 1, aim: 'sale', icon: 'hourglass', tone: 'calm' },
    treat: { cost: 1, amt: 150, mind: 6, icon: 'heart', tone: 'joy' },
    autosave: { cost: 1, amt: 300, power: true, icon: 'save', tone: 'save' },
    autopay: { cost: 1, power: true, icon: 'bill', tone: 'cash' },
    compare: { cost: 1, pct: 0.2, aim: 'bill', icon: 'search', tone: 'cash' },
    negotiate: { cost: 2, pct: 0.25, aim: 'deal', icon: 'hands', tone: 'cash' },
    refuse: { cost: 1, pull: 2, mind: -3, aim: 'sale', icon: 'close', tone: 'calm' },
    paycard: { cost: 1, amt: 1500, icon: 'card', tone: 'cash' }, // cash first, then savings (a transfer from your own account)
    snowball: { cost: 2, draw: 1, icon: 'snow', tone: 'cash' },
    budget: { cost: 0, draw: 2, exhaust: true, icon: 'chart', tone: 'calm' },
    sink: { cost: 1, amt: 400, icon: 'plane', tone: 'save' },
    lunch: { cost: 1, amt: 200, icon: 'food', tone: 'cash' },
    metro: { cost: 1, amt: 150, mind: -2, icon: 'metro', tone: 'cash' },
    sidegig: { cost: 2, amt: 450, mind: -8, icon: 'star', tone: 'cash' }, // a weekend of delivery or event work (about AED 300-500 in Dubai): real money, real tiredness
    invest: { cost: 1, amt: 1000, icon: 'seed', tone: 'save' },
    sadaqah: { cost: 1, amt: 100, mind: 4, icon: 'give', tone: 'joy' },
    cashadv: { cost: 0, amt: 1500, icon: 'card', tone: 'debt' },
    // in the hand while a breakdown is on screen and the emergency fund has money (js/engine_more.js fundCard): the fund
    // pays only when you choose to move the money, otherwise the breakdown goes on the card when it is due
    // pays a breakdown, or the part of the card bill cash cannot cover (the fund is for emergencies, not a free way to pay)
    fundpay: { cost: 0, aim: 'shock', temp: true, icon: 'shield', tone: 'save' },
    // when the emergency fund is empty and savings are not: break into savings (a transfer from your own account) for the same
    // problems. The goal the savings were for is set back (mind -SAVE_WORRY)
    savepay: { cost: 0, aim: 'shock', temp: true, mind: -PS.CONST.SAVE_WORRY, icon: 'save', tone: 'save' },
    // planned joy: the good spending of a special month (they are never enemies)
    iftar: { cost: 1, amt: 400, mind: 8, temp: true, icon: 'moon', tone: 'joy' },
    eidiya: { cost: 1, amt: 500, mind: 10, temp: true, icon: 'gift', tone: 'joy' },
    bnploffer: { cost: 0, amt: 3600, mind: 12, temp: true, icon: 'phone', tone: 'debt' },
    // burdens. An Impulse buy can be walked away from (1 focus) or dropped by Wait 24 hours; a reminder cannot be played
    impulse: { cost: 1, amt: 200, mind: -3, curse: true, icon: 'bag', tone: 'debt' },
    reminder: { cost: null, curse: true, icon: 'bill', tone: 'debt' },
  };

  PS.STARTER = ['pay', 'pay', 'pay', 'pay', 'buffer', 'buffer', 'swipe', 'swipe', 'wait', 'treat'];
  PS.TUTORIAL_DECK = ['pay', 'pay', 'pay', 'pay', 'buffer', 'buffer', 'swipe', 'swipe']; // month 1: three kinds only
  PS.REWARD_POOL = ['autosave', 'autopay', 'compare', 'negotiate', 'refuse', 'paycard', 'snowball', 'budget', 'sink',
    'lunch', 'metro', 'sidegig', 'invest', 'sadaqah', 'cashadv', 'pay', 'buffer', 'treat', 'wait'];

  // money problems. art = portrait in art_b/ (no portrait: the line icon). kind: bill = pay it by month end; shock = hits on a set turn (emergency fund first, then card);
  // deal = a raise you can talk down; sale = a pull on your wallet (Wait 24 hours walks it down)
  PS.FOES = {
    cardbill: { kind: 'card', art: 'enemy_card_bill', icon: 'card' }, // last month's card statement, due at the end of turn 2
    agent: { kind: 'bill', amt: 1100, art: 'enemy_rent', icon: 'key' }, // agent fee ~5% of a year's rent 21,600 (Bayut, Oct 2026)
    // at = the turn a bill arrives (0 = at the start of the month; the deposit is due on turn 2, when you get the keys). A room deposit (often one month of rent) comes back when you
    // move out, so it still counts in your net worth once paid
    // fixed: a set price (a contract deposit, a government fee or fine, a utility tariff): no quote to compare, nothing to negotiate
    deposit: { kind: 'bill', amt: 1800, at: 1, art: 'enemy_rent', icon: 'key', refund: true, fixed: true },
    // phone, power and DEWA bills are the part above the base plan in LIVING (roaming and extra data, summer air conditioning)
    // turn-3 bills keep the last turn of month 1 and month 10 a turn with something to decide:
    // a small van and two movers for a room's boxes, about AED 300-500; a yearly car service, about AED 300-600
    movers: { kind: 'bill', amt: 400, at: 2, art: 'enemy_rent', icon: 'home' },
    carserv: { kind: 'bill', amt: 450, at: 2, art: 'enemy_car', icon: 'car' },
    phone: { kind: 'bill', amt: 350, at: 1, art: 'enemy_phone', icon: 'phone' },
    subs: { kind: 'bill', amt: 200, grow: 50, art: 'enemy_subs', icon: 'tv' }, // one more app sign-up each turn
    fine: { kind: 'bill', amt: 400, at: 1, art: 'enemy_late_fee', icon: 'car', fixed: true },
    reg: { kind: 'bill', amt: 450, at: 1, art: 'enemy_reg', icon: 'car', fixed: true }, // yearly car registration
    salik: { kind: 'bill', amt: 200, at: 1, art: 'enemy_salik', icon: 'car', fixed: true }, // Salik road toll account top-up (AED 4 per gate in Dubai)
    trials: { kind: 'bill', amt: 150, grow: 50, art: 'enemy_subs', icon: 'tv' }, // free trials from the sales turn into paid plans, one more each turn
    // small breakdowns at the end of turn 3 keep months 3 and 4 busy to the last turn (cut the price, or top up the fund):
    // a laptop repair (battery or keyboard) about AED 300-500; a new tyre after a puncture about AED 250-450
    laptop: { kind: 'shock', amt: 350, hit: 2, art: 'enemy_laptop', icon: 'tv' },
    tyre: { kind: 'shock', amt: 300, hit: 2, art: 'enemy_tyre', icon: 'car' },
    landlord: { kind: 'deal', amt: 250, art: 'enemy_rent', icon: 'key' }, // +250 a month unless you negotiate
    // breakdowns cannot be paid before they happen. Rough Dubai price levels, to check locally before release:
    // car AC compressor about AED 2,000-3,500; an emergency root canal (basic insurance often leaves out dental) about AED 1,500-3,000
    carac: { kind: 'shock', amt: 3200, hit: 0, art: 'enemy_car', icon: 'car' }, // hits at the end of turn 1
    dewa: { kind: 'bill', amt: 450, grow: 150, art: 'enemy_dewa', icon: 'bolt', fixed: true }, // summer air conditioning on the DEWA bill
    gym: { kind: 'bill', amt: 250, at: 1, art: 'enemy_gym', icon: 'heart' },
    flight: { kind: 'bill', amt: 2200, art: 'enemy_flight', icon: 'plane', joy: 10, early: true, fixed: true }, // announced 3 months ahead; the fare for the dates you need is set when you book
    // a second bag for the gifts you take home (airline extra baggage, about AED 200-400): the flight month keeps a bill to
    // face even when Save ahead money paid the whole ticket (tools/regress_design.js M1)
    baggage: { kind: 'bill', amt: 250, art: 'enemy_flight', icon: 'plane', fixed: true }, // the airline's set fee
    glasses: { kind: 'shock', amt: 700, hit: 2, art: 'enemy_glasses', icon: 'glasses' }, // new prescription glasses, about AED 600-1,200
    power: { kind: 'bill', amt: 300, at: 1, art: 'enemy_dewa', icon: 'bolt', fixed: true },
    screen: { kind: 'shock', amt: 900, hit: 1, art: 'enemy_phone_crack', icon: 'phone' }, // a phone screen repair, about AED 600-1,500
    dental: { kind: 'shock', amt: 2800, hit: 1, art: 'enemy_dental', icon: 'tooth' },
    flash: { kind: 'sale', pull: 2, adds: 1, art: 'enemy_sale', icon: 'bag' },
    gadget: { kind: 'sale', pull: 2, adds: 1, mind: 2, art: 'enemy_sale', icon: 'phone' },
    megasale: { kind: 'sale', pull: 3, adds: 1, offer: 'bnploffer', art: 'enemy_bnpl', icon: 'phone' },
    whitefri: { kind: 'sale', pull: 2, adds: 1, mind: 2, art: 'enemy_sale', icon: 'tv' },
    dsf: { kind: 'sale', pull: 4, adds: 2, mind: 4, boss: true, art: 'enemy_sale', icon: 'bag' },
  };

  // trait = what the month is like (Ramadan and Eid are good times with planned joy, never enemies)
  PS.BASE_MONTHS = [
    { foes: ['agent', 'deposit', 'movers'], tut: true, ret: 0.006 },
    { foes: ['phone', 'subs'], trait: 'ramadan', cards: ['iftar', 'sadaqah'], ret: 0.004 },
    { foes: ['fine', 'flash', 'laptop'], trait: 'eid', cards: ['eidiya'], ret: 0.008 },
    { foes: ['FLEX', 'reg', 'tyre'], ret: 0.003 },
    { foes: ['FLEX', 'salik'], ret: 0.005 },
    { foes: ['dewa', 'gym'], trait: 'summer', ret: 0.007 },
    { foes: ['flight', 'baggage'], trait: 'summer', ret: 0.004 },
    { foes: ['gadget', 'glasses'], trait: 'dip', ret: 0 },
    { foes: ['megasale', 'power'], trait: 'sale', ret: 0.018 },
    // the second half keeps turns to face: bills that arrive mid-month (gym, power, trials) and the trials the mega sale signed you up for
    { foes: ['FLEX', 'trials', 'carserv'], at: { trials: 1 }, trait: 'friend', ret: 0.02 }, // at: this month the trials start billing on turn 2
    { foes: ['FLEX', 'whitefri'], trait: 'friday', ret: 0.019 },
    { foes: ['dsf', 'trials'], trait: 'yearend', ret: 0.02 },
  ];
  const FLEX_SLOTS = [3, 4, 9, 10];
  const FLEX_FOES = ['landlord', 'carac', 'screen', 'dental'];
  PS.SHOP_AFTER = [2, 5, 8]; // after months 3, 6 and 9
  PS.FLIGHT_MONTH = 6;
  PS.LATE_MONTH = 7; // the payroll delay month (fixed, so every class meets it)

  PS.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  PS.shuffle = function (arr, r) {
    const b = arr.slice();
    for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
    return b;
  };

  // one class code = one year: the same problems in the same months, the same fund returns, the same card offers
  PS.buildYear = function (seed) {
    const r = PS.rng(seed);
    const flex = PS.shuffle(FLEX_FOES, r);
    // the two big breakdowns never come back to back in months 4 and 5: one comes in spring, the other after the summer
    const big = (id) => id === 'carac' || id === 'dental';
    if (big(flex[0]) && big(flex[1])) { const x = flex[1]; flex[1] = flex[2]; flex[2] = x; }
    const r4 = (n) => Math.round(n * 10000) / 10000;
    return PS.BASE_MONTHS.map((m, i) => {
      const k = FLEX_SLOTS.indexOf(i);
      const foes = m.foes.map((f) => (f === 'FLEX' ? flex[k] : f));
      const ret = i < 7 ? r4(Math.max(0, m.ret + (r() - 0.5) * 0.004)) : i === 7 ? 0 : r4(0.016 + r() * 0.006);
      const out = Object.assign({}, m, { foes, ret });
      if (i === 7) out.dip = r4(0.05 + r() * 0.03); // the fund falls 5-8% this month (example values)
      if (i === PS.LATE_MONTH) out.late = true;
      return out;
    });
  };

  // class codes: 6 letters and digits without look-alikes (no I, O, 0, 1); the same code always gives the same year
  PS.CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  PS.cleanCode = (s) => String(s || '').toUpperCase().split('').filter((c) => PS.CODE_CHARS.indexOf(c) >= 0).join('').slice(0, 6);
  PS.randomCode = function () {
    const n = new Uint32Array(6);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(n);
    else for (let i = 0; i < 6; i++) n[i] = Math.floor(Math.random() * 4294967296);
    return Array.from(n, (v) => PS.CODE_CHARS[v % PS.CODE_CHARS.length]).join('');
  };
  PS.codeSeed = function (code) { // FNV-1a
    let h = 0x811c9dc5;
    for (let i = 0; i < code.length; i++) { h ^= code.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  };
})();
