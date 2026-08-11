// State Variables
let currentGameCode = null;
let playerId = null;
let playerName = "";
let isAdmin = false;

let currentQuestionIndex = 0;
let pendingOptionIndex = null;
let isAdvancingQuestion = false;
let quizScore = 1000;
let answeredQuestions = {}; // track answered questions locally: { [index]: { chosen, isCorrect } }
let allocationPercentages = { cash: 0, bonds: 0, commodities: 0, equities: 0 };
let currentGameState = null;
let isResultsCountdownActive = false;
let resultsCountdownYear = null;
let lastCelebratedResultsYear = null;
const ASSET_IDS = ['cash', 'bonds', 'commodities', 'equities'];

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
    const playerEntries = Object.entries(players);
    const playerList = Object.values(players);
    const tbody = document.getElementById('admin-players-list');
    const year = data.currentYear || 1;
    const yearGainCol = document.getElementById('admin-year-gain-col');
    if (yearGainCol) {
      yearGainCol.innerText = `Year ${year} Gain / Loss`;
    }
    tbody.innerHTML = '';

    playerEntries.forEach(([pId, p]) => {
      const isAllocated = p.allocations && p.allocations['year' + year];
      const hist = p.history && p.history['year' + year] ? p.history['year' + year] : null;
      const gainValue = hist && typeof hist.gainLoss === 'number' ? hist.gainLoss : null;
      const gainClass = gainValue === null ? '' : (gainValue >= 0 ? 'year-gain-positive' : 'year-gain-negative');
      const gainText = gainValue === null ? '—' : `${gainValue >= 0 ? '+' : ''}£${Math.round(gainValue).toLocaleString()}`;
      const tr = document.createElement('tr');
      tr.setAttribute('data-player-id', pId);
      tr.style.cursor = 'pointer';
      tr.onclick = () => openPlayerHistory(pId);
      tr.innerHTML = `
        <td><strong>${p.name}</strong></td>
        <td>${p.quizFinished ? 'Completed' : (p.quizIndex || 0) + '/8'}</td>
        <td>+£${(p.quizScore || 1000) - 1000}</td>
        <td><strong>£${Math.round(p.balance || 1000).toLocaleString()}</strong></td>
        <td class="${gainClass}">${gainText}</td>
        <td>${isAllocated ? '✅ Submitted' : '⏳ Pending'}</td>
      `;
      tbody.appendChild(tr);
    });

    // Update Control Buttons
    const actionsDiv = document.getElementById('admin-actions');
    const statusText = document.getElementById('admin-status-text');

    if (data.state === 'LOBBY') {
      statusText.innerText = `Lobby open. ${playerList.length} player(s) joined.`;
      actionsDiv.innerHTML = `<button class="btn btn-gray" onclick="toggleQuizPreviewModal(true)">View Quiz Questions</button><button class="btn btn-green" onclick="adminChangeState('QUIZ')">Start Quiz Phase</button>`;
    } else if (data.state === 'QUIZ') {
      const allDone = playerList.length > 0 && playerList.every(p => p.quizFinished);
      statusText.innerText = allDone ? "All players finished the quiz!" : "Players are completing questions...";
      actionsDiv.innerHTML = `<button class="btn btn-gray" onclick="toggleQuizPreviewModal(true)">View Quiz Questions</button><button class="btn btn-purple" onclick="adminChangeState('ALLOCATING')">Start Year 1 Investment</button>`;
    } else if (data.state === 'ALLOCATING') {
      const year = data.currentYear;
      const allSubmitted = playerList.length > 0 && playerList.every(p => p.allocations && p.allocations['year' + year]);
      statusText.innerText = `Year ${year}: ${allSubmitted ? 'All allocations in!' : 'Waiting for portfolio allocations...'}`;
      actionsDiv.innerHTML = `<button class="btn btn-gray" onclick="toggleQuizPreviewModal(true)">View Quiz Questions</button><button class="btn btn-green" onclick="processYearSimulation(${year})">Simulate Year ${year}</button>`;
    } else if (data.state === 'RESULTS') {
      const year = data.currentYear;
      statusText.innerText = `Year ${year} complete. View results or advance.`;
      if (year < 6) {
        actionsDiv.innerHTML = `<button class="btn btn-gray" onclick="toggleQuizPreviewModal(true)">View Quiz Questions</button><button class="btn btn-purple" onclick="adminNextYear(${year + 1})">Advance to Year ${year + 1}</button>`;
      } else {
        actionsDiv.innerHTML = `<button class="btn btn-gray" onclick="toggleQuizPreviewModal(true)">View Quiz Questions</button><button class="btn btn-green" onclick="adminChangeState('FINAL')">Show Final Leaderboard</button>`;
      }
    } else if (data.state === 'FINAL') {
      statusText.innerText = "Game completed!";
      actionsDiv.innerHTML = ``;
    }
    // hide title when game is in progress
    updateHeaderForState(data.state);
  });
}

function updateHeaderForState(state) {
  currentGameState = state;
  const headerEl = document.querySelector('.app-header');
  const logoEl = document.querySelector('.app-logo');
  const pill = document.getElementById('balance-pill');
  const leaderboardBtn = document.getElementById('global-leaderboard-btn');
  
  const isLiveGame = !!(currentGameCode && playerId);
  const isHomeOrLobby = !state || state === 'LOBBY' || state === 'HOME';

  if (isHomeOrLobby) {
    // Homepage / Lobby State: Show centered logo, hide pill
    if (headerEl) headerEl.classList.remove('game-started');
    if (pill) pill.classList.add('hidden');
    if (leaderboardBtn) leaderboardBtn.classList.add('hidden');
    if (logoEl) {
      const isPureHome = !currentGameCode;
      logoEl.src = isPureHome ? '/investing-game.png' : '/logo.png';
      logoEl.classList.toggle('app-logo-compact', !isPureHome);
    }
  } else {
    // Active Game State: Hide logo, show left balance pill & right leaderboard button
    if (headerEl) headerEl.classList.add('game-started');
    if (pill && isLiveGame) pill.classList.remove('hidden');
    if (leaderboardBtn) leaderboardBtn.classList.remove('hidden');
  }
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
      const alloc = p.allocations && p.allocations['year' + year] ? p.allocations['year' + year] : null;
      if (!alloc) {
        const unchangedBalance = p.balance || 1000;
        updates[`players/${pId}/history/year${year}`] = {
          alloc: { cash: 0, bonds: 0, commodities: 0, equities: 0 },
          returns,
          gainLoss: 0,
          newBalance: unchangedBalance,
          missedYear: true
        };
        updates[`players/${pId}/balance`] = unchangedBalance;
        return;
      }
      const newCash = alloc.cash * (1 + returns.cash);
      const newBonds = alloc.bonds * (1 + returns.bonds);
      const newCommodities = alloc.commodities * (1 + returns.commodities);
      const newEquities = alloc.equities * (1 + returns.equities);
      const newTotal = newCash + newBonds + newCommodities + newEquities;
      const gainLoss = newTotal - (alloc.cash + alloc.bonds + alloc.commodities + alloc.equities);

      updates[`players/${pId}/balance`] = newTotal;
      updates[`players/${pId}/history/year${year}`] = {
        alloc,
        returns,
        gainLoss,
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
    db.ref(`games/${code}/players`).once('value', playersSnapshot => {
      const players = playersSnapshot.val() || {};
      const existingEntry = Object.entries(players).find(([, p]) => (p.name || '').toLowerCase() === name.toLowerCase());

      if (existingEntry) {
        playerId = existingEntry[0];
        const existing = existingEntry[1] || {};
        quizScore = existing.quizScore || existing.balance || 1000;
        currentQuestionIndex = existing.quizIndex || 0;
      } else {
        playerId = db.ref('games/' + code + '/players').push().key;
        db.ref(`games/${code}/players/${playerId}`).set({
          name: name,
          balance: 1000,
          quizScore: 1000,
          quizIndex: 0,
          quizFinished: false
        });
        quizScore = 1000;
        currentQuestionIndex = 0;
      }

      document.getElementById('lobby-code-display').innerText = code;
      const lobbyTitle = document.getElementById('lobby-title');
      if (lobbyTitle) lobbyTitle.innerText = "You're In!";
      const lobbyScreen = document.getElementById('screen-lobby');
      if (lobbyScreen) lobbyScreen.classList.remove('lobby-quiz-complete');
      showScreen('screen-lobby');
      document.getElementById('global-leaderboard-btn').classList.remove('hidden');
      updateBalancePill(quizScore);

      listenToGameAsPlayer();
    });
  });
}

function listenToGameAsPlayer() {
  db.ref('games/' + currentGameCode).on('value', snapshot => {
    const data = snapshot.val();
    if (!data) return;

    const myData = data.players ? data.players[playerId] : null;
    if (!myData) return;

    quizScore = myData.quizScore || myData.balance || quizScore;
    currentQuestionIndex = myData.quizIndex || currentQuestionIndex;

    // update header visibility based on state
    updateHeaderForState(data.state);
    if (data.state === 'RESULTS' && resultsCountdownYear !== data.currentYear) {
      isResultsCountdownActive = true;
    }
    updateBalancePill(myData ? myData.balance : quizScore);

    if (data.state === 'QUIZ') {
      resultsCountdownYear = null;
      isResultsCountdownActive = false;
      showScreen('screen-quiz');
      renderQuestion();
      updateBalancePill(myData ? myData.balance : quizScore);
    } else if (data.state === 'ALLOCATING') {
      resultsCountdownYear = null;
      isResultsCountdownActive = false;
      showScreen('screen-allocate');
      setupAllocationScreen(data.currentYear, myData);
      updateBalancePill(myData ? myData.balance : quizScore);
    } else if (data.state === 'RESULTS') {
      // perform countdown then show results with gentle fade-ins
      performResultsCountdown(data.currentYear, myData);
      updateBalancePill(myData ? myData.balance : quizScore);
    } else if (data.state === 'FINAL') {
      resultsCountdownYear = null;
      isResultsCountdownActive = false;
      showScreen('screen-final');
      renderFinalLeaderboard(data.players);
      updateBalancePill(myData ? myData.balance : quizScore);
      // confetti for winner if this client is the winner
      maybeConfettiOnWin(data.players);
    }
  });
}

function performResultsCountdown(year, myData) {
  if (resultsCountdownYear === year) return;
  resultsCountdownYear = year;
  isResultsCountdownActive = true;
  updateBalancePill(myData ? myData.balance : quizScore);

  const overlay = document.getElementById('results-countdown');
  const countEl = document.getElementById('count-number');
  if (!overlay || !countEl) {
    isResultsCountdownActive = false;
    showScreen('screen-results');
    renderResultsScreen(year, myData);
    updateBalancePill(myData ? myData.balance : quizScore);
    return;
  }
  overlay.classList.remove('hidden');
  let count = 3;
  countEl.innerText = count;
  const tick = setInterval(() => {
    count -= 1;
    if (count > 0) {
      countEl.innerText = count;
      // trigger pop animation restart
      countEl.classList.remove('pop');
      void countEl.offsetWidth;
      countEl.classList.add('pop');
    } else {
      clearInterval(tick);
      overlay.classList.add('hidden');
      isResultsCountdownActive = false;
      showScreen('screen-results');
      renderResultsScreen(year, myData);
      updateBalancePill(myData ? myData.balance : quizScore);
    }
  }, 900);
}

// --- QUIZ LOGIC ---
function renderQuestion() {
  isAdvancingQuestion = false;
  if (currentQuestionIndex >= QUIZ_QUESTIONS.length) {
    db.ref(`games/${currentGameCode}/players/${playerId}`).update({ quizFinished: true });
    // show waiting page with specific message
    const codeEl = document.getElementById('lobby-code-display');
    if (codeEl) codeEl.innerText = currentGameCode || '---';
    const lobbyTitle = document.getElementById('lobby-title');
    if (lobbyTitle) lobbyTitle.innerText = 'All done!';
    const lobbyScreen = document.getElementById('screen-lobby');
    if (lobbyScreen) lobbyScreen.classList.add('lobby-quiz-complete');
    const waitEl = document.getElementById('lobby-waiting-text');
    if (waitEl) waitEl.innerText = 'Coming up: Investing Simulation - waiting for host to begin simulation';
    showScreen('screen-lobby');
    return;
  }

  const q = QUIZ_QUESTIONS[currentQuestionIndex];
  document.getElementById('quiz-question-num').innerText = `Question ${currentQuestionIndex + 1} of 8`;
  document.getElementById('quiz-cash-display').innerText = `£${quizScore.toLocaleString()}`;
  updateBalancePill(quizScore);
  document.getElementById('quiz-question-text').innerText = q.question;
  document.getElementById('quiz-feedback-box').classList.add('hidden');

  const container = document.getElementById('quiz-options-container');
  container.innerHTML = '';
  const answered = answeredQuestions[currentQuestionIndex];
  q.options.forEach((opt, idx) => {
    const card = document.createElement('div');
    card.className = 'option-card';
    card.setAttribute('data-option-idx', idx);
    card.innerText = opt;
    if (answered) {
      // already answered: disable clicks and show result
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

  // if already answered show feedback box
  if (answered) {
    const fbBox = document.getElementById('quiz-feedback-box');
    fbBox.classList.remove('hidden');
    document.getElementById('quiz-feedback-text').innerHTML = answered.isCorrect
      ? `<strong style="color:var(--green-primary)">Correct! +£100 added to your funds.</strong>`
      : `<strong style="color:var(--red-accent)">Incorrect. No funds added for this question.</strong>`;
    document.getElementById('quiz-cash-display').innerText = `£${quizScore.toLocaleString()}`;
  }
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

  // remove click handlers to prevent double submits
  cards.forEach(card => card.onclick = null);

  // find card elements by data attribute reliably
  const chosenCard = document.querySelector(`.option-card[data-option-idx="${pendingOptionIndex}"]`);
  const correctCard = document.querySelector(`.option-card[data-option-idx="${q.answer}"]`);

  if (isCorrect) {
    if (chosenCard) chosenCard.classList.add('correct');
    quizScore += 100;
    launchConfettiCannon('center');
  } else {
    if (chosenCard) chosenCard.classList.add('wrong');
    if (correctCard) correctCard.classList.add('correct');
  }

  // mark question answered locally to prevent multiple attempts
  answeredQuestions[currentQuestionIndex] = { chosen: pendingOptionIndex, isCorrect };

  db.ref(`games/${currentGameCode}/players/${playerId}`).update({
    quizScore: quizScore,
    balance: quizScore
  });

  const fbBox = document.getElementById('quiz-feedback-box');
  fbBox.classList.remove('hidden');
  document.getElementById('quiz-feedback-text').innerHTML = isCorrect
    ? `<strong style="color:var(--green-primary)">Correct! +£100 added to your funds.</strong>`
    : `<strong style="color:var(--red-accent)">Incorrect. No funds added for this question.</strong>`;

  // Ensure currency formatting shows commas
  document.getElementById('quiz-cash-display').innerText = `£${quizScore.toLocaleString()}`;
  updateBalancePill(quizScore);
}

function nextQuestion() {
  if (isAdvancingQuestion) return;
  isAdvancingQuestion = true;
  currentQuestionIndex++;
  db.ref(`games/${currentGameCode}/players/${playerId}`).update({
    quizIndex: currentQuestionIndex
  });
  renderQuestion();
}

// --- ALLOCATION LOGIC ---
function setupAllocationScreen(year, myData) {
  allocationPercentages = { cash: 0, bonds: 0, commodities: 0, equities: 0 };
  const yrSpans = document.querySelectorAll('.current-year-num');
  yrSpans.forEach(s => s.innerText = year);

  const totalCash = Math.round(myData ? myData.balance : 1000);
  const totalSpans = document.querySelectorAll('.player-total-cash');
  totalSpans.forEach(s => s.innerText = totalCash.toLocaleString());

  const isAlreadySubmitted = myData && myData.allocations && myData.allocations['year' + year];
  const existingAlloc = isAlreadySubmitted ? myData.allocations['year' + year] : null;

  renderAllocationOptions();

  ASSET_IDS.forEach(asset => {
    const el = document.getElementById(`alloc-${asset}`);
    if (el) {
      el.value = existingAlloc ? (existingAlloc[asset] || 0) : 0;
    }
  });

  if (existingAlloc) {
    const updatedPercentages = {};
    ASSET_IDS.forEach(asset => {
      updatedPercentages[asset] = Math.round(((existingAlloc[asset] || 0) / totalCash) * 100);
    });
    allocationPercentages = updatedPercentages;
  }

  updateAllocationTotals();
  renderAllocationSubmissionState(!!isAlreadySubmitted, existingAlloc, totalCash);
}

function renderAllocationOptions() {
  const totalCash = parseInt(document.querySelectorAll('.player-total-cash')[0].innerText.replace(/,/g, '').replace(/[^0-9]/g, '')) || 1000;
  const options = getAllocationPercentOptions();

  ASSET_IDS.forEach(asset => {
    const container = document.getElementById(`alloc-options-${asset}`);
    const amountEl = document.getElementById(`alloc-amount-${asset}`);
    if (!container || !amountEl) return;

    const selectedPercent = allocationPercentages[asset] || 0;
    container.innerHTML = '';
    options.forEach(percent => {
      const amount = getAllocationAmountFromPercent(percent, totalCash);
      const btn = document.createElement('button');
      btn.className = `allocation-pill ${selectedPercent === percent ? 'active' : ''}`;
      btn.type = 'button';
      btn.innerHTML = `<strong>${percent}%</strong><small>£${amount.toLocaleString()}</small>`;
      btn.onclick = () => setAllocationPercent(`alloc-${asset}`, percent);
      container.appendChild(btn);
    });
    amountEl.innerText = `£${getAllocationAmountFromPercent(selectedPercent, totalCash).toLocaleString()}`;
  });
}

function getAllocationAmounts(totalBalance, percentages) {
  const dist = getExactAllocationDistribution(totalBalance, percentages);
  return ASSET_IDS.map(asset => dist[asset] || 0);
}

function updateAllocationTotals() {
  const totalCashSpans = document.querySelectorAll('.player-total-cash');
  const totalCash = totalCashSpans.length
    ? parseInt(totalCashSpans[0].innerText.replace(/,/g, '').replace(/[^0-9]/g, '')) || 1000
    : 1000;

  const percentTotal = ASSET_IDS.reduce((sum, asset) => sum + (allocationPercentages[asset] || 0), 0);
  const values = percentTotal === 100
    ? getAllocationAmounts(totalCash, allocationPercentages)
    : ASSET_IDS.map(asset => getAllocationAmountFromPercent(allocationPercentages[asset] || 0, totalCash));

  const total = values.reduce((sum, val) => sum + val, 0);
  const overAllocated = total > totalCash;

  const totalEl = document.getElementById('total-allocated-display');
  
  if (totalEl) totalEl.innerText = total.toLocaleString();

  const summary = document.getElementById('alloc-summary-bar');
  const totalValueEl = document.getElementById('total-allocated-value');
  const accentColor = overAllocated ? 'var(--red-accent)' : 'var(--green-primary)';
  if (totalEl) totalEl.style.color = accentColor;
  if (totalValueEl) totalValueEl.style.color = accentColor;
  if (summary) summary.classList.toggle('over-allocated', overAllocated);

  values.forEach((value, idx) => {
    const asset = ASSET_IDS[idx];
    const amountEl = document.getElementById(`alloc-amount-${asset}`);
    if (amountEl) {
      amountEl.innerText = `£${value.toLocaleString()}`;
      amountEl.style.color = overAllocated ? 'var(--red-accent)' : 'var(--green-primary)';
    }
    const inputEl = document.getElementById(`alloc-${asset}`);
    if (inputEl) {
      inputEl.value = value;
    }
  });

  renderAllocationOptions();
}

function submitAllocation() {
  const totalCash = parseInt(document.querySelectorAll('.player-total-cash')[0].innerText.replace(/,/g, '')) || 1000;
  const percentTotal = ASSET_IDS.reduce((sum, asset) => sum + (allocationPercentages[asset] || 0), 0);
  if (percentTotal !== 100) {
    alert('Please allocate exactly 100% before submitting.');
    return;
  }
  const allocationAmounts = getExactAllocationDistribution(totalCash, allocationPercentages);
  const cash = allocationAmounts.cash;
  const bonds = allocationAmounts.bonds;
  const commodities = allocationAmounts.commodities;
  const equities = allocationAmounts.equities;

  if (cash + bonds + commodities + equities !== totalCash) {
    alert(`Total allocations must equal exactly your available balance (£${totalCash.toLocaleString()}).`);
    return;
  }

  db.ref('games/' + currentGameCode).once('value', snapshot => {
    const yr = snapshot.val().currentYear;
    db.ref(`games/${currentGameCode}/players/${playerId}/allocations/year${yr}`).set({
      cash, bonds, commodities, equities
    }).then(() => {
      renderAllocationSubmissionState(true, allocationAmounts, totalCash);
    });
  });
}

// --- RESULTS & LEADERBOARD LOGIC ---
function renderResultsScreen(year, myData) {
  let overallGainLoss = null;
  const returns = YEAR_RETURNS.find(r => r.year === year);
  const mGrid = document.getElementById('market-performance-grid');
  mGrid.innerHTML = '';
  const mk = [ ['cash','💵', returns.cash], ['bonds','🏛️', returns.bonds], ['commodities','📉', returns.commodities], ['equities','📈', returns.equities] ];
  mk.forEach(([key, emoji, val])=>{
    const div = document.createElement('div');
    div.className = 'market-card ' + (val >= 0 ? 'positive' : 'negative');
    div.innerHTML = `${emoji} ${key.charAt(0).toUpperCase()+key.slice(1)}<br><strong>${(val*100).toFixed(1)}%</strong>`;
    mGrid.appendChild(div);
  });

  const marketBox = document.querySelector('.market-overview-box');
  const personalBox = document.querySelector('.personal-results-box');
  const outcomeHeader = document.getElementById('results-outcome-header');
  const quickSummary = document.getElementById('results-quick-summary');
  const gainLossEl = document.getElementById('year-gain-loss-total');
  const detailToggle = document.getElementById('results-detail-toggle');
  const waitingMessage = document.querySelector('.results-waiting-message');
  const actionsRow = document.getElementById('results-actions-row');
  [marketBox, personalBox].forEach(box => {
    if (box) {
      box.classList.remove('results-section-visible');
      box.classList.add('results-section-hidden');
    }
  });
  if (quickSummary) quickSummary.classList.add('results-summary-hidden');
  if (detailToggle) {
    detailToggle.classList.add('results-summary-hidden');
    detailToggle.open = false;
  }
  if (waitingMessage) waitingMessage.classList.add('results-summary-hidden');
  if (actionsRow) actionsRow.classList.add('results-summary-hidden');

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
        <td style="color:${a.ret >= 0 ? 'var(--green-primary)' : 'var(--red-accent)'}">${(a.ret * 100).toFixed(1)}%</td>
        <td style="color:${gain >= 0 ? 'var(--green-primary)' : 'var(--red-accent)'}">£${Math.round(gain).toLocaleString()}</td>
        <td>£${Math.round(end).toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });

    const investedTotal = assets.reduce((sum, a) => sum + a.val, 0);
    const gainLoss = typeof h.gainLoss === 'number' ? h.gainLoss : (h.newBalance - investedTotal);
    overallGainLoss = gainLoss;
    const gainLossSign = gainLoss >= 0 ? '+' : '';
    if (gainLossEl) {
      gainLossEl.innerText = `${gainLossSign}£${Math.round(gainLoss).toLocaleString()}`;
      gainLossEl.style.color = gainLoss >= 0 ? 'var(--green-primary)' : 'var(--red-accent)';
    }
    if (outcomeHeader) {
      outcomeHeader.innerText = gainLoss >= 0 ? 'Woo! Your money grew this year!' : 'Oh no, not such a good year!';
      outcomeHeader.style.color = gainLoss >= 0 ? 'var(--green-primary)' : 'var(--red-accent)';
    }
    document.getElementById('new-portfolio-total').innerText = `£${Math.round(h.newBalance).toLocaleString()}`;
  }

  setTimeout(() => {
    if (marketBox) {
      marketBox.classList.remove('results-section-hidden');
      marketBox.classList.add('results-section-visible');
    }
  }, 100);

  setTimeout(() => {
    const outcomeBlock = document.getElementById('results-outcome-block');
    if (outcomeBlock) {
      outcomeBlock.classList.remove('results-summary-hidden');
      outcomeBlock.classList.add('results-summary-visible');
    }
    if (personalBox) {
      personalBox.classList.remove('results-section-hidden');
      personalBox.classList.add('results-section-visible');
    }
    if (quickSummary) {
      quickSummary.classList.remove('results-summary-hidden');
      quickSummary.classList.add('results-summary-visible');
    }
    if (detailToggle) {
      detailToggle.classList.remove('results-summary-hidden');
      detailToggle.classList.add('results-summary-visible');
    }
    if (waitingMessage) {
      waitingMessage.classList.remove('results-summary-hidden');
      waitingMessage.classList.add('results-summary-visible');
    }
    if (actionsRow) {
      actionsRow.classList.remove('results-summary-hidden');
      actionsRow.classList.add('results-summary-visible');
    }
    if (overallGainLoss !== null && overallGainLoss > 0 && lastCelebratedResultsYear !== year) {
      launchConfettiCannon('sides');
      lastCelebratedResultsYear = year;
    }
  }, 2000);
}

// Quick-fill helpers for allocation inputs
function setAllocationPercent(assetId, percent) {
  const totalCash = parseInt(document.querySelectorAll('.player-total-cash')[0].innerText.replace(/,/g, '').replace(/[^0-9]/g, '')) || 1000;
  const assetKey = assetId.replace('alloc-', '');
  if (assetKey in allocationPercentages) {
    allocationPercentages[assetKey] = percent;
  }
  const value = getAllocationAmountFromPercent(percent, totalCash);
  const el = document.getElementById(assetId);
  if (el) {
    el.value = value;
    updateAllocationTotals();
  }
}

function renderAllocationSubmissionState(isSubmitted, allocation, totalCash) {
  const submittedView = document.getElementById('alloc-submitted-view');
  const summaryBody = document.getElementById('alloc-submitted-summary');
  const submitBtn = document.getElementById('submit-alloc-btn');
  const activeView = document.getElementById('alloc-active-view');
  const allocationGrid = document.querySelector('.allocation-grid');
  const summaryBar = document.getElementById('alloc-summary-bar');

  if (!submittedView || !summaryBody || !submitBtn || !allocationGrid || !summaryBar || !activeView) return;

  if (!isSubmitted) {
    submittedView.classList.add('hidden');
    activeView.classList.remove('hidden');
    allocationGrid.classList.remove('hidden');
    summaryBar.classList.remove('hidden');
    submitBtn.classList.remove('hidden');
    return;
  }

  const alloc = allocation || getExactAllocationDistribution(totalCash, allocationPercentages);
  const rows = ASSET_IDS.map(asset => {
    const label = asset.charAt(0).toUpperCase() + asset.slice(1);
    const value = alloc[asset] || 0;
    return `<tr><td>${label}</td><td>£${value.toLocaleString()}</td></tr>`;
  }).join('');

  summaryBody.innerHTML = `
    <table class="alloc-submitted-summary-grid">
      <tbody>
        ${rows}
        <tr><td><strong>Total allocated</strong></td><td><strong>£${(alloc.cash + alloc.bonds + alloc.commodities + alloc.equities).toLocaleString()}</strong></td></tr>
      </tbody>
    </table>
  `;

  allocationGrid.classList.add('hidden');
  summaryBar.classList.add('hidden');
  submitBtn.classList.add('hidden');
  activeView.classList.add('hidden');
  submittedView.classList.remove('hidden');
}

// After final leaderboard, if current player is top show confetti
function maybeConfettiOnWin(playersObj) {
  const list = Object.values(playersObj || {}).sort((a,b)=> (b.balance||0)-(a.balance||0));
  if (!playerId) return;
  if (list.length && list[0].name === playerName) {
    // fire confetti
    launchConfetti();
  }
}

function launchConfetti(){
  // simple confetti using canvas library-free approach (limited)
  const cvs = document.createElement('canvas');
  cvs.className = 'confetti-canvas';
  document.body.appendChild(cvs);
  cvs.width = window.innerWidth; cvs.height = window.innerHeight;
  const ctx = cvs.getContext('2d');
  const pieces = [];
  for(let i=0;i<120;i++){ pieces.push({x:Math.random()*cvs.width,y:cvs.height*0.5 + (Math.random()*60 - 30),vy:2+Math.random()*6, size:4+Math.random()*8, color:`hsl(${Math.random()*360},80%,60%)`}); }
  let frames = 0;
  function frame(){ ctx.clearRect(0,0,cvs.width,cvs.height); pieces.forEach(p=>{ p.y+=p.vy; ctx.fillStyle=p.color; ctx.fillRect(p.x,p.y,p.size,p.size); }); frames++; if(frames<180) requestAnimationFrame(frame); else cvs.remove(); }
  frame();
}

function launchConfettiCannon(mode = 'center') {
  const cvs = document.createElement('canvas');
  cvs.className = 'confetti-canvas';
  document.body.appendChild(cvs);
  cvs.width = window.innerWidth;
  cvs.height = window.innerHeight;
  const ctx = cvs.getContext('2d');
  const pieces = [];

  const emitters = mode === 'sides'
    ? [
        { x: 90, y: cvs.height * 0.52, vxMin: 2.5, vxMax: 6.2, vyMin: -12, vyMax: -6 },
        { x: cvs.width - 90, y: cvs.height * 0.52, vxMin: -6.2, vxMax: -2.5, vyMin: -12, vyMax: -6 }
      ]
    : [
        { x: cvs.width / 2, y: cvs.height * 0.52, vxMin: -3.6, vxMax: 3.6, vyMin: -12, vyMax: -7 }
      ];

  emitters.forEach(emitter => {
    for (let i = 0; i < 80; i++) {
      pieces.push({
        x: emitter.x,
        y: emitter.y,
        vx: emitter.vxMin + Math.random() * (emitter.vxMax - emitter.vxMin),
        vy: emitter.vyMin + Math.random() * (emitter.vyMax - emitter.vyMin),
        g: 0.28 + Math.random() * 0.12,
        size: 4 + Math.random() * 6,
        life: 70 + Math.random() * 45,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.4,
        color: `hsl(${Math.random() * 360}, 85%, 58%)`
      });
    }
  });

  function frame() {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    pieces.forEach(p => {
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
      p.rot += p.spin;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });

    for (let i = pieces.length - 1; i >= 0; i--) {
      if (pieces[i].life <= 0 || pieces[i].y > cvs.height + 40) {
        pieces.splice(i, 1);
      }
    }

    if (pieces.length > 0) {
      requestAnimationFrame(frame);
    } else {
      cvs.remove();
    }
  }

  frame();
}

function renderFinalLeaderboard(playersObj) {
  const list = Object.values(playersObj || {}).sort((a, b) => (b.balance || 0) - (a.balance || 0));
  const container = document.getElementById('final-leaderboard-container');
  let html = `<table class="data-table"><thead><tr><th>Rank</th><th>Player</th><th>Balance</th></tr></thead><tbody>`;

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

// Asset summary modal helpers
const ASSET_SUMMARIES = {
  cash: { title: 'Cash', risk: 'Low', range: '0-5% typical', use: 'Short-term savings, liquidity and capital preservation.' },
  bonds: { title: 'Bonds', risk: 'Low-Medium', range: '-5% to 15% (historical per year)', use: 'Income generation and portfolio stability.' },
  commodities: { title: 'Commodities', risk: 'High', range: '-20% to 30%+', use: 'Inflation hedge and diversification; volatile.' },
  equities: { title: 'Equities (Stocks)', risk: 'High', range: '-50% to 40%+ per year', use: 'Long-term growth potential; higher volatility.' }
};

function toggleAssetSummary(show, key) {
  const modal = document.getElementById('asset-summary-modal');
  if (!modal) return;
  if (!show) return modal.classList.add('hidden');
  const data = ASSET_SUMMARIES[key] || { title: key, risk:'?', range:'?', use:'?' };
  document.getElementById('asset-summary-title').innerText = data.title;
  document.getElementById('asset-summary-body').innerHTML = `
    <p><strong>Risk level:</strong> ${data.risk}</p>
    <p><strong>Range of annual returns:</strong> ${data.range}</p>
    <p><strong>Useful for:</strong> ${data.use}</p>
  `;
  modal.classList.remove('hidden');
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

function openPlayerHistory(playerId) {
  const modal = document.getElementById('player-history-modal');
  if (!modal) return;
  db.ref(`games/${currentGameCode}/players/${playerId}`).once('value', snap => {
    const p = snap.val();
    const body = document.getElementById('player-history-body');
    let html = `<h4>${p.name}</h4>`;
    html += `<p>Final balance: £${Math.round(p.balance||0).toLocaleString()}</p>`;
    html += `<h5>Allocations & Year History</h5>`;
    html += `<table class="data-table"><thead><tr><th>Year</th><th>Allocations</th><th>Returns</th><th>End Balance</th></tr></thead><tbody>`;
    for (let y=1;y<=6;y++){
      const alloc = p.allocations && p.allocations['year'+y] ? p.allocations['year'+y] : null;
      const hist = p.history && p.history['year'+y] ? p.history['year'+y] : null;
      html += `<tr><td>${y}</td><td>${alloc? `Cash: £${(alloc.cash||0).toLocaleString()} Bonds: £${(alloc.bonds||0).toLocaleString()} Com: £${(alloc.commodities||0).toLocaleString()} Eq: £${(alloc.equities||0).toLocaleString()}` : '—'}</td><td>${hist? `Cash ${((hist.returns.cash||0)*100).toFixed(1)}%` : '—'}</td><td>${hist? '£'+Math.round(hist.newBalance).toLocaleString() : '—'}</td></tr>`;
    }
    html += `</tbody></table>`;
    html += `<p><em>Note: individual quiz answers are not recorded in this session.</em></p>`;
    body.innerHTML = html;
    modal.classList.remove('hidden');
  });
}

function togglePlayerHistory(show) { const modal = document.getElementById('player-history-modal'); if (!modal) return; if (!show) modal.classList.add('hidden'); }

function openSimulationHistoryModal() {
  const modal = document.getElementById('simulation-history-modal');
  if (!modal || !currentGameCode || !playerId) return;

  db.ref(`games/${currentGameCode}/players/${playerId}`).once('value', snap => {
    const p = snap.val() || {};
    const body = document.getElementById('simulation-history-body');
    if (!body) return;

    let html = '<table class="data-table"><thead><tr><th>Year</th><th>Gain / Loss</th><th>Total after year</th></tr></thead><tbody>';
    for (let y = 1; y <= 6; y++) {
      const hist = p.history && p.history['year' + y] ? p.history['year' + y] : null;
      const gain = hist && typeof hist.gainLoss === 'number' ? hist.gainLoss : 0;
      const total = hist && typeof hist.newBalance === 'number' ? hist.newBalance : null;
      const gainClass = gain >= 0 ? 'year-gain-positive' : 'year-gain-negative';
      html += `<tr>
        <td>${y}</td>
        <td class="${gainClass}">${gain >= 0 ? '+' : ''}£${Math.round(gain).toLocaleString()}</td>
        <td>${total === null ? '—' : `£${Math.round(total).toLocaleString()}`}</td>
      </tr>`;
    }
    html += '</tbody></table>';
    body.innerHTML = html;
    modal.classList.remove('hidden');
  });
}

function toggleSimulationHistoryModal(show) {
  const modal = document.getElementById('simulation-history-modal');
  if (!modal) return;
  if (!show) modal.classList.add('hidden');
}

function openLeaderboardFromHistory() {
  toggleSimulationHistoryModal(false);
  toggleLeaderboardModal(true);
}

function updateBalancePill(balanceValue) {
  const pill = document.getElementById('balance-pill');
  const valueEl = document.getElementById('balance-pill-value');
  if (!pill || !valueEl) return;
  const displayValue = typeof balanceValue === 'number' ? balanceValue : (quizScore || 1000);
  valueEl.innerText = `£${Math.round(displayValue).toLocaleString()}`;
  const isLobby = currentGameState === 'LOBBY' || currentGameState === 'HOME';
  pill.classList.toggle('hidden', !currentGameCode || !playerId || isLobby || isResultsCountdownActive);
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
  body.innerHTML = QUIZ_QUESTIONS.map((q, idx) => `
    <div class="quiz-preview-item">
      <h4>${idx + 1}. ${q.question}</h4>
      <ul>
        ${q.options.map((opt, optionIdx) => `<li class="${optionIdx === q.answer ? 'quiz-answer-correct' : ''}">${opt}${optionIdx === q.answer ? ' ✅' : ''}</li>`).join('')}
      </ul>
    </div>
  `).join('');
  modal.classList.remove('hidden');
}

const joinCodeInput = document.getElementById('join-code-input');
if (joinCodeInput) {
  joinCodeInput.addEventListener('input', () => {
    joinCodeInput.value = (joinCodeInput.value || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  });
}
