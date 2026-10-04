// experiments/lib/harness.js
// Measurement harness for MongoMasterPro experiments (runs inside mongosh).
//
// Responsibilities
//   * capture the environment (server build, storage engine, topology, host,
//     client versions, git commit, dataset manifest) so a result is citable;
//   * time operations with a monotonic high-resolution clock;
//   * run levels of an experimental factor in a blocked, randomised order so
//     that drift (cache warm-up, background checkpoints) is spread evenly over
//     the levels instead of biasing whichever ran last;
//   * compute descriptive statistics and a bootstrap confidence interval for
//     the median in the shell, and write raw per-trial samples so that the
//     Python analysis can do inferential statistics on the original data.
//
// Usage from a spec file:
//   if (typeof MMP === "undefined") load(`${process.env.MMP_ROOT || process.cwd()}/experiments/lib/harness.js`);
//   MMP.runExperiment({ id: "E01", ... });

/* global db, print, version */
(function initHarness(global) {
  if (global.MMP) return;

  const fs = require("fs");
  const path = require("path");
  const os = require("os");

  const nowMs = () => Number(process.hrtime.bigint()) / 1e6;

  // Small deterministic PRNG so level ordering and bootstrap resampling are reproducible.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffled(items, rand) {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------------------------------------------------------------- statistics
  function quantile(sorted, q) {
    if (sorted.length === 0) return NaN;
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }

  function describe(samples, rand) {
    const s = samples.slice().sort((a, b) => a - b);
    const n = s.length;
    const mean = s.reduce((x, y) => x + y, 0) / n;
    const variance = n > 1 ? s.reduce((acc, x) => acc + (x - mean) ** 2, 0) / (n - 1) : 0;
    const sd = Math.sqrt(variance);
    const median = quantile(s, 0.5);

    // Percentile bootstrap CI for the median (B = 1000).
    const B = 1000;
    const medians = new Array(B);
    for (let b = 0; b < B; b++) {
      const resample = new Array(n);
      for (let i = 0; i < n; i++) resample[i] = s[Math.floor(rand() * n)];
      resample.sort((a, b2) => a - b2);
      medians[b] = quantile(resample, 0.5);
    }
    medians.sort((a, b) => a - b);

    return {
      n,
      mean,
      sd,
      cv: mean !== 0 ? sd / mean : NaN,
      min: s[0],
      p25: quantile(s, 0.25),
      median,
      p75: quantile(s, 0.75),
      p90: quantile(s, 0.9),
      p95: quantile(s, 0.95),
      p99: quantile(s, 0.99),
      max: s[n - 1],
      median_ci95: [quantile(medians, 0.025), quantile(medians, 0.975)],
    };
  }

  // -------------------------------------------------------------- environment
  function safe(fn, fallback = null) {
    try {
      return fn();
    } catch (e) {
      return fallback;
    }
  }

  function gitCommit(root) {
    if (process.env.MMP_GIT_SHA) return process.env.MMP_GIT_SHA;
    return safe(() => {
      const head = fs.readFileSync(path.join(root, ".git", "HEAD"), "utf8").trim();
      if (!head.startsWith("ref:")) return head;
      return fs.readFileSync(path.join(root, ".git", head.slice(5)), "utf8").trim();
    });
  }

  function readManifest(root) {
    const p = process.env.MMP_MANIFEST || path.join(root, "data", "generated", "manifest.json");
    return safe(() => {
      const m = JSON.parse(fs.readFileSync(p, "utf8"));
      return {
        path: p,
        generator_version: m.generator && m.generator.version,
        parameters: m.parameters,
        total_records: m.total_records,
        digests: Object.fromEntries(
          Object.entries(m.collections || {}).map(([k, v]) => [k, v.sha256])
        ),
      };
    });
  }

  function captureEnvironment(root) {
    const admin = db.getSiblingDB("admin");
    const build = safe(() => admin.runCommand({ buildInfo: 1 }), {});
    const status = safe(() => admin.runCommand({ serverStatus: 1 }), {});
    const hostInfo = safe(() => admin.runCommand({ hostInfo: 1 }), {});
    const cmdLine = safe(() => admin.runCommand({ getCmdLineOpts: 1 }), {});
    const hello = safe(() => db.hello(), {});
    const wt = (status.wiredTiger && status.wiredTiger.cache) || {};
    // serverStatus reports WiredTiger counters as NumberLong-like objects in
    // some shell versions; normalise to a plain number or null.
    const asNumber = (v) => {
      if (v === undefined || v === null) return null;
      const n = typeof v === "object" && typeof v.toNumber === "function" ? v.toNumber() : Number(v);
      return Number.isFinite(n) ? n : null;
    };

    return {
      captured_at: new Date().toISOString(),
      server: {
        version: build.version,
        git_version: build.gitVersion,
        modules: build.modules,
        allocator: build.allocator,
        storage_engine: status.storageEngine && status.storageEngine.name,
        wiredtiger_cache_max_bytes: asNumber(wt["maximum bytes configured"]),
        journal_enabled: cmdLine.parsed && cmdLine.parsed.storage && cmdLine.parsed.storage.journal
          ? cmdLine.parsed.storage.journal.enabled
          : true,
        uptime_s: asNumber(status.uptime),
        connections_current: asNumber(status.connections && status.connections.current),
        parsed_options: cmdLine.parsed,
      },
      topology: {
        kind: hello.msg === "isdbgrid" ? "sharded" : hello.setName ? "replica_set" : "standalone",
        set_name: hello.setName,
        members: hello.hosts ? hello.hosts.length : hello.setName ? 1 : 0,
        is_writable_primary: hello.isWritablePrimary,
      },
      server_host: {
        hostname: hostInfo.system && hostInfo.system.hostname,
        os: hostInfo.os && `${hostInfo.os.name} ${hostInfo.os.version}`,
        cpu_arch: hostInfo.system && hostInfo.system.cpuArch,
        cpu_cores: asNumber(hostInfo.system && hostInfo.system.numCores),
        mem_mb: asNumber(hostInfo.system && hostInfo.system.memSizeMB),
        numa: hostInfo.system && hostInfo.system.numaEnabled,
      },
      client_host: {
        hostname: os.hostname(),
        platform: `${os.platform()} ${os.release()}`,
        cpu_model: os.cpus()[0] && os.cpus()[0].model,
        cpu_count: os.cpus().length,
        mem_mb: Math.round(os.totalmem() / 1048576),
        mongosh: safe(() => version()),
        node: process.version,
      },
      repository: {
        git_commit: gitCommit(root),
        root,
      },
      dataset: readManifest(root),
    };
  }

  // ---------------------------------------------------------------- execution
  function fmt(x, d = 2) {
    return typeof x === "number" && Number.isFinite(x) ? x.toFixed(d) : String(x);
  }

  function printTable(levels, unit) {
    const w = Math.max(10, ...levels.map((l) => l.name.length));
    print(
      `  ${"level".padEnd(w)}  ${"n".padStart(4)}  ${"median".padStart(10)}  ${"ci95_lo".padStart(10)}  ${"ci95_hi".padStart(10)}  ${"p95".padStart(10)}  ${"mean".padStart(10)}  ${"cv".padStart(6)}`
    );
    levels.forEach((l) => {
      const s = l.stats;
      print(
        `  ${l.name.padEnd(w)}  ${String(s.n).padStart(4)}  ${fmt(s.median).padStart(10)}  ${fmt(s.median_ci95[0]).padStart(10)}  ${fmt(s.median_ci95[1]).padStart(10)}  ${fmt(s.p95).padStart(10)}  ${fmt(s.mean).padStart(10)}  ${fmt(s.cv, 3).padStart(6)}`
      );
    });
    print(`  (${unit})`);
  }

  /**
   * Run an experiment definition.
   *
   * def = {
   *   id, title, hypothesis,
   *   design: { independent, dependent, unit, controlled: [], notes },
   *   trials (default 30), warmup (default 5), seed (default 1),
   *   setup(ctx), teardown(ctx),
   *   levels: [{ name, params, prepare(ctx), op(ctx) -> any, probe(ctx) -> object, cleanup(ctx) }]
   * }
   * op() is timed. If it returns a number and def.design.measure === "returned",
   * that number is recorded instead of the elapsed time (e.g. docs/sec).
   */
  function runExperiment(def) {
    const root = process.env.MMP_ROOT || process.cwd();
    const trials = Number(process.env.MMP_TRIALS || def.trials || 30);
    const warmup = Number(process.env.MMP_WARMUP || def.warmup || 5);
    const seed = Number(process.env.MMP_SEED || def.seed || 1);
    const rand = mulberry32(seed);
    const startedAt = new Date();
    const t0 = nowMs();

    print("\n" + "=".repeat(78));
    print(`${def.id}  ${def.title}`);
    print("=".repeat(78));
    print(`Hypothesis: ${def.hypothesis}`);
    print(`Design: ${def.design.independent} → ${def.design.dependent} (${def.design.unit}); ` +
      `${def.levels.length} levels × ${trials} trials, ${warmup} warm-up each, blocked-randomised order, seed ${seed}`);

    const ctx = { db, rand, trials, warmup, root, scratch: db.getSiblingDB("mmp_experiments") };
    if (def.setup) def.setup(ctx);

    const levels = def.levels.map((l) => ({ ...l, probeFn: l.probe, probe: null, samples: [] }));
    levels.forEach((l) => {
      if (l.prepare) l.prepare(ctx);
      for (let i = 0; i < warmup; i++) l.op(ctx);
    });

    const measureReturned = def.design.measure === "returned";
    for (let block = 0; block < trials; block++) {
      shuffled(levels, rand).forEach((l) => {
        const s = nowMs();
        const r = l.op(ctx);
        const elapsed = nowMs() - s;
        l.samples.push(measureReturned ? Number(r) : elapsed);
      });
    }

    levels.forEach((l) => {
      if (l.probeFn) l.probe = safe(() => l.probeFn(ctx));
      l.stats = describe(l.samples, rand);
      if (l.cleanup) safe(() => l.cleanup(ctx));
    });
    if (def.teardown) safe(() => def.teardown(ctx));

    const result = {
      schema: "mmp-experiment-result/1",
      experiment: {
        id: def.id,
        title: def.title,
        hypothesis: def.hypothesis,
        design: def.design,
      },
      parameters: { trials, warmup, seed, order: "blocked-randomised" },
      environment: captureEnvironment(root),
      levels: levels.map((l) => ({
        name: l.name,
        params: l.params || {},
        probe: l.probe,
        stats: l.stats,
        samples: l.samples,
      })),
      started_at: startedAt.toISOString(),
      finished_at: new Date().toISOString(),
      duration_s: (nowMs() - t0) / 1000,
    };

    print("\nResults:");
    printTable(result.levels, def.design.unit);

    const outDir = process.env.MMP_RESULTS_DIR || path.join(root, "experiments", "results", "raw");
    const dir = path.join(outDir, def.id);
    fs.mkdirSync(dir, { recursive: true });
    const stamp = startedAt.toISOString().replace(/[:.]/g, "-");
    const tag = (result.environment.server.version || "unknown").replace(/[^0-9.]/g, "");
    const file = path.join(dir, `${stamp}_mongodb-${tag}.json`);
    fs.writeFileSync(file, JSON.stringify(result, null, 2));
    print(`\nSaved ${path.relative(root, file)}  (${fmt(result.duration_s, 1)} s)`);
    return result;
  }

  // BSON size of a document. mongosh does not expose the legacy Object.bsonsize();
  // prefer the bundled BSON library and fall back to a JSON length estimate.
  function bsonSize(doc) {
    try {
      if (typeof bsonsize === "function") return bsonsize(doc); // mongosh global helper
      if (typeof BSON !== "undefined" && BSON.calculateObjectSize) return BSON.calculateObjectSize(doc);
    } catch (e) {
      /* fall through */
    }
    try {
      return require("bson").calculateObjectSize(doc);
    } catch (e) {
      return JSON.stringify(doc).length;
    }
  }

  global.MMP = { runExperiment, describe, captureEnvironment, nowMs, mulberry32, bsonSize };
})(globalThis);
