const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function makeGame() {
  const game = { state: 'LOBBY', currentSection: 0, currentYear: 1, players: {
    player: { name: 'Player', balance: 1000, quizScore: 1000, quizIndex: 0, quizFinished: false }
  } };
  const elements = {};
  function element() {
    return { innerText: '', innerHTML: '', style: {}, classList: { add() {}, remove() {}, toggle() {} },
      addEventListener() {}, setAttribute() {}, appendChild() {} };
  }
  const document = {
    getElementById(id) { return elements[id] ||= element(); },
    createElement: element,
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
  function ref(refPath = '') {
    const parts = refPath.split('/').filter(Boolean);
    function value() { return parts.reduce((node, part) => node && node[part], game); }
    return {
      child(part) { return ref([...parts, part].join('/')); },
      once(event, callback) { callback({ val: value }); },
      on(event, callback) { this.listener = callback; listeners.push(callback); },
      set(updatedValue) {
        const parent = parts.slice(0, -1).reduce((node, part) => node[part], game);
        parent[parts.at(-1)] = updatedValue;
      },
      remove() {
        const parent = parts.slice(0, -1).reduce((node, part) => node[part], game);
        delete parent[parts.at(-1)];
      },
      update(updates) {
        for (const [key, updatedValue] of Object.entries(updates)) {
          const keys = [...parts, ...key.split('/')];
          let node = game;
          for (const part of keys.slice(0, -1)) node = node[part] ||= {};
          node[keys.at(-1)] = updatedValue;
        }
      }
    };
  }
  const listeners = [];
  const gameRef = ref();
  const context = vm.createContext({ document, db: { ref: () => ref('players/player') }, gameRef, console,
    prompt: () => 'Renamed', confirm: () => true });
  vm.runInContext(read('data.js') + '\n' + read('app.js'), context);
  vm.runInContext("currentGameCode = 'TEST'; playerId = 'player'; gameRef = globalThis.gameRef; launchConfettiCannon = () => {};", context);
  return { game, elements, context, notify: () => listeners.forEach(listener => listener({ val: () => game })) };
}

test('standard quiz contains two five-question sessions and identical post-16 returns', () => {
  const standard = vm.runInNewContext(read('data.js') + '; JSON.stringify({ sections: QUIZ_SECTIONS, returns: YEAR_RETURNS })');
  const post16 = vm.runInNewContext(read('post16-data.js') + '; JSON.stringify(YEAR_RETURNS)');
  const data = JSON.parse(standard);
  assert.deepEqual(data.sections.map(section => section.questions.length), [5, 5]);
  assert.deepEqual(data.returns, JSON.parse(post16));
  for (const question of data.sections.flatMap(section => section.questions)) {
    assert.ok(question.options[question.answer]);
    assert.ok(question.explanation);
  }
});

test('quiz sessions reset progress, retain earnings, and proceed without gambling', () => {
  const { game, elements, context, notify } = makeGame();
  vm.runInContext('listenToGameAsPlayer(); adminStartSection(0);', context);
  notify();
  assert.match(elements['quiz-question-num'].innerText, /1 of 5/);
  vm.runInContext('pendingOptionIndex = QUIZ_SECTIONS[0].questions[0].answer; confirmAnswer();', context);
  assert.equal(game.players.player.balance, 1100);
  for (let index = 0; index < 5; index++) vm.runInContext('nextQuestion()', context);
  assert.equal(game.players.player.quizFinished, true);
  assert.equal(game.players.player.quizIndex, 5);
  vm.runInContext('adminStartSection(1)', context);
  assert.equal(game.players.player.quizIndex, 0);
  assert.equal(game.players.player.quizFinished, false);
  assert.equal(game.players.player.balance, 1100);
  notify();
  assert.match(elements['quiz-section-badge'].innerText, /Session 2/);
  assert.match(elements['quiz-question-num'].innerText, /1 of 5/);
  vm.runInContext('pendingOptionIndex = QUIZ_SECTIONS[1].questions[0].answer; confirmAnswer();', context);
  assert.equal(game.players.player.balance, 1200);
  vm.runInContext("adminChangeState('SIMULATION_INTRO')", context);
  notify();
  assert.match(elements['lobby-title'].innerText, /Quiz sessions complete/);
  vm.runInContext("adminChangeState('ALLOCATING')", context);
  assert.equal(game.state, 'ALLOCATING');
});

test('host advances to final leaderboard after year four and retains player management', () => {
  const { game, elements, context, notify } = makeGame();
  vm.runInContext('listenToGameAsAdmin()', context);
  game.state = 'RESULTS';
  game.currentYear = 3;
  notify();
  assert.match(elements['admin-actions'].innerHTML, /Advance to Year 4/);
  game.currentYear = 4;
  notify();
  assert.match(elements['admin-actions'].innerHTML, /Show Final Leaderboard/);
  assert.doesNotMatch(elements['admin-actions'].innerHTML, /Year 5/);
  vm.runInContext("adminEditPlayer('player')", context);
  assert.equal(game.players.player.name, 'Renamed');
  vm.runInContext("adminRemovePlayer('player')", context);
  assert.equal(game.players.player, undefined);
});

test('all four simulation years apply the post-16 returns', () => {
  const { game, context } = makeGame();
  let balance = 1000;
  for (const [index, rate] of [0.26, 0.10, -0.41, 0.27].entries()) {
    const year = index + 1;
    game.players.player.allocations ||= {};
    game.players.player.allocations[`year${year}`] = { cash: 0, bonds: 0, commodities: 0, equities: balance };
    vm.runInContext(`processYearSimulation(${year})`, context);
    balance *= 1 + rate;
    assert.ok(Math.abs(game.players.player.balance - balance) < 0.000001);
    assert.equal(game.state, 'RESULTS');
  }
});