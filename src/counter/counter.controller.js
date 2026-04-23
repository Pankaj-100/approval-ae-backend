const Counter = require("./counter.model");

exports.getNextSequence = async (name, session) => {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session },
  );

  return counter.seq;
};
