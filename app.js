// State Variables
let currentGameCode = null;
let playerId = null;
let playerName = "";
let isAdmin = false;

let currentQuestionIndex = 0;
let pendingOptionIndex = null;
let quizScore = 1000;
let answeredQuestions = {}; // track answered questions locally: { [index]: { chosen, isCorrect } }
let allocationPercentages = { cash: 0, bonds: 0, commodities: 0, equities: 0 };
let lastAllocationAsset = 'equities';

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
    tbody.innerHTML = '';

    playerEntries.forEach(([pId, p]) => {
      const isAllocated = p.allocations && p.allocations['year' + data.currentYear];
      const tr = document.createElement('tr');
      tr.setAttribute('data-player-id', pId);
      tr.style.cursor = 'pointer';
      tr.onclick = () => openPlayerHistory(pId);
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
  const titleEl = document.querySelector('.app-header h1');
  const pill = document.getElementById('balance-pill');
  if (!titleEl) return;
  const isLiveGame = !!(currentGameCode && playerId);
  if (state && state !== 'LOBBY' && state !== 'HOME') {
    titleEl.classList.add('hidden');
    if (pill && isLiveGame) pill.classList.remove('hidden');
  } else {
    titleEl.classList.remove('hidden');
    if (pill) pill.classList.toggle('hidden', !isLiveGame);
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
    updateBalancePill(1000);

    listenToGameAsPlayer();
  });
}

function listenToGameAsPlayer() {
  db.ref('games/' + currentGameCode).on('value', snapshot => {
    const data = snapshot.val();
    if (!data) return;

    const myData = data.players ? data.players[playerId] : null;

    // update header visibility based on state
    updateHeaderForState(data.state);
    updateBalancePill(myData ? myData.balance : quizScore);

    if (data.state === 'QUIZ') {
      showScreen('screen-quiz');
      renderQuestion();
      updateBalancePill(myData ? myData.balance : quizScore);
    } else if (data.state === 'ALLOCATING') {
      showScreen('screen-allocate');
      setupAllocationScreen(data.currentYear, myData);
      updateBalancePill(myData ? myData.balance : quizScore);
    } else if (data.state === 'RESULTS') {
      // perform countdown then show results with gentle fade-ins
      performResultsCountdown(data.currentYear, myData);
      updateBalancePill(myData ? myData.balance : quizScore);
    } else if (data.state === 'FINAL') {
      showScreen('screen-final');
      renderFinalLeaderboard(data.players);
      updateBalancePill(myData ? myData.balance : quizScore);
      // confetti for winner if this client is the winner
      maybeConfettiOnWin(data.players);
    }
  });
}

function performResultsCountdown(year, myData) {
  const overlay = document.getElementById('results-countdown');
  const countEl = document.getElementById('count-number');
  if (!overlay || !countEl) {
    showScreen('screen-results');
    renderResultsScreen(year, myData);
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
      // show results screen then animate in sections
      showScreen('screen-results');
      // render results first with elements present but hidden
      renderResultsScreen(year, myData);
          // fade in market grid slowly, then personal results after a pause
      const mGrid = document.getElementById('market-performance-grid');
      const personal = document.querySelector('.personal-results-box');
      if (mGrid) { mGrid.classList.remove('fade-in'); mGrid.classList.add('fade-in-slow'); }
      setTimeout(() => { if (personal) { personal.classList.remove('fade-in'); personal.classList.add('fade-in-slow'); } }, 2000);
    }
  }, 900);
}

// --- QUIZ LOGIC ---
function renderQuestion() {
  if (currentQuestionIndex >= QUIZ_QUESTIONS.length) {
    db.ref(`games/${currentGameCode}/players/${playerId}`).update({ quizFinished: true });
    // show waiting page with specific message
    const codeEl = document.getElementById('lobby-code-display');
    if (codeEl) codeEl.innerText = currentGameCode || '---';
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
  } else {
    if (chosenCard) chosenCard.classList.add('wrong');
    if (correctCard) correctCard.classList.add('correct');
  }

  // mark question answered locally to prevent multiple attempts
  answeredQuestions[currentQuestionIndex] = { chosen: pendingOptionIndex, isCorrect };

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

  // Ensure currency formatting shows commas
  document.getElementById('quiz-cash-display').innerText = `£${quizScore.toLocaleString()}`;
  updateBalancePill(quizScore);
}

function nextQuestion() {
  currentQuestionIndex++;
  renderQuestion();
}

// --- ALLOCATION LOGIC ---
function setupAllocationScreen(year, myData) {
  allocationPercentages = { cash: 0, bonds: 0, commodities: 0, equities: 0 };
  lastAllocationAsset = 'equities';
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

  renderAllocationOptions();
  ['cash', 'bonds', 'commodities', 'equities'].forEach(asset => {
    const el = document.getElementById(`alloc-${asset}`);
    if (el) el.value = 0;
  });

  updateAllocationTotals();
}

function renderAllocationOptions() {
  const totalCash = parseInt(document.querySelectorAll('.player-total-cash')[0].innerText.replace(/,/g, '').replace(/[^0-9]/g, '')) || 1000;
  const options = getAllocationPercentOptions();
  const assetIds = ['cash', 'bonds', 'commodities', 'equities'];

  assetIds.forEach(asset => {
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
  const assetIds = ['cash', 'bonds', 'commodities', 'equities'];
  const exactAmounts = assetIds.map(asset => Math.round((percentages[asset] || 0) / 100 * totalBalance));
  const total = exactAmounts.reduce((sum, value) => sum + value, 0);
  const diff = totalBalance - total;

  if (diff !== 0) {
    const targetAsset = lastAllocationAsset || 'equities';
    const targetIndex = assetIds.indexOf(targetAsset);
    if (targetIndex >= 0) {
      exactAmounts[targetIndex] += diff;
    }
  }

  return exactAmounts;
}

function updateAllocationTotals() {
  const totalCash = parseInt(document.querySelectorAll('.player-total-cash')[0].innerText.replace(/,/g, '').replace(/[^0-9]/g, '')) || 1000;
  const values = getAllocationAmounts(totalCash, allocationPercentages);
  const total = values.reduce((sum, val) => sum + val, 0);
  const remaining = totalCash - total;
  const overAllocated = total > totalCash;

  const totalEl = document.getElementById('total-allocated-display');
  const remainingEl = document.getElementById('remaining-allocated-display');
  if (totalEl) totalEl.innerText = total.toLocaleString();
  if (remainingEl) remainingEl.innerText = `£${remaining.toLocaleString()}`;

  const summary = remainingEl ? remainingEl.parentElement : null;
  const accentColor = overAllocated ? 'var(--red-accent)' : 'var(--green-primary)';
  if (totalEl) totalEl.style.color = accentColor;
  if (remainingEl) remainingEl.style.color = accentColor;
  if (summary) summary.classList.toggle('over-allocated', overAllocated);

  values.forEach((value, idx) => {
    const asset = ['cash', 'bonds', 'commodities', 'equities'][idx];
    const amountEl = document.getElementById(`alloc-amount-${asset}`);
    if (amountEl) {
      amountEl.innerText = `£${value.toLocaleString()}`;
      amountEl.style.color = overAllocated ? 'var(--red-accent)' : 'var(--green-primary)';
    }
    const hiddenEl = document.getElementById(`alloc-${asset}`);
    if (hiddenEl) hiddenEl.value = value;
  });

  renderAllocationOptions();
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
  const totalRow = document.getElementById('results-total-row');
  const waitingMessage = document.querySelector('.results-waiting-message');
  [marketBox, personalBox].forEach(box => {
    if (box) {
      box.classList.remove('results-section-visible');
      box.classList.add('results-section-hidden');
    }
  });
  if (totalRow) totalRow.classList.add('results-summary-hidden');
  if (waitingMessage) waitingMessage.classList.add('results-summary-hidden');

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

    document.getElementById('new-portfolio-total').innerText = `£${Math.round(h.newBalance).toLocaleString()}`;
  }

  setTimeout(() => {
    if (marketBox) {
      marketBox.classList.remove('results-section-hidden');
      marketBox.classList.add('results-section-visible');
    }
  }, 100);

  setTimeout(() => {
    if (personalBox) {
      personalBox.classList.remove('results-section-hidden');
      personalBox.classList.add('results-section-visible');
    }
    if (totalRow) {
      totalRow.classList.remove('results-summary-hidden');
      totalRow.classList.add('results-summary-visible');
    }
    if (waitingMessage) {
      waitingMessage.classList.remove('results-summary-hidden');
      waitingMessage.classList.add('results-summary-visible');
    }
  }, 3000);
}

// Quick-fill helpers for allocation inputs
function setAllocationPercent(assetId, percent) {
  const totalCash = parseInt(document.querySelectorAll('.player-total-cash')[0].innerText.replace(/,/g, '').replace(/[^0-9]/g, '')) || 1000;
  const assetKey = assetId.replace('alloc-', '');
  if (assetKey in allocationPercentages) {
    allocationPercentages[assetKey] = percent;
    lastAllocationAsset = assetKey;
  }
  const value = getAllocationAmountFromPercent(percent, totalCash);
  const el = document.getElementById(assetId);
  if (el) {
    el.value = value;
    updateAllocationTotals();
  }
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
  for(let i=0;i<120;i++){ pieces.push({x:Math.random()*cvs.width,y:Math.random()*-cvs.height/2,vy:2+Math.random()*6, size:4+Math.random()*8, color:`hsl(${Math.random()*360},80%,60%)`}); }
  let frames = 0;
  function frame(){ ctx.clearRect(0,0,cvs.width,cvs.height); pieces.forEach(p=>{ p.y+=p.vy; ctx.fillStyle=p.color; ctx.fillRect(p.x,p.y,p.size,p.size); }); frames++; if(frames<180) requestAnimationFrame(frame); else cvs.remove(); }
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

function updateBalancePill(balanceValue) {
  const pill = document.getElementById('balance-pill');
  const valueEl = document.getElementById('balance-pill-value');
  if (!pill || !valueEl) return;
  const displayValue = typeof balanceValue === 'number' ? balanceValue : (quizScore || 1000);
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