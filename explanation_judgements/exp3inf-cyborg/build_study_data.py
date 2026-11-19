"""Build a new Study 3 data harness and verify against processed Study 1 judgments.
Input is the original Study 2 ledger (all states, deduplicated by subject).
Never modifies the source ledger. Run --help for options.
"""
import argparse
import collections
import csv
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
KEYS = 'ABCD'


def compile_records(source):
    records = {}
    for state in ('available', 'in_progress', 'used', 'available_noexpl', 'in_progress_noexpl', 'used_noexpl'):
        for path in sorted((source / state).glob('*.json')):
            record = json.loads(path.read_text())
            sid = record['subject_id']
            if sid in records and records[sid] != record:
                raise ValueError(f'Conflicting duplicate participant: {sid}')
            records[sid] = record
    if not records:
        raise ValueError('No source records found')
    pooled = {}
    totals = collections.Counter()
    for record in records.values():
        rule = record['rule_key']
        order = sorted(KEYS, key=lambda k: -record['urn_probs'][k])
        assert sorted(record['urn_probs'].values()) == [0.1, 0.4, 0.6, 0.9]
        assert len(record['scenarios']) == 16
        seen = set()
        for sc in record['scenarios']:
            assert all(sc['draw'][k] in ('lightgrey', record['urn_colors'][k]) for k in KEYS)
            pattern = ''.join('0' if sc['draw'][k] == 'lightgrey' else '1' for k in order)
            assert pattern not in seen
            seen.add(pattern)
            assert sc['selected_color'] == sc['draw'][sc['selected_urn']]
            entry = pooled.setdefault(rule, {}).setdefault(pattern, {'counts': [0]*4, 'outcome': sc['result']})
            assert entry['outcome'] == sc['result']
            entry['counts'][order.index(sc['selected_urn'])] += 1
        totals[rule] += 1
    for rule, scenarios in pooled.items():
        assert len(scenarios) == 16
        assert all(sum(sc['counts']) == totals[rule] for sc in scenarios.values())
    digest = hashlib.sha256(json.dumps(records, sort_keys=True).encode()).hexdigest()
    return records, {'version': digest, 'participants_by_rule': dict(sorted(totals.items())), 'rules': pooled}


def verify_judgments(records, pooled, judgments):
    """Match each dataset selection to the processed CSV by subject and world."""
    expected = {}
    for record in records.values():
        keys = sorted(KEYS, key=lambda k: -record['urn_probs'][k])
        for sc in record['scenarios']:
            pattern = ''.join('0' if sc['draw'][k] == 'lightgrey' else '1' for k in keys)
            expected[record['subject_id'], record['rule_key'], pattern] = (
                keys.index(sc['selected_urn']), int(sc['result'] == 'win'))
    actual = {}
    with judgments.open(newline='') as handle:
        for row in csv.DictReader(handle):
            key = row['subject_id'], row['rule_key'], row['draw_code']
            if key in actual:
                raise ValueError(f'Duplicate judgment: {key}')
            actual[key] = (int(row['selected_rank_index']), int(row['outcome']))
    if actual != expected:
        raise ValueError('Dataset selections do not match processed judgments by subject/rule/scenario')
    for rule, scenarios in pooled['rules'].items():
        for pattern, entry in scenarios.items():
            selections = [{'subject_id': sid, 'selected_rank_index': rank}
                          for (sid, r, world), (rank, outcome) in sorted(actual.items())
                          if r == rule and world == pattern]
            counts = [sum(s['selected_rank_index'] == rank for s in selections) for rank in range(4)]
            if counts != entry['counts']:
                raise ValueError(f'Count mismatch: {rule}/{pattern}')
            entry['selections'] = selections
    pooled['judgments_sha256'] = hashlib.sha256(judgments.read_bytes()).hexdigest()
    pooled['selection_total'] = len(actual)
    pooled['rank_order'] = ['high', 'medHigh', 'medLow', 'low']


def write_browser_bundle(harness):
    """Generate a script-loadable mirror of the JSON for mock mode."""
    bundle = {name: json.loads((harness / name).read_text())
              for name in ('selections.json', 'subject_data.json')}
    (harness / 'browser-data.js').write_text(
        '// Generated from harness JSON; refresh with build_study_data.py --refresh-browser-bundle.\n'
        + 'window.Study3HarnessData = ' + json.dumps(bundle) + ';\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=HERE.parents[1] / 'analyses/inf_experiment2/inference_exp2/datasets')
    parser.add_argument('--judgments', type=Path, default=HERE.parents[1] / 'analyses/cs_experiment1/data_processed/exp1cs-1_judgments.csv')
    parser.add_argument('--harness', type=Path, default=HERE / 'data_harness')
    parser.add_argument('--refresh-browser-bundle', action='store_true', help='Refresh only the mock browser mirror; never changes queue state')
    args = parser.parse_args()
    if args.refresh_browser_bundle:
        write_browser_bundle(args.harness)
        raise SystemExit(0)
    records, pooled = compile_records(args.source)
    verify_judgments(records, pooled, args.judgments)
    # Never overwrite a live harness or reset its assignment state.
    args.harness.mkdir(parents=True, exist_ok=False)
    for state in ('available', 'in_progress', 'used'):
        (args.harness / state).mkdir()
        (args.harness / state / '.gitkeep').touch()
    for sid, record in records.items():
        if not sid.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Invalid subject id')
        (args.harness / 'available' / f'{sid}.json').write_text(json.dumps(record, indent=2) + '\n')
    (args.harness / 'selections.json').write_text(json.dumps(pooled, indent=2, sort_keys=True) + '\n')
    # Immutable preview snapshot: remains usable after live records change queue state.
    (args.harness / 'subject_data.json').write_text(json.dumps(list(records.values()), indent=2) + '\n')
    write_browser_bundle(args.harness)
    print(json.dumps({'participants': len(records), 'selections': pooled['selection_total'],
                      'by_rule': pooled['participants_by_rule'], 'version': pooled['version']}, indent=2))
