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
  for (const file of ['jspsych-urn-utils.js', 'rules.js', 'shared-stimuli.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
  }
  vm.runInContext(main, context);
  const record = JSON.parse(vm.runInContext('JSON.stringify(MOCK_DATASET)', context));
  record.subject_id = 'SYNTHETIC';
  record.scenarios.reverse();
  return { context, observed, record };
}
for (const condition of ['explanation', 'no_explanation']) {
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
      assert.equal('selected_urn' in round.scenarios[0], condition === 'explanation');
    }
    for (const trial of observed.timeline.filter(t => 'show_explanation' in t)) {
      assert.equal(trial.show_explanation, condition === 'explanation');
      if (condition === 'no_explanation' && /^batch_feedback_/.test(trial.question_id)) {
        assert(trial.scenarios.every(s => !('selected_urn' in s) && !('selected_color' in s)));
      }
    }
  });
}
test('forced no-explanation uses the server; mock previews use no claim', async () => {
  const real = setup('?condition=no_explanation');
  real.observed.response = { ok: true, json: async () => ({ condition: 'no_explanation', dataset: real.record }) };
  await real.context.bootstrap();
  assert(real.observed.requests[0].url.includes('condition=no_explanation'));
  const mock = setup('?mock=1&condition=no_explanation');
  await mock.context.bootstrap();
  assert.equal(mock.observed.requests.length, 0);
  assert.equal(mock.observed.properties.condition, 'no_explanation');
  assert.equal(mock.observed.properties.exp1_subject_id, 'subj_mockpreview');
});
test('exhausted queues stop before initializing jsPsych or building the timeline', async () => {
  for (const search of ['', '?condition=no_explanation']) {
    const { context, observed } = setup(search);
    let initialized = false;
    context.initJsPsych = () => { initialized = true; throw new Error('Unexpected initialization'); };
    observed.response = { ok: false, status: 404, json: async () => ({ code: 'no_data_available' }) };
    await context.bootstrap();
    assert.equal(initialized, false);
    assert.equal(observed.timeline, null);
    assert.equal(observed.properties, null);
    assert.equal(observed.requests.length, 1);
    assert.match(context.document.body.innerHTML, /This experiment is currently not available\. Please return to Prolific\./);
    assert.doesNotMatch(context.document.body.innerHTML, /Please try again later/);
  }
});
test('reset, server and network errors stop instead of silently randomizing', async () => {
  for (const code of ['assignment_reset', 'Could not assign dataset']) {
    const { context, observed } = setup();
    observed.response = { ok: false, json: async () => ({ code }) };
    await context.bootstrap();
    assert.equal(observed.timeline, null);
    assert.match(context.document.body.innerHTML, /Unable to start the study/);
  }
  const { context, observed } = setup();
  context.fetch = async () => { throw new Error('Network failed'); };
  await context.bootstrap();
  assert.equal(observed.timeline, null);
  assert.match(context.document.body.innerHTML, /Unable to start the study/);
});
