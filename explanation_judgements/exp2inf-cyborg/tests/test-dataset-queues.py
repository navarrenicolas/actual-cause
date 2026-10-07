"""Run the real PHP endpoints against synthetic, temporary queue directories."""
import concurrent.futures
import csv
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
import uuid

SOURCE = Path(__file__).resolve().parents[1]
CONDITIONS = ('explanation', 'no_explanation')
STATES = ('available', 'in_progress', 'used')


class QueueTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'exp1').mkdir()
        for name in ('dataset-ledger.php', 'save-directory.php', 'assign_dataset.php',
                     'safe_save.php', 'check_datasets.php', 'export_exp1_datasets.php'):
            source = (SOURCE / name).read_text()
            if name == 'safe_save.php':
                source = source.replace("'php://input'", "getenv('TEST_BODY')")
            (self.root / name).write_text(source)
        (self.root / 'config.php').write_text("<?php return ["
            "'explanation'=>['exp2_data_dir'=>__DIR__.'/outputs/explanation'],"
            "'no_explanation'=>['exp2_data_dir'=>__DIR__.'/outputs/no_explanation'],"
            "'exp1_data_dir'=>__DIR__.'/exp1','datasets_dir'=>__DIR__.'/datasets'];")

    def request(self, endpoint, query=None, body=None):
        env = os.environ.copy()
        env['TEST_QUERY'] = json.dumps(query or {})
        code = "umask(0027); $_SERVER['REQUEST_METHOD']='GET'; $_GET=json_decode(getenv('TEST_QUERY'),true); "
        if body is not None:
            path = self.root / f'request-{uuid.uuid4().hex}.json'
            path.write_text(json.dumps(body))
            env['TEST_BODY'] = str(path)
            code = "umask(0027); $_SERVER['REQUEST_METHOD']='POST'; $_SERVER['CONTENT_TYPE']='application/json'; "
        result = subprocess.run(['php', '-r', code + f"require '{endpoint}';"],
                                cwd=self.root, env=env, text=True, capture_output=True, check=True)
        return json.loads(result.stdout)

    def assign(self, subject, condition=None):
        query = {'exp2_subject_id': subject}
        if condition:
            query['condition'] = condition
        return self.request('assign_dataset.php', query=query)

    def save(self, subject, condition):
        prefix = 'causal_inf_exp2_' if condition == 'explanation' else 'causal_inf_exp2_noexpl_'
        return self.request('safe_save.php', body={'filename': prefix + subject + '.csv',
            'filedata': 'subject_id,response\n' + subject + ',synthetic\n',
            'exp2_subject_id': subject, 'condition': condition})

    def folder(self, condition, state):
        return self.root / 'datasets' / (state + ('_noexpl' if condition == 'no_explanation' else ''))

    def output(self, condition):
        return self.root / 'outputs' / condition

    def fixture(self, name, copies=True):
        colors = dict(zip('ABCD', ['orange', 'blue', 'purple', 'hotpink']))
        scenarios = []
        for n in reversed(range(16)):
            draw = {k: colors[k] if n & (1 << i) else 'lightgrey' for i, k in enumerate('ABCD')}
            scenarios.append({'id': n + 1, 'draw': draw,
                'result': 'win' if any(draw[k] != 'lightgrey' for k in 'ABD') else 'lose',
                'selected_urn': 'A', 'selected_color': draw['A']})
        record = {'subject_id': name, 'rule_key': 'rule4', 'urn_colors': colors,
                  'urn_probs': dict(zip('ABCD', [.9, .6, .4, .1])), 'scenarios': scenarios}
        rows = [{'subject_id': name, 'rule_key': 'rule4',
                 'urn_colors': json.dumps(list(colors.values())), 'urn_probs': json.dumps([.9, .6, .4, .1]),
                 'event_type': 'explanation_selection_submit', 'scenario_id': sc['id'],
                 **{'draw_' + k: v for k, v in sc['draw'].items()},
                 'result': sc['result'], 'selected_urn': sc['selected_urn'],
                 'selected_color': sc['selected_color']} for sc in scenarios]
        with (self.root / 'exp1' / ('causal_exp1_' + name + '.csv')).open('w') as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)
        if copies:
            for condition in CONDITIONS:
                self.folder(condition, 'available').mkdir(parents=True, exist_ok=True)
                (self.folder(condition, 'available') / (name + '.json')).write_text(json.dumps(record))
        return record

    def state(self, condition, name):
        states = [s for s in STATES if (self.folder(condition, s) / (name + '.json')).exists()]
        self.assertEqual(len(states), 1, states)
        return states[0]

    def run_script(self, script, success=True):
        result = subprocess.run(['php', script], cwd=self.root, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0 if success else 1, result.stdout + result.stderr)
        return result.stdout

    def check(self):
        return self.run_script('check_datasets.php')

    def test_default_fallback_uses_independent_copy_with_same_order_without_selections(self):
        original = self.fixture('pair')
        exp = self.assign('exp')
        self.assertEqual(exp, {'condition': 'explanation', 'dataset': original})
        self.assertEqual(self.state('explanation', 'pair'), 'in_progress')
        self.assertEqual(self.state('no_explanation', 'pair'), 'available')
        noexp = self.assign('noexp')
        self.assertEqual(noexp['condition'], 'no_explanation')
        expected = json.loads(json.dumps(original))
        expected['scenarios'] = [{k: sc[k] for k in ('id', 'draw', 'result')} for sc in original['scenarios']]
        self.assertEqual(noexp['dataset'], expected)
        self.assertEqual(self.state('explanation', 'pair'), 'in_progress')
        self.assertEqual(self.state('no_explanation', 'pair'), 'in_progress')
        self.assertEqual(self.save('noexp', 'no_explanation')['dataset_status'], 'used')
        self.assertEqual(self.state('explanation', 'pair'), 'in_progress')
        self.assertIn('explanation/pair.json: pending participant exp', self.check())
        self.assertEqual(self.save('exp', 'explanation')['dataset_status'], 'used')
        self.check()
        self.assertEqual(self.assign('extra')['code'], 'no_data_available')

    def test_force_noexp_and_explanation_finishes_first(self):
        self.fixture('order')
        self.assertEqual(self.assign('noexp', 'no_explanation')['condition'], 'no_explanation')
        self.assertEqual(self.state('explanation', 'order'), 'available')
        self.assertEqual(self.assign('exp')['condition'], 'explanation')
        self.save('exp', 'explanation')
        self.assertEqual(self.state('no_explanation', 'order'), 'in_progress')
        self.save('noexp', 'no_explanation')
        self.check()

    def test_legacy_random_session_save_leaves_claims_and_queues_untouched(self):
        self.fixture('pair')
        self.assign('exp')
        self.assign('noexp')
        self.save('noexp', 'no_explanation')
        self.assertEqual(self.assign('random')['code'], 'no_data_available')
        logs = {c: (self.output(c) / 'assign_log.csv').read_bytes() for c in CONDITIONS}
        records = {p: p.read_bytes() for p in (self.root / 'datasets').rglob('*.json')}
        for _ in range(2):
            self.assertEqual(self.save('random', 'no_explanation')['dataset_status'], 'unassigned')
        self.assertTrue((self.output('no_explanation') / 'data' / 'causal_inf_exp2_noexpl_random.csv').is_file())
        self.assertEqual({c: (self.output(c) / 'assign_log.csv').read_bytes() for c in CONDITIONS}, logs)
        self.assertEqual({p: p.read_bytes() for p in (self.root / 'datasets').rglob('*.json')}, records)
        self.assertIn('no_explanation/random has saved data without a claim (random fallback or legacy session)', self.check())

    def test_exhausted_queue_never_reuses_other_condition_or_its_used_records(self):
        self.fixture('exhausted')
        self.assign('exp')
        self.save('exp', 'explanation')
        self.assertEqual(self.assign('other_exp', 'explanation')['code'], 'no_data_available')
        self.assign('noexp')
        self.assertEqual(self.assign('other_noexp', 'no_explanation')['code'], 'no_data_available')
        self.assertEqual(self.state('explanation', 'exhausted'), 'used')
        self.assertEqual(self.state('no_explanation', 'exhausted'), 'in_progress')

    def test_manual_resets_block_old_saves_and_retries_in_both_conditions(self):
        self.fixture('reset')
        for condition in CONDITIONS:
            old, new = 'old_' + condition, 'new_' + condition
            self.assign(old, condition)
            src = self.folder(condition, 'in_progress') / 'reset.json'
            src.rename(self.folder(condition, 'available') / 'reset.json')
            self.assertIn('manually reset', self.check())
            self.assertEqual(self.assign(old, condition)['code'], 'assignment_reset')
            self.assertEqual(self.save(old, condition)['dataset_status'], 'superseded')
            self.assertEqual(self.state(condition, 'reset'), 'available')
            self.assign(new, condition)
            self.assertEqual(self.save(old, condition)['dataset_status'], 'superseded')
            self.assertEqual(self.state(condition, 'reset'), 'in_progress')
            self.assertEqual(self.assign(old, condition)['code'], 'assignment_reset')
            self.assertEqual(self.save(new, condition)['dataset_status'], 'used')
            self.save(old, condition)
            self.assertEqual(self.state(condition, 'reset'), 'used')
        self.check()

    def test_assignment_and_csv_retries_are_idempotent(self):
        self.fixture('retry')
        first = self.assign('same')
        self.assertEqual(self.assign('same'), first)
        self.save('same', 'explanation')
        csv_path = self.output('explanation') / 'data/causal_inf_exp2_same.csv'
        previous = csv_path.read_bytes()
        self.assertEqual(self.save('same', 'explanation')['dataset_status'], 'used')
        self.assertEqual(csv_path.read_bytes(), previous)
        self.assertEqual(len((self.output('explanation') / 'assign_log.csv').read_text().splitlines()), 1)
        self.assertEqual(self.assign('same'), first)
        self.check()

    def test_concurrent_claims_and_saves_never_share_a_copy(self):
        for i in range(5):
            self.fixture('parallel' + str(i))
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
            results = list(pool.map(self.assign, ['session' + str(i) for i in range(18)]))
        assigned = [(i, r) for i, r in enumerate(results) if 'dataset' in r]
        self.assertEqual(len(assigned), 10)
        for condition in CONDITIONS:
            ids = [r['dataset']['subject_id'] for _, r in assigned if r['condition'] == condition]
            self.assertEqual(len(ids), 5)
            self.assertEqual(len(set(ids)), 5)
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
            results = list(pool.map(lambda p: self.save('session' + str(p[0]), p[1]['condition']), assigned))
        self.assertTrue(all(r.get('dataset_status') == 'used' for r in results), results)
        self.check()

    def test_missing_condition_parents_data_and_both_logs_are_created(self):
        self.fixture('directories')
        self.assign('exp')
        self.assign('noexp')
        for condition, subject in [('explanation', 'exp'), ('no_explanation', 'noexp')]:
            parent = self.output(condition)
            self.assertEqual(parent.stat().st_mode & 0o777, 0o777)
            self.assertEqual((parent / 'data').stat().st_mode & 0o777, 0o777)
            self.assertTrue((parent / 'assign_log.csv').is_file())
            self.save(subject, condition)
            self.assertEqual(len(list((parent / 'data').glob('*.csv'))), 1)
            self.assertEqual(list(parent.glob('causal_*.csv')), [])
        self.check()

    def test_export_creates_both_copies_without_resetting_claimed_records(self):
        self.fixture('exported', copies=False)
        self.assertIn('2 new queue record(s)', self.run_script('export_exp1_datasets.php'))
        first = (self.folder('explanation', 'available') / 'exported.json').read_bytes()
        self.assertEqual(first, (self.folder('no_explanation', 'available') / 'exported.json').read_bytes())
        self.assign('exp')
        self.assign('noexp')
        self.save('noexp', 'no_explanation')
        self.assertIn('0 new queue record(s)', self.run_script('export_exp1_datasets.php'))
        self.assertEqual(self.state('explanation', 'exported'), 'in_progress')
        self.assertEqual(self.state('no_explanation', 'exported'), 'used')
        self.check()

    def test_export_seeds_missing_copy_from_exact_existing_order(self):
        original = self.fixture('seed')
        (self.folder('no_explanation', 'available') / 'seed.json').unlink()
        self.assign('exp')
        self.assertIn('1 new queue record(s)', self.run_script('export_exp1_datasets.php'))
        copied = json.loads((self.folder('no_explanation', 'available') / 'seed.json').read_text())
        self.assertEqual(copied, original)
        self.assertEqual(self.state('explanation', 'seed'), 'in_progress')
        self.check()

    def test_bad_records_remain_available_and_log_failure_rolls_back(self):
        self.fixture('bad')
        for condition in CONDITIONS:
            (self.folder(condition, 'available') / 'bad.json').write_text('{malformed')
        self.assertEqual(self.assign('none')['code'], 'no_data_available')
        self.assertEqual(self.state('explanation', 'bad'), 'available')
        self.fixture('good')
        endpoint = self.root / 'assign_dataset.php'
        endpoint.write_text(endpoint.read_text().replace(
            '@file_put_contents(datasetLogPath($config, $condition), $line, FILE_APPEND | LOCK_EX)', 'false'))
        self.assertEqual(self.assign('blocked')['error'], 'Could not assign dataset')
        self.assertEqual(self.state('explanation', 'good'), 'available')

    def test_failed_csv_and_wrong_condition_never_promote(self):
        self.fixture('failed')
        self.assign('exp')
        (self.output('explanation') / 'data/causal_inf_exp2_exp.csv').mkdir()
        self.assertIn('error', self.save('exp', 'explanation'))
        self.assertIn('error', self.save('exp', 'no_explanation'))
        self.assertEqual(self.state('explanation', 'failed'), 'in_progress')
        self.assertEqual(self.state('no_explanation', 'failed'), 'available')
        self.assertEqual(self.save('legacy', 'no_explanation')['dataset_status'], 'unassigned')

    def test_repeated_concurrent_requests_for_one_participant_claim_once(self):
        self.fixture('same')
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(self.assign, ['same_participant'] * 10))
        self.assertTrue(all(r == results[0] for r in results))
        self.assertEqual(len((self.output('explanation') / 'assign_log.csv').read_text().splitlines()), 1)
        self.assertEqual(self.state('no_explanation', 'same'), 'available')
        self.assertEqual((self.root / 'datasets/.ledger.lock').stat().st_mode & 0o777, 0o666)

    def test_checker_detects_duplicates_and_different_condition_copies(self):
        self.fixture('check')
        self.assign('exp')
        src = self.folder('explanation', 'in_progress') / 'check.json'
        duplicate = self.folder('explanation', 'available') / 'check.json'
        shutil.copy(src, duplicate)
        self.assertIn('duplicate record', self.run_script('check_datasets.php', success=False))
        duplicate.unlink()
        noexp = self.folder('no_explanation', 'available') / 'check.json'
        record = json.loads(noexp.read_text())
        record['scenarios'].reverse()
        noexp.write_text(json.dumps(record))
        self.assertIn('different task data/order', self.run_script('check_datasets.php', success=False))


if __name__ == '__main__':
    unittest.main()
