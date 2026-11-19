const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8').replace(/bootstrap\(\);\s*$/, '');
const plain = value => JSON.parse(JSON.stringify(value));
function setup(search = '', protocol = 'http:') {
  const observed = { timeline: null, properties: null, requests: [] };
  const context = vm.createContext({
    window: { location: { search, protocol } }, document: { body: { innerHTML: '' } },
    navigator: { plugins: [], languages: ['en'] }, URLSearchParams,
    console: { error() {} }, consentTrial: {}, demographicTrial: {}, feedbackTrial: {},
    GuardFriction: { createEntryTrial: () => ({}) },
    initJsPsych: () => ({ data: { addProperties: p => { observed.properties = p; } },
      run: t => { observed.timeline = t; } }),
    fetch: async (url, options) => {
      observed.requests.push({ url, options });
      if (url.startsWith('data_harness/')) return {ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(root, url), 'utf8'))};
      return observed.response;
    }
  });
  for (const match of main.matchAll(/type:\s*(\w+)/g)) context[match[1]] = {};
  for (const file of ['jspsych-urn-utils.js', 'rules.js', 'stimuli.js', 'explanation-counts.js', 'data_harness/browser-data.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
  }
  vm.runInContext(main, context);
  context.window.Study3CountsData = JSON.parse(fs.readFileSync(path.join(root, 'data_harness/selections.json'), 'utf8'));
  const record = JSON.parse(fs.readFileSync(path.join(root, 'data_harness/subject_data.json'), 'utf8')).find(r => r.rule_key === 'rule4');
  record.subject_id = 'SYNTHETIC';
  record.scenarios.reverse();
  return { context, observed, record };
}
  test(`keeps assigned urns, rule, outcomes and order across every round`, async () => {
    const { context, observed, record } = setup();
    observed.response = { ok: true, json: async () => ({ dataset: record }) };
    await context.bootstrap();
    assert.equal(observed.requests[0].options.cache, 'no-store');
    assert.equal('condition' in observed.properties, false);
    assert.equal(observed.properties.exp1_subject_id, record.subject_id);
    assert.equal(observed.properties.assignment_source, 'dataset');
    assert.equal(observed.properties.rule_key, record.rule_key);
    assert.deepEqual(JSON.parse(observed.properties.urn_probs), Object.values(record.urn_probs));
    const rounds = observed.timeline.filter(t => /^prediction_round_/.test(t.question_id));
    assert.equal(rounds.length, 3);
    for (const [i, round] of rounds.entries()) {
      assert.deepEqual(plain(round.scenarios.map(s => s.id)), record.scenarios.map(s => s.id));
      assert.deepEqual(plain(round.scenarios.map(s => s.draw)), record.scenarios.map(s => s.draw));
      assert.deepEqual(plain(round.scenarios.map(s => s.result)), record.scenarios.map(s => s.result));
      assert.equal(round.scenarios.filter(s => s.given).length, [4, 8, 12][i]);
      assert.equal('selected_urn' in round.scenarios[0], false);
      assert.equal(Object.values(round.scenarios[0].explanation_counts).reduce((a,b) => a+b), 27);
    }
    assert(observed.timeline.every(t => !('show_explanation' in t)));
  });

test('mock preview builds all three rounds with pooled counts and no server claim', async () => {
 const {context, observed} = setup('?mock=1');
 await context.bootstrap();
 assert.equal(observed.requests.length, 0);
 assert.equal(observed.properties.explanation_format, 'pooled_counts');
 const feedback = observed.timeline.filter(t => /^batch_feedback_/.test(t.question_id));
 assert.equal(feedback.length, 2);
 assert(feedback.every(t => t.scenarios.length === 4 && t.scenarios.every(s => s.explanation_counts)));
});
test('counts follow probability roles when box assignments change', () => {
 const {context, record} = setup();
 const first = context.window.ExplanationCounts.attach(record);
 const swapped = plain(record);
 for (const field of ['urn_probs', 'urn_colors']) [swapped[field].A, swapped[field].D] = [swapped[field].D, swapped[field].A];
 for (const sc of swapped.scenarios) [sc.draw.A, sc.draw.D] = [sc.draw.D, sc.draw.A];
 const second = context.window.ExplanationCounts.attach(swapped);
 first.forEach((sc, i) => {
  assert.equal(sc.explanation_counts.A, second[i].explanation_counts.D);
  assert.equal(sc.explanation_counts.D, second[i].explanation_counts.A);
 });
});
test('clicking a ball/count shows the correct explanation, including zero and grey', () => {
 const {context} = setup();
 for (const win of [true, false]) {
  const rings = [], buttons = [], callouts = [];
  const element = () => ({
   style: {},
   replaceChildren(...children) {
    this.children = children;
    this.textContent = children.map(child => typeof child === 'string' ? child : child.textContent).join('');
   },
   setAttribute(name, value) {this[name] = value;},
   append(...children) {this.children = children;},
   addEventListener(name, listener) {this[name] = listener;}
  });
  context.window.UrnUtils.markHighlightedBall = (slot, outcome) => rings.push([slot.key, outcome]);
  context.document.createElement = element;
  const card = {
   appendChild(child) {callouts.push(child);},
   querySelector(selector) {return {key: selector.slice(-1), insertAdjacentElement(position, button) {
    assert.equal(position, 'beforebegin'); buttons.push(button);
   }};}
  };
  context.window.ExplanationCounts.render(card, {A: 0, B: 1, C: 3, D: 20}, ['A','B','C','D'], win,
   {A:'lightgrey', B:'blue', C:'purple', D:'hotpink'});
  assert.deepEqual(rings, [['A',win],['B',win],['C',win],['D',win]]);
  assert.deepEqual(buttons.map(b => b.children[1].textContent), [0,1,3,20]);
  assert.equal(callouts[0].hidden, true);
  buttons[0].click();
  assert.equal(callouts[0].textContent, `0 people said ‘John ${win ? 'won' : 'lost'} because of the grey ball from box A’`);
  assert.equal(callouts[0].hidden, false);
  buttons[3].click();
  assert.match(callouts[0].textContent, /20 people.*pink ball from box D/);
  assert.equal(buttons[0]['aria-pressed'], 'false');
  assert.equal(buttons[3]['aria-pressed'], 'true');
  buttons[3].click();
  assert.equal(callouts[0].hidden, true);
  assert.equal(callouts[0].textContent, '');
  assert(buttons.every(b => b['aria-pressed'] === 'false'));
  buttons[3].click();
  assert.equal(callouts[0].hidden, false);
  buttons[1].click();
  assert.match(callouts[0].textContent, /^1 person said/);
  assert.match(buttons[1]['aria-label'], /1 person selected/);
  assert.equal(buttons[3]['aria-pressed'], 'false');
 }
});
test('main instructions introduce knowledgeable people without the count legend', () => {
 const {context} = setup();
 const text = context.preExperimentHTML(3);
 assert.match(text, /how many people, who know the rule, chose each ball as the explanation for the outcome/);
 assert.doesNotMatch(text, /previous study|numbers in the observations|explanation-counts-legend/);
});

test('mock urn override preserves scenario roles, outcomes, and pooled counts', () => {
 const {context, record} = setup();
 const order = [0.1, 0.4, 0.6, 0.9];
 const remapped = context.applyMockUrnOrder(record, order);
 assert.deepEqual(plain(Object.values(remapped.urn_probs)), order);
 assert.deepEqual(plain(remapped.scenarios.map(s => [s.id, s.result])), record.scenarios.map(s => [s.id, s.result]));
 const before = context.window.ExplanationCounts.attach(record);
 const after = context.window.ExplanationCounts.attach(remapped);
 for (let i = 0; i < before.length; i++) {
  for (const key of ['A','B','C','D']) {
   const old = Object.keys(record.urn_probs).find(k => record.urn_probs[k] === remapped.urn_probs[key]);
   assert.equal(before[i].explanation_counts[old], after[i].explanation_counts[key]);
   assert.equal(record.scenarios[i].draw[old] === 'lightgrey', remapped.scenarios[i].draw[key] === 'lightgrey');
  }
 }
 assert.throws(() => context.applyMockUrnOrder(record, [0.1,0.1,0.4,0.9]), /exactly once/);
 assert.equal(context.applyMockUrnOrder(record, null), record);
});

test('only mock=1 enables mock mode, regardless of URL protocol', async () => {
 for (const protocol of ['file:', 'http:']) {
  const mock = setup('?mock=1', protocol);
  mock.context.fetch = async () => { throw new Error('mock must not fetch or claim'); };
  await mock.context.bootstrap();
  assert(mock.observed.timeline);
  assert.equal(mock.observed.properties.assignment_source, 'mock');
  for (const query of ['', '?mock=0']) {
   const real = setup(query, protocol);
   real.observed.response = {ok: true, json: async () => ({dataset: real.record})};
   await real.context.bootstrap();
   if (protocol === 'file:') {
    assert.equal(real.observed.timeline, null);
    assert.equal(real.observed.requests.length, 0);
    assert.match(real.context.document.body.innerHTML, /Non-mock assignment requires PHP/);
   } else {
    assert.equal(real.observed.properties.assignment_source, 'dataset');
    assert(real.observed.requests.some(r => r.url.startsWith('assign_dataset.php?')));
   }
  }
 }
});
test('browser mirror exactly matches both harness JSON files', () => {
 const {context} = setup();
 for (const name of ['selections.json', 'subject_data.json']) {
  assert.deepEqual(plain(context.window.Study3HarnessData[name]), JSON.parse(fs.readFileSync(path.join(root, 'data_harness', name), 'utf8')));
 }
});
