# Security Policy

## Scope

MongoMasterPro is a local learning and experimentation environment. Nothing in
this repository is intended to be exposed to a network you do not control.

## Credentials in this repository

The Docker Compose files, `config/env.example` and the bootstrap scripts
contain **well-known default credentials** (`admin / mongomaster123`,
`app_user / app_secure_pass`, `mmpApp / mmpApp2024!`, Mongo Express
`admin / express123`) and a committed replica-set key file
(`config/replica.key`). They exist so that a fresh checkout works without
configuration. Treat them as public:

* never reuse them outside a throw-away local environment;
* if you adapt the compose files for anything shared, generate a new key file
  (`openssl rand -base64 756 > config/replica.key`) and set the `MONGO_*`
  variables from a `.env` file that is not committed.

The dataset generator produces random strings shaped like bcrypt hashes; they
are not hashes of any password.

## Reporting a vulnerability

If you find a problem that could affect users of this repository (for example
a script that would act destructively against a non-lab database, or a supply
chain issue in a pinned dependency), open a GitHub issue using the
"Security" template, or email the maintainer listed in `CITATION.cff` if the
issue should not be public. Expect an acknowledgement within a week.

## Automated checks

* `gitleaks` runs on every push and pull request.
* `detect-secrets` runs as a pre-commit hook (`.pre-commit-config.yaml`).
* Dependabot opens monthly update PRs for GitHub Actions, npm, pip and Docker.
