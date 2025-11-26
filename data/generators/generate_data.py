#!/usr/bin/env python3
# Location: `/data/generators/generate_data.py`
# Unified data generator for MongoMasterPro with lite/full modes

import argparse
import hashlib
import json
import os
import random
import uuid
from datetime import datetime

from bson.objectid import ObjectId
from faker import Faker

fake = Faker()


class MongoDataGenerator:
    def __init__(self, mode='lite'):
        self.mode = mode
        self.schemas = self.load_schemas()

        # Data volume configuration
        if mode == 'lite':
            self.config = {
                'users': 1000,
                'instructors': 50,
                'courses': 100,
                'categories': 20,
                'enrollments': 5000,
                'reviews': 1500,
                'analytics_events': 10000
            }
        else:  # full mode
            self.config = {
                'users': 10000,
                'instructors': 200,
                'courses': 1000,
                'categories': 50,
                'enrollments': 50000,
                'reviews': 15000,
                'analytics_events': 100000
            }

        print(f"🎯 Initializing MongoMasterPro Data Generator ({mode} mode)")
        print(f"📊 Target volumes: {self.config}")

    def load_schemas(self):
        """Load data schemas and constraints"""
        try:
            with open('schemas.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print("⚠️ schemas.json not found, using default schemas")
            return self.get_default_schemas()

    def get_default_schemas(self):
        """Default schemas if file not found"""
        return {
            "categories": [
                "Programming", "Data Science", "Web Development", "Database",
                "DevOps", "Machine Learning", "Cybersecurity", "Mobile Development",
                "Cloud Computing", "Blockchain", "Game Development", "UI/UX Design"
            ],
            "difficulty_levels": ["beginner", "intermediate", "advanced"],
            "course_statuses": ["draft", "published", "archived"],
            "user_statuses": ["active", "inactive", "suspended"],
            "completion_statuses": [
                "not_started", "in_progress", "completed", "dropped"
            ],
            "event_types": [
                "login", "logout", "course_view", "enrollment",
                "completion", "quiz_attempt"
            ]
        }

    def generate_object_id(self):
        """Generate MongoDB ObjectId as string"""
        return str(ObjectId())

    def hash_password(self, password):
        """Generate bcrypt-style password hash"""
        return f"$2b$10${hashlib.sha256(password.encode()).hexdigest()[:53]}"

    def generate_users(self):
        """Generate user data"""
        print(f"👥 Generating {self.config['users']} users...")
        users = []

        for i in range(self.config['users']):
            profile = fake.profile()
            user = {
                "_id": self.generate_object_id(),
                "email": profile['mail'],
                "username": profile['username'],
                "password_hash": self.hash_password("password123"),
                "profile": {
                    "first_name": profile['name'].split()[0],
                    "last_name": profile['name'].split()[-1],
                    "bio": fake.text(max_nb_chars=200),
                    "avatar_url": (
                        f"https://api.dicebear.com/7.x/avataaars/svg?"
                        f"seed={profile['username']}"
                    ),
                    "social_links": [
                        f"https://linkedin.com/in/{profile['username']}",
                        f"https://github.com/{profile['username']}"
                    ]
                },
                "preferences": {
                    "language": random.choice(["en", "es", "fr", "de", "ja"]),
                    "timezone": str(fake.timezone()),
                    "email_notifications": random.choice([True, False]),
                    "difficulty_level": random.choice(self.schemas['difficulty_levels'])
                },
                "status": random.choices(
                    self.schemas['user_statuses'],
                    weights=[0.85, 0.1, 0.05]
                )[0],
                "created_at": fake.date_time_between(start_date='-2y', end_date='now'),
                "updated_at": fake.date_time_between(start_date='-30d', end_date='now')
            }
            users.append(user)

        return users

    def generate_instructors(self):
        """Generate instructor subset from users"""
        print(f"👨‍🏫 Generating {self.config['instructors']} instructors...")
        instructors = []

        for i in range(self.config['instructors']):
            instructor = {
                "_id": self.generate_object_id(),
                "email": fake.email(),
                "username": fake.user_name(),
                "password_hash": self.hash_password("instructor123"),
                "profile": {
                    "first_name": fake.first_name(),
                    "last_name": fake.last_name(),
                    "bio": (
                        f"Expert {random.choice(self.schemas['categories'])} instructor "
                        f"with {random.randint(3, 15)}+ years experience"
                    ),
                    "avatar_url": (
                        f"https://api.dicebear.com/7.x/avataaars/svg?"
                        f"seed={fake.user_name()}"
                    ),
                    "social_links": [
                        f"https://linkedin.com/in/{fake.user_name()}",
                        f"https://github.com/{fake.user_name()}"
                    ],
                    "certifications": [
                        (
                            f"Certified "
                            f"{random.choice(self.schemas['categories'])} Professional"
                        ),
                        (
                            f"Advanced {random.choice(self.schemas['categories'])} "
                            f"Specialist"
                        )
                    ],
                    "experience_years": random.randint(3, 15),
                    "specializations": (
                        random.sample(
                            self.schemas['categories'],
                            k=random.randint(2, 4)
                        )
                    )
                },
                "preferences": {
                    "language": "en",
                    "timezone": str(fake.timezone()),
                    "email_notifications": True,
                    "difficulty_level": "advanced"
                },
                "instructor_stats": {
                    "total_courses": 0,
                    "total_students": 0,
                    "average_rating": 0.0,
                    "total_revenue": 0.0
                },
                "status": "active",
                "created_at": fake.date_time_between(start_date='-3y', end_date='-1y'),
                "updated_at": fake.date_time_between(start_date='-7d', end_date='now')
            }
            instructors.append(instructor)

        return instructors

    def generate_categories(self):
        """Generate category hierarchy"""
        print(f"📁 Generating {self.config['categories']} categories...")
        categories = []

        # Main categories
        main_categories = self.schemas['categories'][:self.config['categories']//2]

        for cat in main_categories:
            category = {
                "_id": self.generate_object_id(),
                "name": cat,
                "description": f"Comprehensive courses and tutorials about {cat}",
                "parent_id": None,
                "level": 0,
                "course_count": 0,
                "status": "active",
                "created_at": (
                    fake.date_time_between(start_date='-1y', end_date='now')
                ),
                "updated_at": (
                    fake.date_time_between(start_date='-30d', end_date='now')
                )
            }
            categories.append(category)

        # Subcategories
        for i in range(self.config['categories'] - len(main_categories)):
            parent = random.choice(categories)
            subcategory = {
                "_id": self.generate_object_id(),
                "name": f"{parent['name']} - {fake.word().title()}",
                "description": (
                    f"Specialized {parent['name'].lower()} topics and "
                    f"advanced concepts"
                ),
                "parent_id": parent['_id'],
                "level": 1,
                "course_count": 0,
                "status": "active",
                "created_at": (
                    fake.date_time_between(start_date='-6m', end_date='now')
                ),
                "updated_at": (
                    fake.date_time_between(start_date='-30d', end_date='now')
                )
            }
            categories.append(subcategory)

        return categories

    def generate_courses(self, instructors, categories):
        """Generate course catalog"""
        print(f"📚 Generating {self.config['courses']} courses...")
        courses = []

        for i in range(self.config['courses']):
            category = random.choice(categories)
            instructor = random.choice(instructors)

            course_titles = [
                f"Complete {category['name']} Bootcamp",
                f"Master {category['name']} from Scratch",
                f"Advanced {category['name']} Techniques",
                f"Professional {category['name']} Development",
                f"{category['name']} for Beginners",
                f"Modern {category['name']} Best Practices"
            ]

            course = {
                "_id": self.generate_object_id(),
                "title": random.choice(course_titles),
                "description": fake.text(max_nb_chars=800),
                "instructor_id": instructor['_id'],
                "category": category['name'],
                "tags": random.sample([
                    category['name'].lower(), "tutorial", "hands-on",
                    "project-based", "beginner-friendly", "advanced",
                    "certification", "practical"
                ], k=random.randint(3, 6)),
                "difficulty_level": (
                    random.choice(self.schemas['difficulty_levels'])
                ),
                "duration_hours": round(random.uniform(5.0, 40.0), 1),
                "price": round(random.uniform(29.99, 299.99), 2),
                "currency": "USD",
                "content": {
                    "modules": [
                        f"Module {j+1}: {fake.sentence(nb_words=4)}"
                        for j in range(random.randint(5, 12))
                    ],
                    "resources": [
                        "Video Lectures", "Interactive Exercises", "Code Examples",
                        "Reference Materials", "Community Access"
                    ],
                    "assignments": [
                        f"Project {j+1}: {fake.sentence(nb_words=6)}"
                        for j in range(random.randint(2, 5))
                    ]
                },
                "enrollment_count": 0,
                "rating": {
                    "average": 0.0,
                    "count": 0
                },
                "status": random.choices(
                    self.schemas['course_statuses'],
                    weights=[0.1, 0.85, 0.05]
                )[0],
                "created_at": (
                    fake.date_time_between(start_date='-1y', end_date='now')
                ),
                "updated_at": (
                    fake.date_time_between(start_date='-30d', end_date='now')
                )
            }
            courses.append(course)

        return courses

    def generate_enrollments(self, users, courses):
        """Generate enrollment data"""
        print(f"📝 Generating {self.config['enrollments']} enrollments...")
        enrollments = []
        used_combinations = set()

        for i in range(self.config['enrollments']):
            while True:
                user = random.choice(users)
                course = random.choice(courses)
                combo = (user['_id'], course['_id'])
                if combo not in used_combinations:
                    used_combinations.add(combo)
                    break

            enrolled_date = fake.date_time_between(start_date='-6m', end_date='now')
            completion_status = random.choices(
                self.schemas['completion_statuses'],
                weights=[0.1, 0.4, 0.3, 0.2]
            )[0]

            progress_percentage = 0
            if completion_status == "in_progress":
                progress_percentage = random.randint(10, 90)
            elif completion_status == "completed":
                progress_percentage = 100
            elif completion_status == "dropped":
                progress_percentage = random.randint(5, 50)

            enrollment = {
                "_id": self.generate_object_id(),
                "user_id": user['_id'],
                "course_id": course['_id'],
                "progress": {
                    "percentage": progress_percentage,
                    "completed_modules": (
                        random.randint(0, progress_percentage // 10)
                    ),
                    "current_module": f"Module {random.randint(1, 8)}",
                    "last_accessed": (
                        fake.date_time_between(
                            start_date=enrolled_date,
                            end_date='now'
                        )
                    )
                },
                "completion_status": completion_status,
                "completion_date": (
                    fake.date_time_between(
                        start_date=enrolled_date,
                        end_date='now'
                    ) if completion_status == "completed" else None
                ),
                "certificate_issued": (
                    completion_status == "completed" and
                    random.choice([True, False])
                ),
                "enrolled_at": enrolled_date,
                "updated_at": (
                    fake.date_time_between(
                        start_date=enrolled_date,
                        end_date='now'
                    )
                )
            }
            enrollments.append(enrollment)

        return enrollments

    def generate_reviews(self, enrollments):
        """Generate course reviews"""
        print(f"⭐ Generating {self.config['reviews']} reviews...")
        reviews = []

        # Only create reviews for completed or in-progress enrollments
        eligible_enrollments = [
            e for e in enrollments
            if e['completion_status'] in ['completed', 'in_progress']
        ]

        for i in range(
            min(self.config['reviews'], len(eligible_enrollments))
        ):
            enrollment = random.choice(eligible_enrollments)

            # Higher ratings for completed courses
            if enrollment['completion_status'] == 'completed':
                rating = (
                    random.choices([3, 4, 5], weights=[0.1, 0.3, 0.6])[0]
                )
            else:
                rating = (
                    random.choices(
                        [2, 3, 4, 5],
                        weights=[0.1, 0.2, 0.4, 0.3]
                    )[0]
                )

            review = {
                "_id": self.generate_object_id(),
                "user_id": enrollment['user_id'],
                "course_id": enrollment['course_id'],
                "rating": rating,
                "title": fake.sentence(nb_words=6),
                "comment": fake.text(max_nb_chars=400),
                "helpful_votes": random.randint(0, 50),
                "verified_purchase": True,
                "created_at": (
                    fake.date_time_between(
                        start_date=enrollment['enrolled_at'],
                        end_date='now'
                    )
                ),
                "updated_at": (
                    fake.date_time_between(start_date='-7d', end_date='now')
                )
            }
            reviews.append(review)

        return reviews

    def generate_analytics_events(self, users, courses):
        """Generate analytics tracking events"""
        print(f"📊 Generating {self.config['analytics_events']} analytics events...")
        events = []

        for i in range(self.config['analytics_events']):
            user = random.choice(users)
            event_type = random.choices(
                self.schemas['event_types'],
                weights=[0.2, 0.15, 0.3, 0.1, 0.05, 0.2]
            )[0]

            event = {
                "_id": self.generate_object_id(),
                "user_id": user['_id'],
                "event_type": event_type,
                "course_id": (
                    random.choice(courses)['_id']
                    if event_type in [
                        'course_view', 'enrollment', 'completion'
                    ]
                    else None
                ),
                "session_id": str(uuid.uuid4()),
                "properties": {
                    "user_agent": fake.user_agent(),
                    "ip_address": fake.ipv4(),
                    "duration_seconds": (
                        random.randint(30, 3600)
                        if event_type in ['course_view', 'video_play']
                        else None
                    )
                },
                "timestamp": (
                    fake.date_time_between(start_date='-3m', end_date='now')
                )
            }
            events.append(event)

        return events

    def save_data(self, data, filename):
        """Save generated data to JSON file"""
        # Get the directory where the script is running from
        script_dir = os.path.dirname(os.path.abspath(__file__))
        generated_dir = os.path.join(
            os.path.dirname(script_dir),
            'generated'
        )

        # Ensure generated directory exists
        os.makedirs(generated_dir, exist_ok=True)
        output_file = os.path.join(generated_dir, filename)

        # Convert datetime objects to ISO format
        def json_serializer(obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            raise TypeError(
                f"Object of type {type(obj)} is not JSON serializable"
            )

        with open(output_file, 'w') as f:
            json.dump(
                data,
                f,
                indent=2,
                default=json_serializer
            )

        print(f"✅ Saved {len(data)} records to {output_file}")

    def generate_all(self):
        """Generate complete dataset"""
        print("🚀 Starting complete data generation...")

        # Generate in dependency order
        categories = self.generate_categories()
        self.save_data(categories, "categories.json")

        users = self.generate_users()
        self.save_data(users, "users.json")

        instructors = self.generate_instructors()
        self.save_data(instructors, "instructors.json")

        courses = self.generate_courses(instructors, categories)
        self.save_data(courses, "courses.json")

        enrollments = self.generate_enrollments(users, courses)
        self.save_data(enrollments, "enrollments.json")

        reviews = self.generate_reviews(enrollments)
        self.save_data(reviews, "reviews.json")

        analytics_events = self.generate_analytics_events(users, courses)
        self.save_data(analytics_events, "analytics_events.json")

        print(f"🎉 Data generation complete! Generated {self.mode} dataset.")
        print("📁 Files saved to: ../generated/")

        # Generate summary report
        summary = {
            "generation_mode": self.mode,
            "generated_at": datetime.now().isoformat(),
            "collections": {
                "categories": len(categories),
                "users": len(users),
                "instructors": len(instructors),
                "courses": len(courses),
                "enrollments": len(enrollments),
                "reviews": len(reviews),
                "analytics_events": len(analytics_events)
            },
            "total_records": sum([
                len(categories), len(users), len(instructors),
                len(courses), len(enrollments), len(reviews), len(analytics_events)
            ])
        }

        self.save_data([summary], "generation_summary.json")
        print("📋 Generation summary saved to ../generated/"
              "generation_summary.json")


def main():
    parser = argparse.ArgumentParser(
        description='MongoDB data generator for MongoMasterPro'
    )
    parser.add_argument(
        '--mode',
        choices=['lite', 'full'],
        default='lite',
        help='Generation mode: lite (5K records) or full (50K+ records)'
    )
    parser.add_argument(
        '--collection',
        choices=[
            'users', 'instructors', 'courses', 'categories',
            'enrollments', 'reviews', 'analytics_events', 'all'
        ],
        default='all',
        help='Generate specific collection or all'
    )

    args = parser.parse_args()

    generator = MongoDataGenerator(mode=args.mode)

    if args.collection == 'all':
        generator.generate_all()
    else:
        print(f"Generating {args.collection} in {args.mode} mode...")
        # Individual collection generation logic would go here
        generator.generate_all()  # For now, generate all


if __name__ == "__main__":
    main()
