// E05 — Computing a per-course enrollment count: $group, $lookup, or a
// maintained counter.
//
// The reference dataset keeps courses.enrollment_count consistent with the
// enrollments collection (see data/DATA_CARD.md), which allows a fair
// comparison between reading the denormalised field and deriving the value.
if (typeof MMP === "undefined") load(`${process.env.MMP_ROOT || process.cwd()}/experiments/lib/harness.js`);

const ref = db.getSiblingDB("learning_platform");

MMP.runExperiment({
  id: "E05",
  title: "Enrollment counts per course: derived vs denormalised",
  hypothesis:
    "Reading a maintained counter is one to two orders of magnitude cheaper than deriving it; among derived forms, a $group over the indexed enrollments collection beats a per-course $lookup because the latter performs one index probe per course.",
  design: {
    independent: "method of obtaining the per-course count",
    dependent: "latency to produce {course_id, count} for all courses",
    unit: "ms",
    controlled: ["identical result set (one row per course)", "indexes from the bootstrap"],
    notes: "All three levels return a fully materialised array of {_id, count} on the client.",
  },
  trials: 30,
  warmup: 5,
  setup(ctx) {
    ctx.courses = ref.courses.estimatedDocumentCount();
    ctx.enrollments = ref.enrollments.estimatedDocumentCount();
  },
  levels: [
    {
      name: "group_enrollments",
      params: { pipeline: "$group on enrollments.course_id" },
      op: () => ref.enrollments.aggregate([{ $group: { _id: "$course_id", count: { $sum: 1 } } }]).toArray().length,
      probe: (ctx) => ({ courses: ctx.courses, enrollments: ctx.enrollments }),
    },
    {
      name: "lookup_per_course",
      params: { pipeline: "courses $lookup enrollments, $size" },
      op: () =>
        ref.courses
          .aggregate([
            { $lookup: { from: "enrollments", localField: "_id", foreignField: "course_id", as: "e" } },
            { $project: { count: { $size: "$e" } } },
          ])
          .toArray().length,
      probe: (ctx) => ({ courses: ctx.courses, enrollments: ctx.enrollments }),
    },
    {
      name: "denormalized_field",
      params: { pipeline: "find courses, project enrollment_count" },
      op: () => ref.courses.find({}, { enrollment_count: 1 }).toArray().length,
      probe: (ctx) => ({ courses: ctx.courses, enrollments: ctx.enrollments }),
    },
  ],
});
