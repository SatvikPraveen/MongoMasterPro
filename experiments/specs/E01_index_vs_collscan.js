// E01 — Index scan versus collection scan for point and range predicates.
//
// Uses the analytics_events collection of the reference dataset. The same two
// predicates are executed with the planner free to use the bootstrap indexes
// and with hint({$natural: 1}) forcing a collection scan. docsExamined from
// explain() is recorded as a probe so latency can be related to work done.
if (typeof MMP === "undefined") load(`${process.env.MMP_ROOT || process.cwd()}/experiments/lib/harness.js`);

const ref = db.getSiblingDB("learning_platform");

function pick(ctx) {
  // Deterministic choice of a user with events and a 7-day window.
  const user = ref.analytics_events.findOne({}, { user_id: 1 }, { sort: { _id: 1 } }).user_id;
  const latest = ref.analytics_events.find().sort({ timestamp: -1 }).limit(1).next().timestamp;
  const from = new Date(latest.getTime() - 7 * 24 * 3600 * 1000);
  return { user, from, latest };
}

MMP.runExperiment({
  id: "E01",
  title: "Index scan vs collection scan on analytics_events",
  hypothesis:
    "For selective predicates an IXSCAN examines orders of magnitude fewer documents than a COLLSCAN and is correspondingly faster; the advantage shrinks as the predicate matches a larger share of the collection.",
  design: {
    independent: "access path × predicate (user_id equality; timestamp 7-day range)",
    dependent: "query latency",
    unit: "ms",
    controlled: ["dataset (manifest)", "same predicates for all levels", "cursor fully drained", "single client, no concurrency"],
    notes: "Access paths are forced with hint() in every level so the comparison is between plans, not between planner decisions; the probe records what each plan examined.",
  },
  trials: 30,
  warmup: 5,
  setup(ctx) {
    ctx.p = pick(ctx);
    ctx.total = ref.analytics_events.estimatedDocumentCount();
  },
  levels: [
    {
      name: "point_collscan",
      params: { predicate: "user_id = <u>", path: "COLLSCAN" },
      op: (ctx) => ref.analytics_events.find({ user_id: ctx.p.user }).hint({ $natural: 1 }).toArray().length,
      probe: (ctx) => {
        const e = ref.analytics_events.find({ user_id: ctx.p.user }).hint({ $natural: 1 }).explain("executionStats").executionStats;
        return { nReturned: e.nReturned, docsExamined: e.totalDocsExamined, keysExamined: e.totalKeysExamined, collection_size: ctx.total };
      },
    },
    {
      name: "point_ixscan",
      params: { predicate: "user_id = <u>", path: "IXSCAN idx_analytics_user_time (hinted)" },
      op: (ctx) => ref.analytics_events.find({ user_id: ctx.p.user }).hint("idx_analytics_user_time").toArray().length,
      probe: (ctx) => {
        const e = ref.analytics_events.find({ user_id: ctx.p.user }).hint("idx_analytics_user_time").explain("executionStats").executionStats;
        return { nReturned: e.nReturned, docsExamined: e.totalDocsExamined, keysExamined: e.totalKeysExamined, collection_size: ctx.total };
      },
    },
    {
      name: "range7d_collscan",
      params: { predicate: "timestamp in last 7 days", path: "COLLSCAN" },
      op: (ctx) => ref.analytics_events.find({ timestamp: { $gte: ctx.p.from, $lte: ctx.p.latest } }).hint({ $natural: 1 }).toArray().length,
      probe: (ctx) => {
        const e = ref.analytics_events.find({ timestamp: { $gte: ctx.p.from, $lte: ctx.p.latest } }).hint({ $natural: 1 }).explain("executionStats").executionStats;
        return { nReturned: e.nReturned, docsExamined: e.totalDocsExamined, keysExamined: e.totalKeysExamined, collection_size: ctx.total };
      },
    },
    {
      name: "range7d_ixscan",
      params: { predicate: "timestamp in last 7 days", path: "IXSCAN idx_analytics_timestamp (hinted)" },
      op: (ctx) => ref.analytics_events.find({ timestamp: { $gte: ctx.p.from, $lte: ctx.p.latest } }).hint("idx_analytics_timestamp").toArray().length,
      probe: (ctx) => {
        const e = ref.analytics_events.find({ timestamp: { $gte: ctx.p.from, $lte: ctx.p.latest } }).hint("idx_analytics_timestamp").explain("executionStats").executionStats;
        return { nReturned: e.nReturned, docsExamined: e.totalDocsExamined, keysExamined: e.totalKeysExamined, collection_size: ctx.total };
      },
    },
  ],
});
