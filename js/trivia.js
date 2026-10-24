/* =========================================================
   js/trivia.js - "Did You Know?" quiz (homepage)
   5 simple sustainability / recycling questions, 3 picked at random.
   Answer enough of them right and you win a coupon code.

   Saved in this browser's localStorage (no backend):
     "likhaluntianQuiz"        -> quiz in progress (which 3 questions, your answers, current step)
     "likhaluntianQuizCoupon"  -> the coupon you won { code, pct, earned }
   The checkout in script.js reads "likhaluntianQuizCoupon", so the code works in the promo box.

   Easy edits: ASK, PASS_SCORE, COUPON_PCT and QUESTIONS below.
   (In QUESTIONS the FIRST choice is the right one; the order is shuffled when the quiz runs.)
   ========================================================= */
(function () {
  "use strict";

  var STATE_KEY = "likhaluntianQuiz";
  var COUPON_KEY = "likhaluntianQuizCoupon";
  var ASK = 3;            // questions per round
  var PASS_SCORE = 2;     // right answers needed to win the coupon (set to 0 to give it to everyone who finishes)
  var COUPON_PCT = 10;    // percent off at checkout

  var QUESTIONS = [
    { q: "Which of these can be used again and again?",
      a: ["Reusable tote bag", "Plastic straw", "Paper cup"],
      fact: "One reusable bag can replace hundreds of single-use bags." },
    { q: "Where should an empty glass bottle go?",
      a: ["In the recycling bin", "In the regular trash", "Down the drain"],
      fact: "Glass can be recycled again and again without losing quality." },
    { q: "What do the three Rs stand for?",
      a: ["Reduce, Reuse, Recycle", "Rush, Repeat, Rest", "Remove, Replace, Repeat"],
      fact: "Reducing comes first, because the least waste is the waste never made." },
    { q: "Which of these breaks down naturally?",
      a: ["A banana peel", "A plastic bottle", "A styrofoam cup"],
      fact: "Food scraps can be composted into rich soil for plants." },
    { q: "What should you do with a plastic bottle before recycling it?",
      a: ["Empty and rinse it", "Leave the drink inside", "Wrap it in plastic"],
      fact: "Clean, empty containers are much easier to recycle." }
  ];

  var root = document.getElementById("trivia");
  var qEl = document.getElementById("triviaQuestion");
  var choicesEl = document.getElementById("triviaChoices");
  var fbEl = document.getElementById("triviaFeedback");
  var actEl = document.getElementById("triviaActions");
  if (!root || !qEl || !choicesEl || !fbEl || !actEl) return;     // not the homepage

  // ---------- helpers ----------
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function jget(k) { try { return JSON.parse(window.localStorage.getItem(k)); } catch (e) { return null; } }
  function jset(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full or blocked: quiz still works for this visit */ } }
  function rand(n) {
    if (window.crypto && window.crypto.getRandomValues) {
      var a = new Uint32Array(1); window.crypto.getRandomValues(a); return a[0] % n;
    }
    return Math.floor(Math.random() * n);
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = rand(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function button(label, cls, onClick) {
    var b = el("button", "trivia-btn" + (cls ? " " + cls : ""), label);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  }

  // ---------- state ----------
  function newGame() {
    var ids = shuffle(QUESTIONS.map(function (_, i) { return i; })).slice(0, ASK);
    return {
      picks: ids.map(function (id) {
        return { id: id, order: shuffle(QUESTIONS[id].a.map(function (_, i) { return i; })) };   // order[displayPos] = index in a[]
      }),
      answers: [],     // answers[step] = display position chosen
      step: 0
    };
  }
  function validState(s) {
    if (!s || !s.picks || s.picks.length !== ASK || typeof s.step !== "number" || !s.answers) return false;
    return s.picks.every(function (p) {
      return QUESTIONS[p.id] && p.order && p.order.length === QUESTIONS[p.id].a.length;
    });
  }
  var state = jget(STATE_KEY);
  if (!validState(state)) { state = newGame(); jset(STATE_KEY, state); }

  function isRight(step) { return state.picks[step].order[state.answers[step]] === 0; }
  function score() {
    var n = 0;
    for (var i = 0; i < ASK; i++) if (state.answers[i] !== undefined && isRight(i)) n++;
    return n;
  }

  // ---------- coupon ----------
  function makeCode() {
    var chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789", out = "";
    for (var i = 0; i < 5; i++) out += chars.charAt(rand(chars.length));
    return "LIKHA-" + out;
  }
  function getCoupon() {
    var c = jget(COUPON_KEY);
    if (!c || !c.code) { c = { code: makeCode(), pct: COUPON_PCT, earned: new Date().toISOString() }; jset(COUPON_KEY, c); }
    return c;
  }

  // ---------- views ----------
  function showQuestion() {
    var step = state.step, p = state.picks[step], Q = QUESTIONS[p.id];
    var answered = state.answers[step] !== undefined;

    qEl.textContent = "Question " + (step + 1) + " of " + ASK + ": " + Q.q;
    clear(choicesEl); clear(actEl); fbEl.textContent = ""; fbEl.className = "trivia-feedback";
    choicesEl.removeAttribute("aria-hidden");

    p.order.forEach(function (idx, pos) {
      var b = el("button", "trivia-choice", Q.a[idx]);
      b.type = "button";
      if (answered) {
        b.disabled = true;
        if (idx === 0) b.classList.add("is-correct");
        else if (pos === state.answers[step]) b.classList.add("is-wrong");
        else b.classList.add("is-dim");
      } else {
        b.addEventListener("click", function () {
          state.answers[step] = pos; jset(STATE_KEY, state); showQuestion();
        });
      }
      choicesEl.appendChild(b);
    });

    if (answered) {
      var right = isRight(step);
      fbEl.className = "trivia-feedback " + (right ? "is-ok" : "is-bad");
      fbEl.textContent = (right ? "Correct! " : "Not quite. The answer is " + Q.a[0] + ". ") + Q.fact;
      actEl.appendChild(button(step + 1 >= ASK ? "See my result" : "Next question", "", function () {
        state.step = step + 1; jset(STATE_KEY, state); render();
      }));
    }
  }

  function showResult() {
    var s = score(), passed = s >= PASS_SCORE;
    clear(choicesEl); clear(actEl); fbEl.className = "trivia-feedback";
    choicesEl.removeAttribute("aria-hidden");

    if (passed) {
      var c = getCoupon();
      qEl.textContent = "You got " + s + " of " + ASK + " right. Here is your coupon!";
      var card = el("div", "trivia-coupon");
      card.appendChild(el("span", "trivia-coupon-label", "Your coupon code"));
      card.appendChild(el("strong", "trivia-coupon-code", c.code));
      card.appendChild(el("span", "trivia-coupon-note", c.pct + "% off your order. Enter it in the promo box at checkout."));
      var copy = button("Copy code", "trivia-btn-alt", function () {
        function done() { copy.textContent = "Copied!"; setTimeout(function () { copy.textContent = "Copy code"; }, 1800); }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(c.code).then(done, function () { copy.textContent = "Press Ctrl+C"; });
        } else {
          var t = el("textarea"); t.value = c.code; document.body.appendChild(t); t.select();
          try { document.execCommand("copy"); done(); } catch (e) { copy.textContent = "Press Ctrl+C"; }
          document.body.removeChild(t);
        }
      });
      card.appendChild(copy);
      choicesEl.appendChild(card);
      fbEl.className = "trivia-feedback is-ok";
      fbEl.textContent = "Your code is saved in this browser, so you can use it any time.";
      var shop = el("a", "trivia-btn", "Shop now");
      shop.href = "categories.html";
      actEl.appendChild(shop);
      actEl.appendChild(button("Play again", "trivia-btn-alt", restart));
    } else {
      qEl.textContent = "You got " + s + " of " + ASK + " right. You need " + PASS_SCORE + " to win a coupon.";
      var card2 = el("div", "trivia-coupon is-miss");
      card2.appendChild(el("span", "trivia-coupon-label", "Your score"));
      card2.appendChild(el("strong", "trivia-coupon-code", s + " / " + ASK));
      card2.appendChild(el("span", "trivia-coupon-note", "Almost there! Try again with a new set of questions."));
      choicesEl.appendChild(card2);
      actEl.appendChild(button("Try again", "", restart));
    }
  }

  function restart() { state = newGame(); jset(STATE_KEY, state); render(); }
  function render() { if (state.step >= ASK) showResult(); else showQuestion(); }

  render();
})();
