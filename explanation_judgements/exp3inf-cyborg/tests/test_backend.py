"""Exercise Study 3's single-queue assignment and completion in a temporary tree."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='study3-test-') as tmp:
    base = Path(tmp)
    for source in ROOT.glob('*.php'):
        shutil.copy(source, base / source.name)
    (base / 'config.php').write_text("<?php return ['data_dir' => __DIR__.'/output', 'datasets_dir' => __DIR__.'/datasets'];")
    source = next((ROOT.parents[1] / 'analyses/inf_experiment2/inference_exp2/datasets').glob('*/*.json'))
    record = json.loads(source.read_text())
    available = base / 'datasets/available'
    available.mkdir(parents=True)
    filename = record['subject_id'] + '.json'
    (available / filename).write_text(json.dumps(record))

    def php(code):
        return subprocess.check_output(['php', '-d', 'display_errors=stderr', '-r', code], cwd=base, text=True)

    def assign(subject):
        return json.loads(php("$_SERVER['REQUEST_METHOD']='GET'; $_GET['exp2_subject_id']='" + subject + "'; require 'assign_dataset.php';"))

    assert assign('test_subject') == {'dataset': record}
    assert assign('test_subject') == {'dataset': record}, 'Repeat assignment must retain yoking'
    assert assign('second_subject')['code'] == 'no_data_available'
    assert (base / 'datasets/in_progress' / filename).is_file()
    result = php("require 'dataset-ledger.php'; $config=require 'config.php'; $lock=lockDatasetLedger($config); echo completeDatasetClaim($config, 'test_subject');")
    assert result == 'used'
    assert (base / 'datasets/used' / filename).is_file()
    assert assign('test_subject') == {'dataset': record}
    assert sorted(p.name for p in (base / 'datasets').iterdir()) == ['.ledger.lock', 'available', 'in_progress', 'used']
    print('Single-queue assignment, repeat assignment, exhaustion, and completion passed.')

    # A bad save root must give an actionable stage and leave the record available.
    (base / 'datasets/used' / filename).rename(available / filename)
    (base / 'blocked-output').write_text('not a directory')
    (base / 'config.php').write_text("<?php return ['data_dir' => __DIR__.'/blocked-output', 'datasets_dir' => __DIR__.'/datasets'];")
    error = assign('failure_test')
    assert error['code'] == 'allocation_save_directory_failed', error
    assert error['error'] == 'Invalid study directory', error
    assert (available / filename).is_file()
    print('Failed save-directory preparation reports its stage without claiming a record.')
