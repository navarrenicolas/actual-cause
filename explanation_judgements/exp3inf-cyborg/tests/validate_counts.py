"""Independently check frozen counts against raw Study 1 CSV submissions."""
import collections
import csv
import json
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
ROOT = HERE.parents[1]
raw = collections.Counter()
subjects = collections.defaultdict(set)
for path in (ROOT / 'analyses/cs_experiment1/data/exp1cs-1').glob('*.csv'):
    rows = [r for r in csv.DictReader(path.open()) if r['event_type'] == 'explanation_selection_submit']
    assert len(rows) == 16
    for row in rows:
        probs = dict(zip('ABCD', json.loads(row['urn_probs'])))
        keys = sorted('ABCD', key=lambda k: -probs[k])
        pattern = ''.join('0' if row['draw_' + k] == 'lightgrey' else '1' for k in keys)
        raw[row['rule_key'], pattern, keys.index(row['selected_urn'])] += 1
        subjects[row['rule_key']].add(row['subject_id'])
data = json.loads((HERE / 'data_harness/selections.json').read_text())
for rule, scenarios in data['rules'].items():
    assert len(subjects[rule]) == data['participants_by_rule'][rule]
    assert len(scenarios) == 16
    for pattern, entry in scenarios.items():
        assert entry['counts'] == [raw[rule, pattern, role] for role in range(4)]
print('Verified all 320 counts (5 rules × 16 scenarios × 4 roles) against 132 raw Study 1 CSVs.')

processed = list(csv.DictReader((ROOT / 'analyses/cs_experiment1/data_processed/exp1cs-1_judgments.csv').open()))
counts = collections.Counter((r['rule_key'], r['draw_code'], int(r['selected_rank_index'])) for r in processed)
assert len(processed) == data['selection_total'] == sum(raw.values())
for rule, scenarios in data['rules'].items():
    for pattern, entry in scenarios.items():
        assert entry['counts'] == [counts[rule, pattern, rank] for rank in range(4)]
        assert len(entry['selections']) == sum(entry['counts'])
records = json.loads((HERE / 'data_harness/subject_data.json').read_text())
assert len(records) == sum(data['participants_by_rule'].values())
for record in records:
    paths = [HERE / 'data_harness' / state / (record['subject_id'] + '.json') for state in ('available', 'in_progress', 'used')]
    existing = [path for path in paths if path.exists()]
    assert len(existing) == 1
    assert json.loads(existing[0].read_text()) == record
print('Processed judgments totals and all 132 yoked records verified across harness queue states.')
