// E06 — Cost of $jsonSchema validation on inserts.
//
// Inserts the same 2 000 user documents (taken from the reference dataset)
// into three otherwise identical collections: no validator, the production
// users validator with validationAction "error", and the same validator with
// validationAction "warn". Measures the insertMany latency per batch.
if (typeof MMP === "undefined") load(`${process.env.MMP_ROOT || process.cwd()}/experiments/lib/harness.js`);

const ref = db.getSiblingDB("learning_platform");
const N = Number(process.env.MMP_E06_DOCS || 2000);

function level(name, options) {
  return {
    name,
    params: options,
    prepare: (ctx) => {
      ctx.scratch[`exp_val_${name}`].drop();
      ctx.scratch.createCollection(`exp_val_${name}`, options.validator ? { validator: options.validator, validationAction: options.validationAction } : {});
    },
    op: (ctx) => {
      const coll = ctx.scratch[`exp_val_${name}`];
      coll.deleteMany({});
      coll.insertMany(ctx.docs, { ordered: false });
      return N;
    },
    cleanup: (ctx) => ctx.scratch[`exp_val_${name}`].drop(),
  };
}

MMP.runExperiment({
  id: "E06",
  title: "insertMany latency with and without $jsonSchema validation",
  hypothesis:
    "Schema validation adds a measurable but modest per-document CPU cost; 'warn' and 'error' cost the same when every document is valid because the schema is evaluated either way.",
  design: {
    independent: "collection validation setting",
    dependent: `insertMany latency for ${N} valid documents`,
    unit: "ms",
    controlled: ["identical documents (users from the reference dataset, _id regenerated)", "deleteMany before each trial so the collection size is constant", "no secondary indexes"],
  },
  trials: 20,
  warmup: 2,
  setup(ctx) {
    const validator = ref.getCollectionInfos({ name: "users" })[0].options.validator;
    ctx.validator = validator;
    const source = ref.users.find().limit(N).toArray();
    ctx.docs = source.map((d) => {
      const copy = { ...d };
      delete copy._id;
      return copy;
    });
    ctx.levelsConfig = {
      no_validator: {},
      validator_error: { validator, validationAction: "error" },
      validator_warn: { validator, validationAction: "warn" },
    };
    ctx.docBytes = MMP.bsonSize(ctx.docs[0]);
  },
  levels: [
    { ...level("no_validator", {}), probe: (ctx) => ({ documents: N, avg_doc_bytes: ctx.docBytes }) },
    {
      name: "validator_error",
      params: { validationAction: "error" },
      prepare: (ctx) => {
        ctx.scratch.exp_val_validator_error.drop();
        ctx.scratch.createCollection("exp_val_validator_error", { validator: ctx.validator, validationAction: "error" });
      },
      op: (ctx) => {
        ctx.scratch.exp_val_validator_error.deleteMany({});
        ctx.scratch.exp_val_validator_error.insertMany(ctx.docs, { ordered: false });
        return N;
      },
      probe: (ctx) => ({ documents: N, avg_doc_bytes: ctx.docBytes }),
      cleanup: (ctx) => ctx.scratch.exp_val_validator_error.drop(),
    },
    {
      name: "validator_warn",
      params: { validationAction: "warn" },
      prepare: (ctx) => {
        ctx.scratch.exp_val_validator_warn.drop();
        ctx.scratch.createCollection("exp_val_validator_warn", { validator: ctx.validator, validationAction: "warn" });
      },
      op: (ctx) => {
        ctx.scratch.exp_val_validator_warn.deleteMany({});
        ctx.scratch.exp_val_validator_warn.insertMany(ctx.docs, { ordered: false });
        return N;
      },
      probe: (ctx) => ({ documents: N, avg_doc_bytes: ctx.docBytes }),
      cleanup: (ctx) => ctx.scratch.exp_val_validator_warn.drop(),
    },
  ],
});
