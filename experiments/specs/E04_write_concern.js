// E04 — Write acknowledgement cost: w:1, w:1 journaled, w:"majority".
//
// Measures insertOne latency under three write concerns. On a single-node
// replica set "majority" is satisfied by the primary alone, so the comparison
// isolates the journal-flush cost (j: true) from replication cost; on a
// multi-member set the majority level additionally includes replication to a
// secondary. The topology is recorded in the environment block.
if (typeof MMP === "undefined") load(`${process.env.MMP_ROOT || process.cwd()}/experiments/lib/harness.js`);

function level(name, wc) {
  return {
    name,
    params: { writeConcern: wc },
    op: (ctx) => {
      ctx.scratch.exp_wc.insertOne({ at: new Date(), payload: ctx.payload }, { writeConcern: wc });
      return 1;
    },
  };
}

MMP.runExperiment({
  id: "E04",
  title: "insertOne latency by write concern",
  hypothesis:
    "Requiring the journal (j: true) adds a flush latency to every write; on a single-node set w:'majority' behaves like w:1 with journaling because majority commits imply durability on the primary, whereas on a multi-node set it additionally waits for a secondary.",
  design: {
    independent: "write concern",
    dependent: "insertOne latency",
    unit: "ms",
    controlled: ["fixed 512-byte payload", "same collection", "single client, no concurrent load"],
    notes: "Interpretation depends on environment.topology.members; see docs/research/METHODOLOGY.md.",
  },
  trials: 100,
  warmup: 10,
  setup(ctx) {
    ctx.scratch.exp_wc.drop();
    ctx.payload = "x".repeat(512);
  },
  teardown(ctx) {
    ctx.scratch.exp_wc.drop();
  },
  levels: [
    level("w1", { w: 1, j: false }),
    level("w1_journaled", { w: 1, j: true }),
    level("majority", { w: "majority" }),
  ],
});
