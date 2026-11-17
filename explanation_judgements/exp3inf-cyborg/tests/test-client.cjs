const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8').replace(/bootstrap\(\);\s*$/, '');
const plain = value => JSON.parse(JSON.stringify(value));
function setup(search = '') {
  const observed = { timeline: null, properties: null, requests: [] };
  const context = vm.createContext({
    window: { location: { search } }, document: { body: { innerHTML: '' } },
    navigator: { plugins: [], languages: ['en'] }, URLSearchParams,
    console: { error() {} }, consentTrial: {}, demographicTrial: {}, feedbackTrial: {},
    GuardFriction: { createEntryTrial: () => ({}) },
    initJsPsych: () => ({ data: { addProperties: p => { observed.properties = p; } },
      run: t => { observed.timeline = t; } }),
    fetch: async (url, options) => { observed.requests.push({ url, options }); return observed.response; }
  });
  for (const match of main.matchAll(/type:\s*(\w+)/g)) context[match[1]] = {};
  for (const file of ['jspsych-urn-utils.js', 'rules.js', 'shared-stimuli.js', 'explanation-counts-data.js', 'explanation-counts.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
  }
  vm.runInContext(main, context);
  const record = JSON.parse(vm.runInContext('JSON.stringify(MOCK_DATASET)', context));
  record.subject_id = 'SYNTHETIC';
  record.scenarios.reverse();
  return { context, observed, record };
}
for (const condition of ['explanation']) {
  test(`${condition} keeps assigned urns, rule, outcomes and order across every round`, async () => {
    const { context, observed, record } = setup();
    observed.response = { ok: true, json: async () => ({ condition, dataset: record }) };
    await context.bootstrap();
    assert.equal(observed.requests[0].options.cache, 'no-store');
    assert.equal(observed.properties.condition, condition);
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
    for (const trial of observed.timeline.filter(t => 'show_explanation' in t)) {
      assert.equal(trial.show_explanation, condition === 'explanation');
      if (condition === 'no_explanation' && /^batch_feedback_/.test(trial.question_id)) {
        assert(trial.scenarios.every(s => !('selected_urn' in s) && !('selected_color' in s)));
      }
    }
  });
}

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
test('count display includes zeros and rings every ball for either outcome', () => {
 const {context} = setup();
 for (const win of [true, false]) {
  const rings = [], labels = [];
  context.window.UrnUtils.markHighlightedBall = (slot, outcome) => rings.push([slot.key, outcome]);
  context.document.createElement = () => ({setAttribute(name, value) {this[name] = value;}});
  const card = {querySelector(selector) {
   return {key: selector.slice(-1), insertAdjacentElement(position, label) {
    assert.equal(position, 'afterend'); labels.push(label);
   }};
  }};
  context.window.ExplanationCounts.render(card, {A: 0, B: 4, C: 3, D: 20}, ['A','B','C','D'], win);
  assert.deepEqual(rings, [['A',win],['B',win],['C',win],['D',win]]);
  assert.deepEqual(labels.map(l => l.textContent), [0,4,3,20]);
  assert.match(labels[0]['aria-label'], /0 people.*box A/);
 }
});
