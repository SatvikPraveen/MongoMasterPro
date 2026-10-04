// E02 — Embedded versus referenced one-to-many reads.
//
// Question: for the "course page" access pattern (one course plus its
// enrollments), how do the three canonical document-model choices compare?
//   embedded        : enrollments embedded as an array inside the course document
//   referenced_lookup: courses + enrollments collections joined server-side with $lookup
//   referenced_2q   : two round trips from the client (findOne + find)
// The embedded representation is derived from the reference dataset at setup
// time, so all three levels serve identical data.
if (typeof MMP === "undefined") load(`${process.env.MMP_ROOT || process.cwd()}/experiments/lib/harness.js`);

const ref = db.getSiblingDB("learning_platform");

MMP.runExperiment({
  id: "E02",
  title: "Embedded vs referenced one-to-many reads (course + enrollments)",
  hypothesis:
    "Reading a course with its enrollments is fastest from a single embedded document, slower with a server-side $lookup, and slowest with two client round trips; the gap is dominated by per-request overhead at this data size rather than by bytes transferred.",
  design: {
    independent: "document model / access pattern",
    dependent: "latency to materialise one course and all its enrollments on the client",
    unit: "ms",
    controlled: ["same course ids for all levels", "identical enrollment payload", "indexes: idx_enrollments_course_status, _id"],
    notes: "Courses are chosen deterministically: the 20 with the most enrollments, cycled per trial so caches are not primed by one hot document.",
  },
  trials: 30,
  warmup: 5,
  setup(ctx) {
    const scratch = ctx.scratch;
    scratch.exp_courses_embedded.drop();
    ref.courses
      .aggregate([
        { $lookup: { from: "enrollments", localField: "_id", foreignField: "course_id", as: "enrollments" } },
        { $out: { db: scratch.getName(), coll: "exp_courses_embedded" } },
      ])
      .toArray();
    ctx.courseIds = ref.courses.find({}, { _id: 1 }).sort({ enrollment_count: -1, _id: 1 }).limit(20).toArray().map((c) => c._id);
    ctx.i = 0;
    ctx.next = () => ctx.courseIds[ctx.i++ % ctx.courseIds.length];
    const sample = scratch.exp_courses_embedded.findOne({ _id: ctx.courseIds[0] });
    ctx.embeddedBytes = MMP.bsonSize(sample);
    ctx.enrollmentsPerCourse = sample.enrollments.length;
  },
  teardown(ctx) {
    ctx.scratch.exp_courses_embedded.drop();
  },
  levels: [
    {
      name: "embedded",
      params: { model: "course{enrollments:[...]}", round_trips: 1 },
      op: (ctx) => ctx.scratch.exp_courses_embedded.findOne({ _id: ctx.next() }).enrollments.length,
      probe: (ctx) => ({ document_bytes: ctx.embeddedBytes, enrollments_in_sample: ctx.enrollmentsPerCourse }),
    },
    {
      name: "referenced_lookup",
      params: { model: "courses + enrollments, $lookup", round_trips: 1 },
      op: (ctx) =>
        ref.courses
          .aggregate([
            { $match: { _id: ctx.next() } },
            { $lookup: { from: "enrollments", localField: "_id", foreignField: "course_id", as: "enrollments" } },
          ])
          .toArray()[0].enrollments.length,
      probe: (ctx) => ({ enrollments_in_sample: ctx.enrollmentsPerCourse }),
    },
    {
      name: "referenced_2q",
      params: { model: "courses + enrollments, two queries", round_trips: 2 },
      op: (ctx) => {
        const id = ctx.next();
        const course = ref.courses.findOne({ _id: id });
        const enrollments = ref.enrollments.find({ course_id: course._id }).toArray();
        return enrollments.length;
      },
      probe: (ctx) => ({ enrollments_in_sample: ctx.enrollmentsPerCourse }),
    },
  ],
});
