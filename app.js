// State Variables
let currentGameCode = null;
let playerId = null;
let playerName = "";
let isAdmin = false;

let currentQuestionIndex = 0;
let pendingOptionIndex = null;
let quizScore = 1000;

// Game State listener
let gameRef = null;

// --- SCREEN NAVIGATION ---
function showScreen(screenId) {
  const screens = ['screen-home', 'screen-admin', 'screen-lobby', 'screen-quiz', 'screen-allocate', 'screen-results', 'screen-final'];
  screens.forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(screenId).classList.remove('hidden');
}

// --- HELPER: GENERATE CODE ---
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// --- ADMIN FUNCTIONS ---
function createGame() {
  const code = generateCode();
  currentGameCode = code;
  isAdmin = true;

  gameRef = db.ref('games/' + code);
  gameRef.set({
    created: Date.now(),
    state: 'LOBBY', // LOBBY, QUIZ, ALLOCATING, RESULTS, FINAL
    currentYear: 1,
    players: {}
  });

  document.getElementById('admin-game-code').innerText = code;
  showScreen('screen-admin');
  document.getElementById('global-leaderboard-btn').classList.remove('hidden');
  listenToGameAsAdmin();
}

function listenToGameAsAdmin() {
  gameRef.on('value', snapshot => {
    const data = snapshot.val();
    if (!data) return;

    const players = data.players || {};
    const playerList = Object.values(players);
    const tbody = document.getElementById('admin-players-list');
    tbody.innerHTML = '';

    playerList.forEach(p => {
      const isAllocated = p.allocations && p.allocations['year' + data.currentYear];
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${p.name}</strong></td>
        <td>${p.quizFinished ? 'Completed' : (p.quizIndex || 0) + '/8'}</td>
        <td>+£${(p.quizScore || 1000) - 1000}</td>
        <td><strong>£${Math.round(p.balance || 1000).toLocaleString()}</strong></td>
        <td>${isAllocated ? '✅ Submitted' : '⏳ Pending'}</td>
      `;
      tbody.appendChild(tr);
    });

    // Update Control Buttons
    const actionsDiv = document.getElementById('admin-actions');
    const statusText = document.getElementById('admin-status-text');

    if (data.state === 'LOBBY') {
      statusText.innerText = `Lobby open. ${playerList.length} player(s) joined.`;
      actionsDiv.innerHTML = `<button class="btn btn-green" onclick="adminChangeState('QUIZ')">Start Quiz Phase</button>`;
    } else if (data.state === 'QUIZ') {
      const allDone = playerList.length > 0 && playerList.every(p => p.quizFinished);
      statusText.innerText = allDone ? "All players finished the quiz!" : "Players are completing questions...";
      actionsDiv.innerHTML = `<button class="btn btn-purple" onclick="adminChangeState('ALLOCATING')">Start Year 1 Investment</button>`;
    } else if (data.state === 'ALLOCATING') {
      const year = data.currentYear;
      const allSubmitted = playerList.length > 0 && playerList.every(p => p.allocations && p.allocations['year' + year]);
      statusText.innerText = `Year ${year}: ${allSubmitted ? 'All allocations in!' : 'Waiting for portfolio allocations...'}`;
      actionsDiv.innerHTML = `<button class="btn btn-green" onclick="processYearSimulation(${year})">Simulate Year ${year}</button>`;
    } else if (data.state === 'RESULTS') {
      const year = data.currentYear;
      statusText.innerText = `Year ${year} complete. View results or advance.`;
      if (year < 6) {
        actionsDiv.innerHTML = `<button class="btn btn-purple" onclick="adminNextYear(${year + 1})">Advance to Year ${year + 1}</button>`;
      } else {
        actionsDiv.innerHTML = `<button class="btn btn-green" onclick="adminChangeState('FINAL')">Show Final Leaderboard</button>`;
      }
    } else if (data.state === 'FINAL') {
      statusText.innerText = "Game completed!";
      actionsDiv.innerHTML = ``;
    }
  });
}

function adminChangeState(newState) {
  gameRef.update({ state: newState });
}

function adminNextYear(nextYr) {
  gameRef.update({
    currentYear: nextYr,
    state: 'ALLOCATING'
  });
}

function processYearSimulation(year) {
  const returns = YEAR_RETURNS.find(r => r.year === year);
  gameRef.child('players').once('value', snapshot => {
    const players = snapshot.val() || {};
    const updates = {};

    Object.keys(players).forEach(pId => {
      const p = players[pId];
      const alloc = p.allocations['year' + year];
      const newCash = alloc.cash * (1 + returns.cash);
      const newBonds = alloc.bonds * (1 + returns.bonds);
      const newCommodities = alloc.commodities * (1 + returns.commodities);
      const newEquities = alloc.equities * (1 + returns.equities);
      const newTotal = newCash + newBonds + newCommodities + newEquities;

      updates[`players/${pId}/balance`] = newTotal;
      updates[`players/${pId}/history/year${year}`] = {
        alloc,
        returns,
        newBalance: newTotal
      };
    });

    updates['state'] = 'RESULTS';
    gameRef.update(updates);
  });
}

// --- PLAYER JOIN & SYNC ---
function joinGame() {
  const name = document.getElementById('player-name-input').value.trim();
  const code = document.getElementById('join-code-input').value.trim().toUpperCase();

  if (!name || !code) {
    alert("Please enter your name and a valid room code.");
    return;
  }

  db.ref('games/' + code).once('value', snapshot => {
    if (!snapshot.exists()) {
      alert("Game session not found!");
      return;
    }

    currentGameCode = code;
    playerName = name;
    playerId = db.ref('games/' + code + '/players').push().key;

    db.ref(`games/${code}/players/${playerId}`).set({
      name: name,
      balance: 1000,
      quizScore: 1000,
      quizIndex: 0,
      quizFinished: false
    });

    document.getElementById('lobby-code-display').innerText = code;
    showScreen('screen-lobby');
    document.getElementById('global-leaderboard-btn').classList.remove('hidden');

    listenToGameAsPlayer();
  });
}

function listenToGameAsPlayer() {
  db.ref('games/' + currentGameCode).on('value', snapshot => {
    const data = snapshot.val();
    if (!data) return;

    const myData = data.players ? data.players[playerId] : null;

    if (data.state === 'QUIZ') {
      showScreen('screen-quiz');
      renderQuestion();
    } else if (data.state === 'ALLOCATING') {
      showScreen('screen-allocate');
      setupAllocationScreen(data.currentYear, myData);
    } else if (data.state === 'RESULTS') {
      showScreen('screen-results');
      renderResultsScreen(data.currentYear, myData);
    } else if (data.state === 'FINAL') {
      showScreen('screen-final');
      renderFinalLeaderboard(data.players);
    }
  });
}

// --- QUIZ LOGIC ---
function renderQuestion() {
  if (currentQuestionIndex >= QUIZ_QUESTIONS.length) {
    db.ref(`games/${currentGameCode}/players/${playerId}`).update({ quizFinished: true });
    return;
  }

  const q = QUIZ_QUESTIONS[currentQuestionIndex];
  document.getElementById('quiz-question-num').innerText = `Question ${currentQuestionIndex + 1} of 8`;
  document.getElementById('quiz-cash-display').innerText = `£${quizScore}`;
  document.getElementById('quiz-question-text').innerText = q.question;
  document.getElementById('quiz-feedback-box').classList.add('hidden');

  const container = document.getElementById('quiz-options-container');
  container.innerHTML = '';
  q.options.forEach((opt, idx) => {
    const card = document.createElement('div');
    card.className = 'option-card';
    card.innerText = opt;
    card.onclick = () => openConfirmModal(idx);
    container.appendChild(card);
  });
}

function openConfirmModal(optIdx) {
  pendingOptionIndex = optIdx;
  document.getElementById('confirm-option-text').innerText = QUIZ_QUESTIONS[currentQuestionIndex].options[optIdx];
  document.getElementById('confirm-modal').classList.remove('hidden');
}

function closeConfirmModal() {
  document.getElementById('confirm-modal').classList.add('hidden');
}

function confirmAnswer() {
  closeConfirmModal();
  const q = QUIZ_QUESTIONS[currentQuestionIndex];
  const isCorrect = pendingOptionIndex === q.answer;
  const cards = document.querySelectorAll('.option-card');

  cards.forEach(card => card.onclick = null);

  if (isCorrect) {
    cards[pendingOptionIndex].classList.add('correct');
    quizScore += 100;
  } else {
    cards[pendingOptionIndex].classList.add('wrong');
    cards[q.answer].classList.add('correct');
  }

  db.ref(`games/${currentGameCode}/players/${playerId}`).update({
    quizScore: quizScore,
    balance: quizScore,
    quizIndex: currentQuestionIndex + 1
  });

  const fbBox = document.getElementById('quiz-feedback-box');
  fbBox.classList.remove('hidden');
  document.getElementById('quiz-feedback-text').innerHTML = isCorrect
    ? `<strong style="color:var(--green-primary)">Correct! +£100 added to your funds.</strong>`
    : `<strong style="color:var(--red-accent)">Incorrect. No funds added for this question.</strong>`;
}

function nextQuestion() {
  currentQuestionIndex++;
  renderQuestion();
}

// --- ALLOCATION LOGIC ---
function setupAllocationScreen(year, myData) {
  const yrSpans = document.querySelectorAll('.current-year-num');
  yrSpans.forEach(s => s.innerText = year);

  const totalCash = Math.round(myData ? myData.balance : 1000);
  const totalSpans = document.querySelectorAll('.player-total-cash');
  totalSpans.forEach(s => s.innerText = totalCash.toLocaleString());

  const isAlreadySubmitted = myData && myData.allocations && myData.allocations['year' + year];
  const btn = document.getElementById('submit-alloc-btn');
  const msg = document.getElementById('alloc-waiting-msg');

  if (isAlreadySubmitted) {
    btn.classList.add('hidden');
    msg.classList.remove('hidden');
  } else {
    btn.classList.remove('hidden');
    msg.classList.add('hidden');
  }

  updateAllocationTotals();
}

function updateAllocationTotals() {
  const totalCash = parseInt(document.querySelectorAll('.player-total-cash')[0].innerText.replace(/,/g, '')) || 1000;
  const cash = parseInt(document.getElementById('alloc-cash').value) || 0;
  const bonds = parseInt(document.getElementById('alloc-bonds').value) || 0;
  const commodities = parseInt(document.getElementById('alloc-commodities').value) || 0;
  const equities = parseInt(document.getElementById('alloc-equities').value) || 0;

  const total = cash + bonds + commodities + equities;
  const remaining = totalCash - total;

  document.getElementById('pct-cash').innerText = totalCash ? `${Math.round((cash / totalCash) * 100)}%` : '0%';
  document.getElementById('pct-bonds').innerText = totalCash ? `${Math.round((bonds / totalCash) * 100)}%` : '0%';
  document.getElementById('pct-commodities').innerText = totalCash ? `${Math.round((commodities / totalCash) * 100)}%` : '0%';
  document.getElementById('pct-equities').innerText = totalCash ? `${Math.round((equities / totalCash) * 100)}%` : '0%';

  document.getElementById('total-allocated-display').innerText = total.toLocaleString();
  document.getElementById('remaining-allocated-display').innerText = `£${remaining.toLocaleString()}`;
}

function submitAllocation() {
  const totalCash = parseInt(document.querySelectorAll('.player-total-cash')[0].innerText.replace(/,/g, '')) || 1000;
  const cash = parseInt(document.getElementById('alloc-cash').value) || 0;
  const bonds = parseInt(document.getElementById('alloc-bonds').value) || 0;
  const commodities = parseInt(document.getElementById('alloc-commodities').value) || 0;
  const equities = parseInt(document.getElementById('alloc-equities').value) || 0;

  if (cash + bonds + commodities + equities !== totalCash) {
    alert(`Total allocations must equal exactly your available balance (£${totalCash.toLocaleString()}).`);
    return;
  }

  db.ref('games/' + currentGameCode).once('value', snapshot => {
    const yr = snapshot.val().currentYear;
    db.ref(`games/${currentGameCode}/players/${playerId}/allocations/year${yr}`).set({
      cash, bonds, commodities, equities
    });
  });
}

// --- RESULTS & LEADERBOARD LOGIC ---
function renderResultsScreen(year, myData) {
  const returns = YEAR_RETURNS.find(r => r.year === year);
  const mGrid = document.getElementById('market-performance-grid');
  mGrid.innerHTML = `
    <div class="market-card">💵 Cash<br><strong>${(returns.cash * 100).toFixed(1)}%</strong></div>
    <div class="market-card">🏛️ Bonds<br><strong>${(returns.bonds * 100).toFixed(1)}%</strong></div>
    <div class="market-card">📉 Commodities<br><strong>${(returns.commodities * 100).toFixed(1)}%</strong></div>
    <div class="market-card">📈 Equities<br><strong>${(returns.equities * 100).toFixed(1)}%</strong></div>
  `;

  if (myData && myData.history && myData.history['year' + year]) {
    const h = myData.history['year' + year];
    const tbody = document.getElementById('player-results-table');
    tbody.innerHTML = '';

    const assets = [
      { name: 'Cash', val: h.alloc.cash, ret: h.returns.cash },
      { name: 'Bonds', val: h.alloc.bonds, ret: h.returns.bonds },
      { name: 'Commodities', val: h.alloc.commodities, ret: h.returns.commodities },
      { name: 'Equities', val: h.alloc.equities, ret: h.returns.equities }
    ];

    assets.forEach(a => {
      const gain = a.val * a.ret;
      const end = a.val + gain;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${a.name}</td>
        <td>£${a.val.toLocaleString()}</td>
        <td>${(a.ret * 100).toFixed(1)}%</td>
        <td style="color:${gain >= 0 ? 'var(--green-primary)' : 'var(--red-accent)'}">£${Math.round(gain).toLocaleString()}</td>
        <td>£${Math.round(end).toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById('new-portfolio-total').innerText = `£${Math.round(h.newBalance).toLocaleString()}`;
  }
}

function renderFinalLeaderboard(playersObj) {
  const list = Object.values(playersObj || {}).sort((a, b) => (b.balance || 0) - (a.balance || 0));
  const container = document.getElementById('final-leaderboard-container');
  let html = `<table class="data-table"><thead><tr><th>Rank</th><th>Player</th><th>Final Balance</th></tr></thead><tbody>`;

  list.forEach((p, idx) => {
    html += `<tr>
      <td>#${idx + 1}</td>
      <td><strong>${p.name}</strong></td>
      <td><strong>£${Math.round(p.balance || 0).toLocaleString()}</strong></td>
    </tr>`;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
}

function toggleLeaderboardModal(show) {
  const modal = document.getElementById('leaderboard-modal');
  if (show) {
    modal.classList.remove('hidden');
    db.ref('games/' + currentGameCode + '/players').once('value', snapshot => {
      renderFinalLeaderboard(snapshot.val());
      document.getElementById('leaderboard-modal-body').innerHTML = document.getElementById('final-leaderboard-container').innerHTML;
    });
  } else {
    modal.classList.add('hidden');
  }
}