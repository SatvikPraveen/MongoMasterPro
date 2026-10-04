#!/usr/bin/env python3
"""MongoMasterPro reference dataset generator.

Produces the synthetic e-learning dataset that lives in the ``learning_platform``
database. The generator is *deterministic*: a given (seed, mode, scale,
reference date, generator version) tuple yields byte-identical output, so that
experiments can cite the exact dataset they ran against and anyone can
regenerate it.

Design points
-------------
* All randomness flows through one ``random.Random(seed)`` instance and a
  seeded ``Faker`` instance. ObjectIds and UUIDs are drawn from the same RNG
  rather than from the clock or the process id.
* Timestamps are expressed relative to a fixed *reference date* instead of
  ``now()``, so output does not drift from day to day.
* Documents are written as MongoDB Extended JSON v2 (canonical mode) in JSON
  Lines files. Canonical mode encodes every BSON type explicitly
  (``{"$oid": ...}``, ``{"$date": ...}``, ``{"$numberInt": ...}``), which is what
  the collection validators created by ``docker/init/00_bootstrap.js`` require.
  ``mongoimport`` reads this format natively; ``--import`` loads it through
  PyMongo with identical types.
* A ``manifest.json`` records the parameters, library versions, record counts
  and SHA-256 digests of every file, so a dataset can be verified with
  ``sha256sum -c checksums.sha256`` and cited precisely.

Usage
-----
    python generate_data.py --mode lite --seed 20251003
    python generate_data.py --mode full --scale 0.5 --out /tmp/ds
    python generate_data.py --mode lite --import mongodb://localhost:27017
"""

from __future__ import annotations

import argparse
import hashlib
import json
import platform
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence

from bson import ObjectId
from bson.json_util import CANONICAL_JSON_OPTIONS, RELAXED_JSON_OPTIONS, dumps
from faker import Faker

GENERATOR_VERSION = "2.0.0"
SCHEMA_VERSION = "1.0"
DEFAULT_SEED = 20251003
DEFAULT_REFERENCE_DATE = datetime(2025, 1, 1, tzinfo=timezone.utc)
DEFAULT_DATABASE = "learning_platform"

HERE = Path(__file__).resolve().parent
DEFAULT_OUT_DIR = HERE.parent / "generated"

# Target record counts per mode. ``--scale`` multiplies all of them.
MODES: Dict[str, Dict[str, int]] = {
    "lite": {
        "users": 1000,
        "instructors": 50,
        "courses": 100,
        "categories": 20,
        "enrollments": 5000,
        "reviews": 1500,
        "analytics_events": 10000,
    },
    "full": {
        "users": 10000,
        "instructors": 200,
        "courses": 1000,
        "categories": 50,
        "enrollments": 50000,
        "reviews": 15000,
        "analytics_events": 100000,
    },
}

# Order matters: later collections reference earlier ones.
COLLECTION_ORDER: Sequence[str] = (
    "categories",
    "users",
    "instructors",
    "courses",
    "enrollments",
    "reviews",
    "analytics_events",
)

# Event mix. The types mirror the ``analytics_events`` validator enum.
EVENT_TYPE_WEIGHTS: Sequence[tuple] = (
    ("login", 0.15),
    ("logout", 0.10),
    ("course_view", 0.30),
    ("enrollment", 0.10),
    ("completion", 0.08),
    ("quiz_attempt", 0.12),
    ("video_play", 0.10),
    ("download", 0.05),
)
COURSE_SCOPED_EVENTS = {
    "course_view",
    "enrollment",
    "completion",
    "quiz_attempt",
    "video_play",
    "download",
}
TIMED_EVENTS = {"course_view", "video_play", "quiz_attempt"}

DAY = 24 * 60 * 60
AVATAR_URL = "https://api.dicebear.com/7.x/avataaars/svg?seed={seed}"


def load_schemas(path: Optional[Path] = None) -> Dict[str, Any]:
    """Load the vocabulary file (categories, enums, module names)."""
    path = path or HERE / "schemas.json"
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


class DatasetGenerator:
    """Deterministic generator for the learning_platform reference dataset."""

    def __init__(
        self,
        mode: str = "lite",
        scale: float = 1.0,
        seed: int = DEFAULT_SEED,
        reference_date: datetime = DEFAULT_REFERENCE_DATE,
        schemas: Optional[Dict[str, Any]] = None,
        log=print,
    ) -> None:
        if mode not in MODES:
            raise ValueError(f"unknown mode {mode!r}; choose from {sorted(MODES)}")
        if scale <= 0:
            raise ValueError("scale must be positive")
        if reference_date.tzinfo is None:
            raise ValueError("reference_date must be timezone-aware")

        self.mode = mode
        self.scale = scale
        self.seed = seed
        self.reference_date = reference_date
        self.schemas = schemas or load_schemas()
        self.log = log

        self.rng = random.Random(seed)
        self.fake = Faker("en_US")
        self.fake.seed_instance(seed)

        self.targets = {
            name: max(1, int(round(count * scale))) for name, count in MODES[mode].items()
        }

    # ------------------------------------------------------------------ helpers
    def oid(self, at: Optional[datetime] = None) -> ObjectId:
        """ObjectId whose leading 4 bytes encode ``at`` (or the reference date).

        Real ObjectIds are timestamp-prefixed, which makes _id roughly insertion
        ordered; experiments on index locality depend on that property, so the
        synthetic ids reproduce it. The remaining 8 bytes come from the seeded RNG.
        """
        stamp = int((at or self.reference_date).timestamp())
        return ObjectId(stamp.to_bytes(4, "big") + self.rng.randbytes(8))

    def uuid4(self) -> str:
        return str(uuid.UUID(int=self.rng.getrandbits(128), version=4))

    def dt_between(self, days_back_max: float, days_back_min: float = 0.0) -> datetime:
        """Uniform timestamp in [reference - max, reference - min]."""
        seconds = self.rng.uniform(days_back_min * DAY, days_back_max * DAY)
        return self.reference_date - timedelta(seconds=seconds)

    def dt_after(self, start: datetime, days_max: float) -> datetime:
        """Uniform timestamp in [start, min(start + days_max, reference)]."""
        latest = min(start + timedelta(days=days_max), self.reference_date)
        span = max((latest - start).total_seconds(), 0.0)
        return start + timedelta(seconds=self.rng.uniform(0.0, span))

    def choice_weighted(self, population: Sequence[Any], weights: Sequence[float]) -> Any:
        return self.rng.choices(population, weights=weights, k=1)[0]

    @staticmethod
    def password_hash(rng: random.Random) -> str:
        # Shape of a bcrypt hash without being a real credential.
        alphabet = "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        salt_and_hash = "".join(rng.choice(alphabet) for _ in range(53))
        return f"$2b$10${salt_and_hash}"

    # --------------------------------------------------------------- generators
    def generate_categories(self) -> List[Dict[str, Any]]:
        n = self.targets["categories"]
        names: List[str] = self.schemas["categories"]
        main_count = max(1, min(len(names), (n + 1) // 2))
        categories: List[Dict[str, Any]] = []
        used = set()

        for name in names[:main_count]:
            used.add(name)
            created = self.dt_between(365, 30)
            categories.append(
                {
                    "_id": self.oid(created),
                    "name": name,
                    "description": f"Comprehensive courses and tutorials about {name}",
                    "level": 0,
                    "course_count": 0,
                    "status": "active",
                    "created_at": created,
                    "updated_at": self.dt_after(created, 30),
                }
            )

        parents = list(categories)
        while len(categories) < n:
            parent = self.rng.choice(parents)
            name = f"{parent['name']} - {self.fake.word().title()}"
            if name in used:
                continue
            used.add(name)
            created = self.dt_after(parent["created_at"], 180)
            categories.append(
                {
                    "_id": self.oid(created),
                    "name": name,
                    "description": (
                        f"Specialized {parent['name'].lower()} topics and advanced concepts"
                    ),
                    "parent_id": parent["_id"],
                    "level": 1,
                    "course_count": 0,
                    "status": "active" if self.rng.random() < 0.95 else "inactive",
                    "created_at": created,
                    "updated_at": self.dt_after(created, 30),
                }
            )
        return categories

    def _person(self, index: int, domain_pool: Sequence[str]) -> Dict[str, Any]:
        first = self.fake.first_name()
        last = self.fake.last_name()
        username = f"{self.fake.user_name()}_{index}"
        email = f"{first}.{last}.{index}@{self.rng.choice(domain_pool)}".lower()
        return {
            "first": first,
            "last": last,
            "username": username,
            "email": email,
        }

    def generate_users(self) -> List[Dict[str, Any]]:
        n = self.targets["users"]
        domains = ["example.com", "example.org", "example.net", "mail.example.edu"]
        languages = self.schemas["languages"]
        timezones = self.schemas["timezones"]
        levels = self.schemas["difficulty_levels"]
        statuses = self.schemas["user_statuses"]
        users: List[Dict[str, Any]] = []
        for i in range(n):
            p = self._person(i, domains)
            created = self.dt_between(730)
            users.append(
                {
                    "_id": self.oid(created),
                    "email": p["email"],
                    "username": p["username"],
                    "password_hash": self.password_hash(self.rng),
                    "profile": {
                        "first_name": p["first"],
                        "last_name": p["last"],
                        "bio": self.fake.text(max_nb_chars=200),
                        "avatar_url": AVATAR_URL.format(seed=p["username"]),
                        "social_links": [
                            f"https://linkedin.com/in/{p['username']}",
                            f"https://github.com/{p['username']}",
                        ],
                    },
                    "preferences": {
                        "language": self.rng.choice(languages),
                        "timezone": self.rng.choice(timezones),
                        "email_notifications": self.rng.random() < 0.6,
                        "difficulty_level": self.rng.choice(levels),
                    },
                    "status": self.choice_weighted(statuses, [0.85, 0.10, 0.05]),
                    "created_at": created,
                    "updated_at": self.dt_after(created, 400),
                }
            )
        return users

    def generate_instructors(self) -> List[Dict[str, Any]]:
        n = self.targets["instructors"]
        categories = self.schemas["categories"]
        timezones = self.schemas["timezones"]
        instructors: List[Dict[str, Any]] = []
        for i in range(n):
            p = self._person(i, ["faculty.example.edu", "instructors.example.com"])
            years = self.rng.randint(3, 20)
            created = self.dt_between(1095, 365)
            instructors.append(
                {
                    "_id": self.oid(created),
                    "email": p["email"],
                    "username": p["username"],
                    "password_hash": self.password_hash(self.rng),
                    "profile": {
                        "first_name": p["first"],
                        "last_name": p["last"],
                        "bio": (
                            f"{self.rng.choice(categories)} instructor "
                            f"with {years}+ years of experience"
                        ),
                        "avatar_url": AVATAR_URL.format(seed=p["username"]),
                        "social_links": [f"https://linkedin.com/in/{p['username']}"],
                        "certifications": [
                            f"Certified {self.rng.choice(categories)} Professional",
                        ],
                        "experience_years": years,
                        "specializations": self.rng.sample(categories, k=self.rng.randint(2, 4)),
                    },
                    "preferences": {
                        "language": "en",
                        "timezone": self.rng.choice(timezones),
                        "email_notifications": True,
                        "difficulty_level": "advanced",
                    },
                    # Filled in after courses/enrollments/reviews are generated.
                    "instructor_stats": {
                        "total_courses": 0,
                        "total_students": 0,
                        "average_rating": 0.0,
                        "total_revenue": 0.0,
                    },
                    "status": "active",
                    "created_at": created,
                    "updated_at": self.dt_after(created, 365),
                }
            )
        return instructors

    def generate_courses(
        self, instructors: List[Dict[str, Any]], categories: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        n = self.targets["courses"]
        levels = self.schemas["difficulty_levels"]
        statuses = self.schemas["course_statuses"]
        tags_pool = self.schemas["course_tags"]
        module_names = self.schemas["course_modules"]
        currencies = self.schemas.get("currencies", ["USD"])
        title_templates = [
            "Complete {c} Bootcamp",
            "Master {c} from Scratch",
            "Advanced {c} Techniques",
            "Professional {c} Development",
            "{c} for Beginners",
            "Modern {c} Best Practices",
            "Applied {c} Projects",
            "{c}: Theory and Practice",
        ]
        courses: List[Dict[str, Any]] = []
        for i in range(n):
            category = self.rng.choice(categories)
            instructor = self.rng.choice(instructors)
            level = self.rng.choice(levels)
            created = self.dt_between(540, 7)
            n_modules = self.rng.randint(5, 12)
            base_modules = module_names[level]
            modules = [
                f"Module {j + 1}: {base_modules[j % len(base_modules)]}" for j in range(n_modules)
            ]
            price = round(self.rng.uniform(19.99, 299.99), 2)
            courses.append(
                {
                    "_id": self.oid(created),
                    "title": self.rng.choice(title_templates).format(c=category["name"]),
                    "description": self.fake.text(max_nb_chars=800),
                    "instructor_id": instructor["_id"],
                    "category": category["name"],
                    "category_id": category["_id"],
                    "tags": sorted(self.rng.sample(tags_pool, k=self.rng.randint(3, 6))),
                    "difficulty_level": level,
                    "duration_hours": round(self.rng.uniform(5.0, 40.0), 1),
                    "price": price,
                    "currency": "USD" if self.rng.random() < 0.8 else self.rng.choice(currencies),
                    "content": {
                        "modules": modules,
                        "resources": [
                            "Video Lectures",
                            "Interactive Exercises",
                            "Code Examples",
                            "Reference Materials",
                        ],
                        "assignments": [
                            f"Project {j + 1}: {self.fake.sentence(nb_words=6)}"
                            for j in range(self.rng.randint(2, 5))
                        ],
                    },
                    "enrollment_count": 0,
                    "rating": {"average": 0.0, "count": 0},
                    "status": self.choice_weighted(statuses, [0.10, 0.85, 0.05]),
                    "created_at": created,
                    "updated_at": self.dt_after(created, 120),
                }
            )
        return courses

    def generate_enrollments(
        self, users: List[Dict[str, Any]], courses: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        max_pairs = len(users) * len(courses)
        n = min(self.targets["enrollments"], max_pairs)
        statuses = self.schemas["completion_statuses"]
        # Sample (user, course) pairs without replacement from the product space
        # so uniqueness is guaranteed in O(n) and deterministic.
        pair_indexes = self.rng.sample(range(max_pairs), k=n)
        enrollments: List[Dict[str, Any]] = []
        for idx in pair_indexes:
            user = users[idx // len(courses)]
            course = courses[idx % len(courses)]
            earliest = max(user["created_at"], course["created_at"])
            enrolled = self.dt_after(earliest, 365)
            status = self.choice_weighted(statuses, [0.10, 0.40, 0.30, 0.20])
            modules = course["content"]["modules"]
            if status == "not_started":
                pct = 0
            elif status == "in_progress":
                pct = self.rng.randint(5, 95)
            elif status == "completed":
                pct = 100
            else:
                pct = self.rng.randint(5, 60)
            completed_n = int(round(len(modules) * pct / 100.0))
            doc: Dict[str, Any] = {
                "_id": self.oid(enrolled),
                "user_id": user["_id"],
                "course_id": course["_id"],
                "progress": {
                    "percentage": pct,
                    "completed_modules": modules[:completed_n],
                    "current_module": modules[min(completed_n, len(modules) - 1)],
                    "last_accessed": self.dt_after(enrolled, 180),
                },
                "completion_status": status,
                "certificate_issued": status == "completed" and self.rng.random() < 0.7,
                "enrolled_at": enrolled,
                "updated_at": self.dt_after(enrolled, 180),
            }
            if status == "completed":
                doc["completion_date"] = self.dt_after(enrolled, 120)
            enrollments.append(doc)
        return enrollments

    def generate_reviews(self, enrollments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        eligible = [
            e for e in enrollments if e["completion_status"] in ("completed", "in_progress")
        ]
        n = min(self.targets["reviews"], len(eligible))
        reviews: List[Dict[str, Any]] = []
        for enrollment in self.rng.sample(eligible, k=n):
            if enrollment["completion_status"] == "completed":
                rating = self.choice_weighted([3, 4, 5], [0.10, 0.30, 0.60])
            else:
                rating = self.choice_weighted([2, 3, 4, 5], [0.10, 0.20, 0.40, 0.30])
            created = self.dt_after(enrollment["enrolled_at"], 200)
            reviews.append(
                {
                    "_id": self.oid(created),
                    "user_id": enrollment["user_id"],
                    "course_id": enrollment["course_id"],
                    "enrollment_id": enrollment["_id"],
                    "rating": rating,
                    "title": self.fake.sentence(nb_words=6)[:100],
                    "comment": self.fake.text(max_nb_chars=400),
                    "helpful_votes": self.rng.randint(0, 50),
                    "verified_purchase": True,
                    "created_at": created,
                    "updated_at": self.dt_after(created, 30),
                }
            )
        return reviews

    def generate_analytics_events(
        self, users: List[Dict[str, Any]], courses: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        n = self.targets["analytics_events"]
        types = [t for t, _ in EVENT_TYPE_WEIGHTS]
        weights = [w for _, w in EVENT_TYPE_WEIGHTS]
        events: List[Dict[str, Any]] = []
        for _ in range(n):
            user = self.rng.choice(users)
            event_type = self.choice_weighted(types, weights)
            props: Dict[str, Any] = {
                "user_agent": self.fake.user_agent(),
                "ip_address": self.fake.ipv4(),
            }
            if event_type in TIMED_EVENTS:
                props["duration_seconds"] = self.rng.randint(30, 3600)
            at = self.dt_between(90)
            doc: Dict[str, Any] = {
                "_id": self.oid(at),
                "user_id": user["_id"],
                "event_type": event_type,
                "session_id": self.uuid4(),
                "properties": props,
                "timestamp": at,
            }
            if event_type in COURSE_SCOPED_EVENTS:
                doc["course_id"] = self.rng.choice(courses)["_id"]
            events.append(doc)
        events.sort(key=lambda e: (e["timestamp"], str(e["_id"])))
        return events

    # ----------------------------------------------------------- derived fields
    @staticmethod
    def derive_aggregates(dataset: Dict[str, List[Dict[str, Any]]]) -> None:
        """Make denormalised counters consistent with the referencing documents."""
        courses_by_id = {c["_id"]: c for c in dataset["courses"]}
        categories_by_id = {c["_id"]: c for c in dataset["categories"]}
        instructors_by_id = {i["_id"]: i for i in dataset["instructors"]}

        for enrollment in dataset["enrollments"]:
            course = courses_by_id[enrollment["course_id"]]
            course["enrollment_count"] += 1

        rating_sum: Dict[ObjectId, List[float]] = {}
        for review in dataset["reviews"]:
            rating_sum.setdefault(review["course_id"], []).append(review["rating"])
        for course_id, ratings in rating_sum.items():
            course = courses_by_id[course_id]
            course["rating"] = {
                "average": round(sum(ratings) / len(ratings), 2),
                "count": len(ratings),
            }

        for course in dataset["courses"]:
            categories_by_id[course["category_id"]]["course_count"] += 1
            stats = instructors_by_id[course["instructor_id"]]["instructor_stats"]
            stats["total_courses"] += 1
            stats["total_students"] += course["enrollment_count"]
            stats["total_revenue"] = round(
                stats["total_revenue"] + course["enrollment_count"] * course["price"], 2
            )

        per_instructor: Dict[ObjectId, List[float]] = {}
        for course in dataset["courses"]:
            if course["rating"]["count"]:
                per_instructor.setdefault(course["instructor_id"], []).append(
                    course["rating"]["average"]
                )
        for instructor_id, averages in per_instructor.items():
            instructors_by_id[instructor_id]["instructor_stats"]["average_rating"] = round(
                sum(averages) / len(averages), 2
            )

    # ------------------------------------------------------------------ driver
    def generate(self) -> Dict[str, List[Dict[str, Any]]]:
        self.log(
            f"Generating '{self.mode}' dataset (scale={self.scale}, seed={self.seed}, "
            f"reference_date={self.reference_date.isoformat()})"
        )
        dataset: Dict[str, List[Dict[str, Any]]] = {}
        dataset["categories"] = self.generate_categories()
        dataset["users"] = self.generate_users()
        dataset["instructors"] = self.generate_instructors()
        dataset["courses"] = self.generate_courses(dataset["instructors"], dataset["categories"])
        dataset["enrollments"] = self.generate_enrollments(dataset["users"], dataset["courses"])
        dataset["reviews"] = self.generate_reviews(dataset["enrollments"])
        dataset["analytics_events"] = self.generate_analytics_events(
            dataset["users"], dataset["courses"]
        )
        self.derive_aggregates(dataset)
        for name in COLLECTION_ORDER:
            self.log(f"  {name:<17}{len(dataset[name]):>8}")
        return dataset

    def parameters(self) -> Dict[str, Any]:
        return {
            "mode": self.mode,
            "scale": self.scale,
            "seed": self.seed,
            "reference_date": self.reference_date.isoformat(),
            "targets": dict(self.targets),
        }


# ------------------------------------------------------------------- output
def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_dataset(
    dataset: Dict[str, List[Dict[str, Any]]],
    out_dir: Path,
    parameters: Dict[str, Any],
    json_mode: str = "canonical",
    log=print,
) -> Dict[str, Any]:
    """Write one JSON Lines file per collection plus manifest and checksum files."""
    import faker as faker_pkg
    import pymongo

    options = CANONICAL_JSON_OPTIONS if json_mode == "canonical" else RELAXED_JSON_OPTIONS
    out_dir.mkdir(parents=True, exist_ok=True)

    collections: Dict[str, Any] = {}
    checksum_lines: List[str] = []
    for name in COLLECTION_ORDER:
        file_name = f"{name}.jsonl"
        path = out_dir / file_name
        with open(path, "w", encoding="utf-8", newline="\n") as fh:
            for doc in dataset[name]:
                fh.write(dumps(doc, json_options=options))
                fh.write("\n")
        digest = sha256_of(path)
        collections[name] = {"file": file_name, "records": len(dataset[name]), "sha256": digest}
        checksum_lines.append(f"{digest}  {file_name}")
        log(f"  wrote {file_name} ({len(dataset[name])} records)")

    manifest = {
        "manifest_version": 1,
        "dataset": "mongomasterpro-learning-platform",
        "schema_version": SCHEMA_VERSION,
        "format": {"encoding": "extended-json-v2", "mode": json_mode, "layout": "json-lines"},
        "generator": {
            "name": "data/generators/generate_data.py",
            "version": GENERATOR_VERSION,
            "python": platform.python_version(),
            "faker": faker_pkg.VERSION,
            "pymongo": pymongo.version,
        },
        "parameters": parameters,
        "collections": collections,
        "total_records": sum(c["records"] for c in collections.values()),
        # Informational only; excluded from determinism comparisons.
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    with open(out_dir / "manifest.json", "w", encoding="utf-8", newline="\n") as fh:
        json.dump(manifest, fh, indent=2, sort_keys=True)
        fh.write("\n")
    with open(out_dir / "checksums.sha256", "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(checksum_lines) + "\n")
    log(f"  wrote manifest.json and checksums.sha256 to {out_dir}")
    return manifest


def import_dataset(
    dataset: Dict[str, List[Dict[str, Any]]],
    uri: str,
    database: str = DEFAULT_DATABASE,
    batch_size: int = 5000,
    log=print,
) -> Dict[str, int]:
    """Load the dataset into MongoDB with native BSON types.

    Existing documents are removed with delete_many() rather than drop() so the
    collection options (JSON Schema validators) created by the bootstrap survive.
    """
    from pymongo import MongoClient

    client = MongoClient(uri, serverSelectionTimeoutMS=10000)
    db = client[database]
    counts: Dict[str, int] = {}
    try:
        for name in COLLECTION_ORDER:
            docs = dataset[name]
            coll = db[name]
            coll.delete_many({})
            for start in range(0, len(docs), batch_size):
                coll.insert_many(docs[start : start + batch_size], ordered=False)
            counts[name] = coll.count_documents({})
            log(f"  imported {name:<17}{counts[name]:>8}")
        db["instructors"].create_index("email", unique=True, name="idx_instructors_email_unique")
        db["courses"].create_index("category_id", name="idx_courses_category_id")
    finally:
        client.close()
    return counts


def parse_args(argv: Optional[Iterable[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Deterministic generator for the MongoMasterPro learning_platform dataset.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--mode", choices=sorted(MODES), default="lite", help="base record counts")
    parser.add_argument("--scale", type=float, default=1.0, help="multiply every target count")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="RNG seed")
    parser.add_argument(
        "--reference-date",
        default=DEFAULT_REFERENCE_DATE.isoformat(),
        help="ISO-8601 instant that all timestamps are generated relative to",
    )
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT_DIR, help="output directory")
    parser.add_argument(
        "--json-mode",
        choices=["canonical", "relaxed"],
        default="canonical",
        help="Extended JSON flavour (canonical preserves exact BSON types)",
    )
    parser.add_argument(
        "--import", dest="import_uri", metavar="URI", help="also load into MongoDB at URI"
    )
    parser.add_argument("--database", default=DEFAULT_DATABASE, help="target database for --import")
    parser.add_argument(
        "--no-files", action="store_true", help="skip writing files (use with --import)"
    )
    parser.add_argument("--quiet", action="store_true", help="suppress progress output")
    return parser.parse_args(list(argv) if argv is not None else None)


def main(argv: Optional[Iterable[str]] = None) -> int:
    args = parse_args(argv)
    log = (lambda *a, **k: None) if args.quiet else print
    reference = datetime.fromisoformat(args.reference_date.replace("Z", "+00:00"))
    if reference.tzinfo is None:
        reference = reference.replace(tzinfo=timezone.utc)

    generator = DatasetGenerator(
        mode=args.mode, scale=args.scale, seed=args.seed, reference_date=reference, log=log
    )
    dataset = generator.generate()

    if not args.no_files:
        write_dataset(dataset, args.out, generator.parameters(), args.json_mode, log=log)
    if args.import_uri:
        log(f"Importing into {args.database} at {args.import_uri}")
        import_dataset(dataset, args.import_uri, args.database, log=log)
    log("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
