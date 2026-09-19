// Post-16 Investing Game - session-based quiz with bank/gamble spinner rounds.
// Uses the same Firebase project as the original game but a separate root
// path ('gamesPost16') so the two versions never collide.

let currentGameCode = null;
let playerId = null;
let playerName = "";
let isAdmin = false;

let currentQuestionIndex = 0;
let currentSection = 0;
let pendingOptionIndex = null;
let isAdvancingQuestion = false;
let sessionWinnings = 0;
let answeredQuestions = {}; // keyed by `${section}-${index}`
let adminLastSpinId = null;
let spinAnimationTimer = null;
let adminSpinAnimationTimer = null;
let adminContinueReady = true;

const SECTION_COUNT = QUIZ_SECTIONS_POST16.length;
const QUESTIONS_PER_SECTION = 4;
const SPIN_DURATION_MS = 4200;
const STARTING_BALANCE = 1000;

let gameRef = null;

// --- SCREEN NAVIGATION ---
function showScreen(screenId) {
  const screens = ['screen-home', 'screen-admin', 'screen-lobby', 'screen-quiz', 'screen-choice', 'screen-spin', 'screen-final'];
  screens.forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(screenId).classList.remove('hidden');
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function dbRoot() {
  return db.ref('gamesPost16');
}

// --- ADMIN: CREATE / REJOIN ---
function createGame() {
  const code = generateCode();
  currentGameCode = code;
  isAdmin = true;

  gameRef = dbRoot().child(code);
  gameRef.set({
    created: Date.now(),
    state: 'LOBBY', // LOBBY, QUIZ, CHOICE, SPINNING, FINAL
    currentSection: 0,
    spinner: null,
    players: {}
  });

  document.getElementById('admin-game-code').innerText = code;
  showScreen('screen-admin');
  listenToGameAsAdmin();
}

function openLiveGamesModal() {
  toggleLiveGamesModal(true);
}

function toggleLiveGamesModal(show) {
  const modal = document.getElementById('live-games-modal');
  if (!modal) return;
  if (!show) {
    modal.classList.add('hidden');
    return;
  }
  modal.classList.remove('hidden');
  const body = document.getElementById('live-games-body');
  body.innerHTML = '<p class="text-center">Loading...</p>';

  dbRoot().once('value', snapshot => {
    const games = snapshot.val() || {};
    const liveEntries = Object.entries(games)
      .filter(([, g]) => g && g.state !== 'FINAL')
      .sort(([, a], [, b]) => (b.created || 0) - (a.created || 0));

    if (liveEntries.length === 0) {
      body.innerHTML = '<p class="text-center">No live games in progress.</p>';
      return;
    }

    const items = liveEntries.map(([code, g]) => {
      const playerCount = g.players ? Object.keys(g.players).length : 0;
      return `<li>
        <span><strong>${code}</strong> &middot; ${g.state || 'LOBBY'} &middot; ${playerCount} player${playerCount === 1 ? '' : 's'}</span>
        <button class="btn btn-purple btn-sm" onclick="rejoinAsAdmin('${code}')">Rejoin as admin</button>
      </li>`;
    }).join('');

    body.innerHTML = `<ul class="live-games-list">${items}</ul>`;
  });
}

function rejoinAsAdmin(code) {
  currentGameCode = code;
  isAdmin = true;

  gameRef = dbRoot().child(code);
  document.getElementById('admin-game-code').innerText = code;
  toggleLiveGamesModal(false);
  showScreen('screen-admin');
  listenToGameAsAdmin();
}

// --- ADMIN: LISTEN & CONTROL ---
function listenToGameAsAdmin() {
  gameRef.on('value', snapshot => {
    const data = snapshot.val();
    if (!data) return;

    const section = data.currentSection || 0;
    const players = data.players || {};
    const playerEntries = Object.entries(players);
    const tbody = document.getElementById('admin-players-list');
    tbody.innerHTML = '';

    playerEntries.forEach(([pId, p]) => {
      const quizProgress = p.quizFinished ? 'Completed' : `${p.quizIndex || 0}/${QUESTIONS_PER_SECTION}`;
      const choiceTag = data.state === 'CHOICE' || data.state === 'SPINNING'
        ? (p.choice === 'bank' ? '<span class="player-choice-tag tag-bank">Banked</span>'
          : p.choice === 'gamble' ? '<span class="player-choice-tag tag-gamble">Gambling</span>'
          : '<span class="player-choice-tag tag-pending">Deciding…</span>')
        : '—';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${p.name}</strong></td>
        <td>${quizProgress}</td>
        <td>£${p.sessionWinnings || 0}</td>
        <td><strong>£${Math.round(p.balance || 0).toLocaleString()}</strong></td>
        <td>${choiceTag}</td>
      `;
      tbody.appendChild(tr);
    });

    const actionsDiv = document.getElementById('admin-actions');
    const statusText = document.getElementById('admin-status-text');
    const sectionTitle = QUIZ_SECTIONS_POST16[section] ? QUIZ_SECTIONS_POST16[section].title : '';

    if (data.state === 'LOBBY') {
      statusText.innerText = `Lobby open. ${playerEntries.length} player(s) joined.`;
      actionsDiv.innerHTML = `<button class="btn btn-gray" onclick="toggleQuizPreviewModal(true)">View Quiz Questions</button><button class="btn btn-green" onclick="adminStartSection(0)">Start Session 1 Quiz (${QUIZ_SECTIONS_POST16[0].title})</button>`;
    } else if (data.state === 'QUIZ') {
      const finishedCount = Object.values(players).filter(p => p.quizFinished).length;
      statusText.innerText = `Session ${section + 1}: ${sectionTitle} — ${finishedCount}/${playerEntries.length} players finished.`;
      actionsDiv.innerHTML = `<button class="btn btn-gray" onclick="toggleQuizPreviewModal(true)">View Quiz Questions</button><button class="btn btn-purple" onclick="adminMoveToChoice()">Reveal Bank or Gamble</button>`;
    } else if (data.state === 'CHOICE') {
      const decidedCount = Object.values(players).filter(p => p.choice).length;
      statusText.innerText = `Waiting on players to bank or gamble (${decidedCount}/${playerEntries.length} decided).`;
      actionsDiv.innerHTML = `<button class="btn btn-green" onclick="adminSpin()">🎡 Spin the Wheel</button>`;
    } else if (data.state === 'SPINNING') {
      const isLast = section >= SECTION_COUNT - 1;
      statusText.innerText = `Spinning… result: ${data.spinner && data.spinner.result ? data.spinner.result.toUpperCase() : '—'}`;
      const label = isLast ? 'Show Final Leaderboard' : `Continue to Session ${section + 2} Quiz`;
      actionsDiv.innerHTML = `<button class="btn btn-purple" id="admin-continue-btn" onclick="adminAdvance()">${label}</button>`;
      // Give players time to watch the spin before admin can advance.
      const btn = document.getElementById('admin-continue-btn');
      if (btn && !adminContinueReady) {
        btn.disabled = true;
        btn.innerText = 'Spinning…';
      }
    } else if (data.state === 'FINAL') {
      statusText.innerText = 'Game completed!';
      actionsDiv.innerHTML = '';
    }

    if (data.state === 'SPINNING' && data.spinner && data.spinner.spinId !== adminLastSpinId) {
      adminLastSpinId = data.spinner.spinId;
      adminContinueReady = false;
      renderSpinScreen(data, null, 'admin-');
      setTimeout(() => {
        adminContinueReady = true;
        const btn = document.getElementById('admin-continue-btn');
        if (btn) {
          btn.disabled = false;
          btn.innerText = section >= SECTION_COUNT - 1 ? 'Show Final Leaderboard' : `Continue to Session ${section + 2} Quiz`;
        }
      }, SPIN_DURATION_MS + 300);
    }
  });
}

function adminStartSection(sectionIndex) {
  const updates = { state: 'QUIZ', currentSection: sectionIndex, spinner: null };
  gameRef.child('players').once('value', snapshot => {
    const players = snapshot.val() || {};
    const playerUpdates = {};
    Object.keys(players).forEach(pId => {
      playerUpdates[`players/${pId}/quizIndex`] = 0;
      playerUpdates[`players/${pId}/quizFinished`] = false;
      playerUpdates[`players/${pId}/sessionWinnings`] = 0;
      playerUpdates[`players/${pId}/choice`] = null;
    });
    gameRef.update({ ...updates, ...playerUpdates });
  });
}

function adminMoveToChoice() {
  gameRef.update({ state: 'CHOICE' });
}

function adminSpin() {
  gameRef.once('value', snapshot => {
    const data = snapshot.val() || {};
    const section = data.currentSection || 0;
    const players = data.players || {};
    const result = Math.random() < 0.5 ? 'green' : 'red';
    const angle = computeSpinAngle(result);
    const spinId = Date.now();

    const updates = {
      state: 'SPINNING',
      spinner: { spinId, result, angle }
    };

    Object.entries(players).forEach(([pId, p]) => {
      const choice = p.choice || 'bank'; // default to banking if a player never decided
      const winnings = p.sessionWinnings || 0;
      const outcome = choice === 'gamble'
        ? (result === 'green' ? winnings * 2 : 0)
        : winnings;
      const newBalance = (p.balance || 0) + outcome;
      updates[`players/${pId}/balance`] = newBalance;
      updates[`players/${pId}/choice`] = choice;
      updates[`players/${pId}/history/section${section}`] = {
        title: QUIZ_SECTIONS_POST16[section].title,
        sessionWinnings: winnings,
        choice,
        spinResult: result,
        outcome,
        newBalance
      };
    });

    gameRef.update(updates);
  });
}

function adminAdvance() {
  gameRef.once('value', snapshot => {
    const data = snapshot.val() || {};
    const section = data.currentSection || 0;
    if (section >= SECTION_COUNT - 1) {
      gameRef.update({ state: 'FINAL' });
    } else {
      adminStartSection(section + 1);
    }
  });
}

// --- WHEEL ANGLE CALCULATION ---
// The wheel background alternates 45deg segments (green, red, green, red, ...) starting at the
// top under the fixed pointer. We pick a random segment matching the desired result and rotate
// the wheel so that segment ends up under the pointer, plus several full spins for visual effect.
function computeSpinAngle(result) {
  const segments = ['green', 'red', 'green', 'red', 'green', 'red', 'green', 'red'];
  const segmentSize = 360 / segments.length;
  const matchingIndexes = segments.map((c, i) => (c === result ? i : null)).filter(i => i !== null);
  const idx = matchingIndexes[Math.floor(Math.random() * matchingIndexes.length)];
  const center = idx * segmentSize + segmentSize / 2;
  const jitter = (Math.random() * 16) - 8; // stay within the segment, away from the boundary
  let baseMod = (360 - (center + jitter)) % 360;
  if (baseMod < 0) baseMod += 360;
  const fullSpins = 5;
  return fullSpins * 360 + baseMod;
}

// --- PLAYER JOIN & SYNC ---
function joinGame() {
  const name = document.getElementById('player-name-input').value.trim();
  const code = document.getElementById('join-code-input').value.trim().toUpperCase();

  if (!name || !code) {
    alert("Please enter your name and a valid room code.");
    return;
  }

  dbRoot().child(code).once('value', snapshot => {
    if (!snapshot.exists()) {
      alert("Game session not found!");
      return;
    }

    currentGameCode = code;
    playerName = name;
    dbRoot().child(code).child('players').once('value', playersSnapshot => {
      const players = playersSnapshot.val() || {};
      const existingEntry = Object.entries(players).find(([, p]) => (p.name || '').toLowerCase() === name.toLowerCase());

      if (existingEntry) {
        playerId = existingEntry[0];
        const existing = existingEntry[1] || {};
        sessionWinnings = existing.sessionWinnings || 0;
        currentQuestionIndex = existing.quizIndex || 0;
      } else {
        playerId = dbRoot().child(code).child('players').push().key;
        dbRoot().child(code).child('players').child(playerId).set({
          name: name,
          balance: STARTING_BALANCE,
          quizIndex: 0,
          quizFinished: false,
          sessionWinnings: 0,
          choice: null
        });
        sessionWinnings = 0;
        currentQuestionIndex = 0;
      }

      document.getElementById('lobby-code-display').innerText = code;
      const lobbyTitle = document.getElementById('lobby-title');
      if (lobbyTitle) lobbyTitle.innerText = "You're In!";
      showScreen('screen-lobby');
      updateBalancePill(existingEntry ? existingEntry[1].balance : STARTING_BALANCE);

      listenToGameAsPlayer();
    });
  });
}

function listenToGameAsPlayer() {
  dbRoot().child(currentGameCode).on('value', snapshot => {
    const data = snapshot.val();
    if (!data) return;

    const myData = data.players ? data.players[playerId] : null;
    if (!myData) return;

    currentSection = data.currentSection || 0;
    sessionWinnings = myData.sessionWinnings || 0;
    currentQuestionIndex = myData.quizIndex || 0;
    updateBalancePill(myData.balance);

    if (data.state === 'QUIZ') {
      showScreen('screen-quiz');
      renderQuestion();
    } else if (data.state === 'CHOICE') {
      showScreen('screen-choice');
      renderChoiceScreen(myData);
    } else if (data.state === 'SPINNING') {
      showScreen('screen-spin');
      renderSpinScreen(data, myData);
    } else if (data.state === 'FINAL') {
      showScreen('screen-final');
      renderFinalLeaderboard(data.players);
    } else if (data.state === 'LOBBY') {
      showScreen('screen-lobby');
    }
  });
}

// --- QUIZ LOGIC ---
function renderQuestion() {
  isAdvancingQuestion = false;
  const questions = QUIZ_SECTIONS_POST16[currentSection].questions;

  if (currentQuestionIndex >= questions.length) {
    dbRoot().child(currentGameCode).child('players').child(playerId).update({ quizFinished: true });
    const codeEl = document.getElementById('lobby-code-display');
    if (codeEl) codeEl.innerText = currentGameCode || '---';
    const lobbyTitle = document.getElementById('lobby-title');
    if (lobbyTitle) lobbyTitle.innerText = 'Session complete!';
    const waitEl = document.getElementById('lobby-waiting-text');
    if (waitEl) waitEl.innerText = `You earned £${sessionWinnings} this session. Waiting for the host to reveal Bank or Gamble…`;
    showScreen('screen-lobby');
    return;
  }

  const q = questions[currentQuestionIndex];
  const sectionBadge = document.getElementById('quiz-section-badge');
  if (sectionBadge) sectionBadge.innerText = QUIZ_SECTIONS_POST16[currentSection].title;
  document.getElementById('quiz-question-num').innerText = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
  document.getElementById('quiz-cash-display').innerText = `£${sessionWinnings}`;
  document.getElementById('quiz-question-text').innerText = q.question;
  document.getElementById('quiz-feedback-box').classList.add('hidden');

  const container = document.getElementById('quiz-options-container');
  container.innerHTML = '';
  const answerKey = `${currentSection}-${currentQuestionIndex}`;
  const answered = answeredQuestions[answerKey];
  q.options.forEach((opt, idx) => {
    const card = document.createElement('div');
    card.className = 'option-card';
    card.setAttribute('data-option-idx', idx);
    card.innerText = opt;
    if (answered) {
      card.onclick = null;
      if (idx === answered.chosen) {
        card.classList.add(answered.isCorrect ? 'correct' : 'wrong');
      }
      if (idx === q.answer) card.classList.add('correct');
    } else {
      card.onclick = () => openConfirmModal(idx);
    }
    container.appendChild(card);
  });

  if (answered) {
    const fbBox = document.getElementById('quiz-feedback-box');
    fbBox.classList.remove('hidden');
    document.getElementById('quiz-feedback-text').innerHTML = buildQuizFeedbackHtml(q, answered.isCorrect);
  }
}

function buildQuizFeedbackHtml(question, isCorrect) {
  const topLine = isCorrect
    ? `<strong style="color:var(--green-primary)">Correct! +£100 added to this session's winnings.</strong>`
    : `<strong style="color:var(--red-accent)">Incorrect. No funds added for this question.</strong>`;
  const explanation = question && question.explanation
    ? `<p style="margin-top:8px;">${question.explanation}</p>`
    : '';
  return `${topLine}${explanation}`;
}

function openConfirmModal(optIdx) {
  pendingOptionIndex = optIdx;
  const q = QUIZ_SECTIONS_POST16[currentSection].questions[currentQuestionIndex];
  document.getElementById('confirm-option-text').innerText = q.options[optIdx];
  document.getElementById('confirm-modal').classList.remove('hidden');
}

function closeConfirmModal() {
  document.getElementById('confirm-modal').classList.add('hidden');
}

function confirmAnswer() {
  closeConfirmModal();
  const q = QUIZ_SECTIONS_POST16[currentSection].questions[currentQuestionIndex];
  const isCorrect = pendingOptionIndex === q.answer;
  const cards = document.querySelectorAll('.option-card');
  cards.forEach(card => card.onclick = null);

  const chosenCard = document.querySelector(`.option-card[data-option-idx="${pendingOptionIndex}"]`);
  const correctCard = document.querySelector(`.option-card[data-option-idx="${q.answer}"]`);

  if (isCorrect) {
    if (chosenCard) chosenCard.classList.add('correct');
    sessionWinnings += 100;
  } else {
    if (chosenCard) chosenCard.classList.add('wrong');
    if (correctCard) correctCard.classList.add('correct');
  }

  const answerKey = `${currentSection}-${currentQuestionIndex}`;
  answeredQuestions[answerKey] = { chosen: pendingOptionIndex, isCorrect };

  dbRoot().child(currentGameCode).child('players').child(playerId).update({
    sessionWinnings: sessionWinnings
  });

  const fbBox = document.getElementById('quiz-feedback-box');
  fbBox.classList.remove('hidden');
  document.getElementById('quiz-feedback-text').innerHTML = buildQuizFeedbackHtml(q, isCorrect);
  document.getElementById('quiz-cash-display').innerText = `£${sessionWinnings}`;
}

function nextQuestion() {
  if (isAdvancingQuestion) return;
  isAdvancingQuestion = true;
  currentQuestionIndex++;
  dbRoot().child(currentGameCode).child('players').child(playerId).update({
    quizIndex: currentQuestionIndex
  });
  renderQuestion();
}

// --- BANK OR GAMBLE ---
function renderChoiceScreen(myData) {
  const sectionBadge = document.getElementById('choice-section-badge');
  if (sectionBadge) sectionBadge.innerText = QUIZ_SECTIONS_POST16[currentSection].title;
  document.getElementById('choice-winnings-display').innerText = `£${myData.sessionWinnings || 0}`;

  const actionsRow = document.getElementById('choice-actions-row');
  const madeBanner = document.getElementById('choice-made-banner');

  if (myData.choice) {
    actionsRow.classList.add('hidden');
    madeBanner.classList.remove('hidden');
    madeBanner.innerText = myData.choice === 'bank'
      ? `You chose to BANK your £${myData.sessionWinnings || 0}. Watch the host's screen for the spin!`
      : `You chose to GAMBLE your £${myData.sessionWinnings || 0}. Watch the host's screen for the spin!`;
  } else {
    actionsRow.classList.remove('hidden');
    madeBanner.classList.add('hidden');
  }
}

function makeChoice(choice) {
  dbRoot().child(currentGameCode).child('players').child(playerId).update({ choice });
}

// --- SPINNER ---
// prefix distinguishes the admin's wheel elements ('admin-') from the player's ('').
function renderSpinScreen(data, myData, prefix = '') {
  const wheel = document.getElementById(`${prefix}wheel`);
  const banner = document.getElementById(`${prefix}spin-result-banner`);
  const statusRow = document.getElementById(`${prefix}spin-status-row`);
  if (!wheel || !banner || !statusRow || !data.spinner) return;

  const spinTracker = prefix === 'admin-' ? 'adminSpinTrackedId' : 'spinTrackedId';
  if (wheel.dataset[spinTracker] === String(data.spinner.spinId)) return;
  wheel.dataset[spinTracker] = String(data.spinner.spinId);

  banner.classList.remove('visible', 'result-green', 'result-red');
  banner.innerText = '';
  statusRow.innerText = 'Spinning… good luck!';

  wheel.style.transition = 'none';
  wheel.style.transform = 'rotate(0deg)';
  // Force reflow so the browser applies the reset before animating again.
  void wheel.offsetWidth;
  wheel.style.transition = '';
  requestAnimationFrame(() => {
    wheel.style.transform = `rotate(${data.spinner.angle}deg)`;
  });

  const timerKey = prefix === 'admin-' ? 'adminSpinAnimationTimer' : 'spinAnimationTimer';
  if (timerKey === 'adminSpinAnimationTimer') {
    if (adminSpinAnimationTimer) clearTimeout(adminSpinAnimationTimer);
  } else if (spinAnimationTimer) {
    clearTimeout(spinAnimationTimer);
  }

  const timer = setTimeout(() => {
    const result = data.spinner.result;
    banner.classList.add('visible', result === 'green' ? 'result-green' : 'result-red');
    banner.innerText = result === 'green' ? '🟢 GREEN — winnings doubled!' : '🔴 RED — session winnings lost!';

    if (myData) {
      const section = data.currentSection || 0;
      const hist = myData.history && myData.history['section' + section] ? myData.history['section' + section] : null;
      if (hist) {
        const outcomeText = hist.choice === 'bank'
          ? `You banked £${hist.sessionWinnings}. New balance: £${Math.round(hist.newBalance).toLocaleString()}.`
          : hist.spinResult === 'green'
            ? `You gambled and WON! £${hist.sessionWinnings} doubled to £${hist.outcome}. New balance: £${Math.round(hist.newBalance).toLocaleString()}.`
            : `You gambled and lost your £${hist.sessionWinnings} winnings this session. New balance: £${Math.round(hist.newBalance).toLocaleString()}.`;
        statusRow.innerText = outcomeText;
      } else {
        statusRow.innerText = 'Waiting for the host to continue…';
      }
    } else {
      statusRow.innerText = 'Balances have been updated for every player.';
    }
  }, SPIN_DURATION_MS);

  if (prefix === 'admin-') {
    adminSpinAnimationTimer = timer;
  } else {
    spinAnimationTimer = timer;
  }
}

// --- FINAL LEADERBOARD ---
function renderFinalLeaderboard(playersObj) {
  const entries = Object.entries(playersObj || {}).sort(([, a], [, b]) => (b.balance || 0) - (a.balance || 0));
  const container = document.getElementById('final-leaderboard-container');
  const headingEl = document.getElementById('final-heading');

  const myIndex = entries.findIndex(([id]) => id === playerId);
  if (headingEl) {
    if (myIndex === 0) {
      headingEl.innerText = 'Congratulations! You finished 1st!';
    } else if (myIndex >= 0) {
      headingEl.innerText = `You finished ${formatOrdinal(myIndex + 1)}!`;
    } else {
      headingEl.innerText = '🎉 Game Complete!';
    }
  }

  let html = `<table class="data-table"><thead><tr><th>Rank</th><th>Player</th><th>Balance</th></tr></thead><tbody>`;
  entries.forEach(([, p], idx) => {
    html += `<tr>
      <td>#${idx + 1}</td>
      <td><strong>${p.name}</strong></td>
      <td><strong>£${Math.round(p.balance || 0).toLocaleString()}</strong></td>
    </tr>`;
  });
  html += `</tbody></table>`;
  if (container) container.innerHTML = html;
}

function formatOrdinal(position) {
  const mod100 = position % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${position}th`;
  const mod10 = position % 10;
  if (mod10 === 1) return `${position}st`;
  if (mod10 === 2) return `${position}nd`;
  if (mod10 === 3) return `${position}rd`;
  return `${position}th`;
}

function updateBalancePill(balanceValue) {
  const pill = document.getElementById('balance-pill');
  const valueEl = document.getElementById('balance-pill-value');
  if (!pill || !valueEl) return;
  const displayValue = typeof balanceValue === 'number' ? balanceValue : 0;
  valueEl.innerText = `£${Math.round(displayValue).toLocaleString()}`;
  pill.classList.toggle('hidden', !currentGameCode || !playerId);
}

function toggleQuizPreviewModal(show) {
  const modal = document.getElementById('quiz-preview-modal');
  if (!modal) return;
  if (!show) {
    modal.classList.add('hidden');
    return;
  }
  const body = document.getElementById('quiz-preview-body');
  if (!body) return;
  body.innerHTML = QUIZ_SECTIONS_POST16.map((section, sIdx) => `
    <h3 class="section-title-badge">Session ${sIdx + 1}: ${section.title}</h3>
    ${section.questions.map((q, idx) => `
      <div class="quiz-preview-item">
        <h4>${idx + 1}. ${q.question}</h4>
        <ul>
          ${q.options.map((opt, optionIdx) => `<li class="${optionIdx === q.answer ? 'quiz-answer-correct' : ''}">${opt}${optionIdx === q.answer ? ' ✅' : ''}</li>`).join('')}
        </ul>
      </div>
    `).join('')}
  `).join('');
  modal.classList.remove('hidden');
}

const joinCodeInput = document.getElementById('join-code-input');
if (joinCodeInput) {
  joinCodeInput.addEventListener('input', () => {
    joinCodeInput.value = (joinCodeInput.value || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  });
}
