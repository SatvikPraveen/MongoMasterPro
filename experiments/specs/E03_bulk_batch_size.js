// E03 — Insert throughput as a function of batch size.
//
// Inserts the same 20 000 synthetic documents per trial using insertMany
// batches of 1, 10, 100, 1 000 and 5 000 (ordered: false) and records
// documents per second. The collection is dropped before every trial so each
// measurement starts from an empty collection with a fresh _id index.
if (typeof MMP === "undefined") load(`${process.env.MMP_ROOT || process.cwd()}/experiments/lib/harness.js`);

const TOTAL = Number(process.env.MMP_E03_DOCS || 20000);

function makeDocs(n, rand) {
  const docs = new Array(n);
  for (let i = 0; i < n; i++) {
    docs[i] = {
      seq: i,
      user: `user${Math.floor(rand() * 1000)}`,
      kind: ["view", "click", "purchase"][i % 3],
      amount: Math.round(rand() * 10000) / 100,
      tags: ["a", "b", "c"].slice(0, (i % 3) + 1),
      at: new Date(1735689600000 + i * 1000),
    };
  }
  return docs;
}

function level(batchSize) {
  return {
    name: `batch_${batchSize}`,
    params: { batch_size: batchSize, documents: TOTAL },
    op: (ctx) => {
      const coll = ctx.scratch.exp_bulk;
      coll.drop();
      const t0 = MMP.nowMs();
      for (let start = 0; start < TOTAL; start += batchSize) {
        coll.insertMany(ctx.docs.slice(start, start + batchSize), { ordered: false });
      }
      const elapsed = (MMP.nowMs() - t0) / 1000;
      return TOTAL / elapsed;
    },
    probe: (ctx) => ({ requests: Math.ceil(TOTAL / batchSize), avg_doc_bytes: ctx.docBytes }),
  };
}

MMP.runExperiment({
  id: "E03",
  title: "Insert throughput vs insertMany batch size",
  hypothesis:
    "Throughput rises steeply from single-document inserts to batches of a few hundred, then flattens as per-request overhead stops dominating and the server's per-document cost takes over.",
  design: {
    independent: "insertMany batch size",
    dependent: "insert throughput",
    unit: "docs/s",
    measure: "returned",
    controlled: ["identical documents every trial", "collection dropped before each trial", "ordered: false", "single client connection"],
    notes: `Each trial inserts ${TOTAL} documents; the returned value is TOTAL / elapsed.`,
  },
  trials: 8,
  warmup: 1,
  setup(ctx) {
    ctx.docs = makeDocs(TOTAL, MMP.mulberry32(42));
    ctx.docBytes = MMP.bsonSize(ctx.docs[0]);
  },
  teardown(ctx) {
    ctx.scratch.exp_bulk.drop();
  },
  levels: [1, 10, 100, 1000, 5000].map(level),
});
