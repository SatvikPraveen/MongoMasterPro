"""Shared fixtures for the dataset generator tests."""

import sys
from pathlib import Path

import pytest

GENERATOR_DIR = Path(__file__).resolve().parents[2] / "data" / "generators"
sys.path.insert(0, str(GENERATOR_DIR))

import generate_data  # noqa: E402  (path set up above)

SMALL_SCALE = 0.05  # 50 users, 5 courses, 250 enrollments: fast but non-trivial


@pytest.fixture(scope="session")
def dataset():
    gen = generate_data.DatasetGenerator(mode="lite", scale=SMALL_SCALE, log=lambda *a: None)
    return gen.generate()


@pytest.fixture(scope="session")
def written(tmp_path_factory):
    out = tmp_path_factory.mktemp("dataset")
    gen = generate_data.DatasetGenerator(mode="lite", scale=SMALL_SCALE, log=lambda *a: None)
    data = gen.generate()
    manifest = generate_data.write_dataset(data, out, gen.parameters(), log=lambda *a: None)
    return out, manifest, data
