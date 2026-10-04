"""Properties the reference dataset generator must guarantee.

These tests encode the reproducibility contract documented in
data/DATA_CARD.md: determinism, referential integrity, uniqueness constraints
matching the bootstrap indexes, type fidelity in the Extended JSON output, and
a manifest whose digests match the files on disk.
"""

import hashlib
import json
from datetime import datetime

import generate_data
from bson import ObjectId
from bson.json_util import loads

SILENT = {"log": lambda *a: None}


def _digests(directory):
    return {
        p.name: hashlib.sha256(p.read_bytes()).hexdigest()
        for p in sorted(directory.glob("*.jsonl"))
    }


# ----------------------------------------------------------------- determinism
def test_same_seed_is_byte_identical(tmp_path):
    outs = []
    for i in range(2):
        out = tmp_path / f"run{i}"
        gen = generate_data.DatasetGenerator(mode="lite", scale=0.05, seed=7, **SILENT)
        generate_data.write_dataset(gen.generate(), out, gen.parameters(), **SILENT)
        outs.append(out)
    assert _digests(outs[0]) == _digests(outs[1])

    m0 = json.loads((outs[0] / "manifest.json").read_text())
    m1 = json.loads((outs[1] / "manifest.json").read_text())
    m0.pop("generated_at")
    m1.pop("generated_at")
    assert m0 == m1


def test_different_seed_changes_output(tmp_path):
    digests = []
    for seed in (1, 2):
        out = tmp_path / f"seed{seed}"
        gen = generate_data.DatasetGenerator(mode="lite", scale=0.05, seed=seed, **SILENT)
        generate_data.write_dataset(gen.generate(), out, gen.parameters(), **SILENT)
        digests.append(_digests(out))
    assert digests[0] != digests[1]


def test_reference_date_fixes_all_timestamps(dataset):
    ref = generate_data.DEFAULT_REFERENCE_DATE
    for name, docs in dataset.items():
        for doc in docs:
            for key in ("created_at", "updated_at", "enrolled_at", "timestamp"):
                if key in doc:
                    assert isinstance(doc[key], datetime)
                    assert doc[key] <= ref, f"{name}.{key} is after the reference date"


# ------------------------------------------------------------- counts & scale
def test_targets_scale_with_mode_and_scale_factor():
    gen = generate_data.DatasetGenerator(mode="full", scale=0.1, **SILENT)
    assert gen.targets["users"] == 1000
    assert gen.targets["analytics_events"] == 10000
    tiny = generate_data.DatasetGenerator(mode="lite", scale=0.0001, **SILENT)
    assert min(tiny.targets.values()) == 1  # never zero


def test_enrollments_capped_by_available_pairs():
    gen = generate_data.DatasetGenerator(mode="lite", scale=0.01, **SILENT)  # 10 users x 1 course
    data = gen.generate()
    assert len(data["enrollments"]) == len(data["users"]) * len(data["courses"])


# ------------------------------------------------------- referential integrity
def test_referential_integrity(dataset):
    users = {u["_id"] for u in dataset["users"]}
    instructors = {i["_id"] for i in dataset["instructors"]}
    courses = {c["_id"] for c in dataset["courses"]}
    categories = {c["_id"] for c in dataset["categories"]}
    enrollments = {e["_id"] for e in dataset["enrollments"]}
    category_names = {c["name"] for c in dataset["categories"]}

    for c in dataset["courses"]:
        assert c["instructor_id"] in instructors
        assert c["category_id"] in categories
        assert c["category"] in category_names
    for e in dataset["enrollments"]:
        assert e["user_id"] in users and e["course_id"] in courses
    for r in dataset["reviews"]:
        assert r["user_id"] in users and r["course_id"] in courses
        assert r["enrollment_id"] in enrollments
    for ev in dataset["analytics_events"]:
        assert ev["user_id"] in users
        if "course_id" in ev:
            assert ev["course_id"] in courses
    for cat in dataset["categories"]:
        if "parent_id" in cat:
            assert cat["parent_id"] in categories


def test_unique_constraints_match_bootstrap_indexes(dataset):
    emails = [u["email"] for u in dataset["users"]]
    usernames = [u["username"] for u in dataset["users"]]
    assert len(set(emails)) == len(emails)
    assert len(set(usernames)) == len(usernames)
    pairs = [(e["user_id"], e["course_id"]) for e in dataset["enrollments"]]
    assert len(set(pairs)) == len(pairs)
    names = [c["name"] for c in dataset["categories"]]
    assert len(set(names)) == len(names)


def test_derived_counters_are_consistent(dataset):
    per_course = {}
    for e in dataset["enrollments"]:
        per_course[e["course_id"]] = per_course.get(e["course_id"], 0) + 1
    for c in dataset["courses"]:
        assert c["enrollment_count"] == per_course.get(c["_id"], 0)

    ratings = {}
    for r in dataset["reviews"]:
        ratings.setdefault(r["course_id"], []).append(r["rating"])
    for c in dataset["courses"]:
        expected = ratings.get(c["_id"], [])
        assert c["rating"]["count"] == len(expected)
        if expected:
            assert abs(c["rating"]["average"] - sum(expected) / len(expected)) < 0.01


# ------------------------------------------------- validator-facing invariants
def test_documents_satisfy_bootstrap_validator_types(dataset):
    """Type and enum expectations taken from docker/init/00_bootstrap.js."""
    for u in dataset["users"]:
        assert u["status"] in {"active", "inactive", "suspended"}
        assert u["preferences"]["difficulty_level"] in {"beginner", "intermediate", "advanced"}
        assert isinstance(u["preferences"]["email_notifications"], bool)
    for c in dataset["courses"]:
        assert 5 <= len(c["title"]) <= 200
        assert isinstance(c["instructor_id"], ObjectId)
        assert c["status"] in {"draft", "published", "archived"}
        assert isinstance(c["enrollment_count"], int)
        assert isinstance(c["rating"]["count"], int)
        assert len(c["currency"]) == 3
    for e in dataset["enrollments"]:
        assert isinstance(e["progress"]["completed_modules"], list)
        assert 0 <= e["progress"]["percentage"] <= 100
        assert e["completion_status"] in {"not_started", "in_progress", "completed", "dropped"}
        assert ("completion_date" in e) == (e["completion_status"] == "completed")
    for r in dataset["reviews"]:
        assert isinstance(r["rating"], int) and 1 <= r["rating"] <= 5
        assert len(r["title"]) <= 100
    for ev in dataset["analytics_events"]:
        assert ev["event_type"] in {t for t, _ in generate_data.EVENT_TYPE_WEIGHTS}
    for cat in dataset["categories"]:
        assert cat["status"] in {"active", "inactive"}
        assert isinstance(cat["level"], int)


def test_objectids_encode_document_time(dataset):
    for u in dataset["users"]:
        delta = abs((u["_id"].generation_time - u["created_at"]).total_seconds())
        assert delta < 1
    stamps = [e["_id"] for e in dataset["analytics_events"]]
    assert stamps == sorted(stamps), "events are emitted in _id (time) order"


# ------------------------------------------------------------- output format
def test_output_is_canonical_extended_json(written):
    out, _, _ = written
    first = json.loads((out / "courses.jsonl").read_text().splitlines()[0])
    assert "$oid" in first["_id"]
    assert "$oid" in first["instructor_id"]
    assert "$date" in first["created_at"]
    assert "$numberInt" in first["enrollment_count"]
    assert "$numberDouble" in first["price"] or "$numberInt" in first["price"]
    roundtrip = loads(json.dumps(first))
    assert isinstance(roundtrip["_id"], ObjectId)
    assert isinstance(roundtrip["created_at"], datetime)


def test_manifest_digests_and_counts_match_files(written):
    out, manifest, data = written
    for name, entry in manifest["collections"].items():
        path = out / entry["file"]
        assert hashlib.sha256(path.read_bytes()).hexdigest() == entry["sha256"]
        assert entry["records"] == len(data[name])
        assert sum(1 for _ in path.open()) == entry["records"]
    assert manifest["total_records"] == sum(len(v) for v in data.values())
    assert manifest["generator"]["version"] == generate_data.GENERATOR_VERSION

    checksum_lines = (out / "checksums.sha256").read_text().splitlines()
    assert len(checksum_lines) == len(manifest["collections"])
    for line in checksum_lines:
        digest, _, file_name = line.partition("  ")
        assert hashlib.sha256((out / file_name).read_bytes()).hexdigest() == digest


def test_cli_rejects_bad_arguments():
    import pytest

    with pytest.raises(ValueError):
        generate_data.DatasetGenerator(mode="huge", **SILENT)
    with pytest.raises(ValueError):
        generate_data.DatasetGenerator(scale=0, **SILENT)
