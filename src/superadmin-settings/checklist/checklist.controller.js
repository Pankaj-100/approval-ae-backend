const Checklist = require("./checklist.model");
const catchAsyncError = require("../../../utils/catchAsyncError");
const ErrorHandler = require("../../../utils/errorHandler");

const allowedTypes = ["inspection", "mep", "architectural", "structural"];

// Create Checklist Category
exports.createChecklist = catchAsyncError(async (req, res, next) => {
  const { type, title } = req.body;

  if (!type || !title) {
    return next(new ErrorHandler("Type and title are required", 400));
  }

  if (!allowedTypes.includes(type)) {
    return next(new ErrorHandler("Invalid checklist type", 400));
  }

  const lastChecklist = await Checklist.findOne({ type }).sort({ order: -1 });

  const order = lastChecklist ? lastChecklist.order + 1 : 1;

  const checklist = await Checklist.create({
    type,
    title,
    order,
  });

  res.status(201).json({
    success: true,
    message: "Checklist created successfully",
    data: checklist,
  });
});

// Get Checklist By Type
exports.getChecklist = catchAsyncError(async (req, res, next) => {
  const { type } = req.query;

  if (!type) {
    return next(new ErrorHandler("Type is required", 400));
  }

  const checklist = await Checklist.find({ type }).sort({ order: 1 });

  res.status(200).json({
    success: true,
    data: checklist,
  });
});

// Add Checklist Item
exports.addChecklistItem = catchAsyncError(async (req, res, next) => {
  const { text } = req.body;

  if (!text) {
    return next(new ErrorHandler("Text is required", 400));
  }

  const checklist = await Checklist.findById(req.params.checklistId);

  if (!checklist) {
    return next(new ErrorHandler("Checklist not found", 404));
  }

  const lastOrder =
    checklist.items.length > 0
      ? checklist.items[checklist.items.length - 1].order
      : 0;

  checklist.items.push({
    text,
    order: lastOrder + 1,
  });

  await checklist.save();

  res.status(200).json({
    success: true,
    message: "Checklist item added successfully",
    data: checklist,
  });
});

// Update Checklist Item
exports.updateChecklistItem = catchAsyncError(async (req, res, next) => {
  const { text } = req.body;

  const checklist = await Checklist.findById(req.params.checklistId);

  if (!checklist) {
    return next(new ErrorHandler("Checklist not found", 404));
  }

  const item = checklist.items.id(req.params.itemId);

  if (!item) {
    return next(new ErrorHandler("Checklist item not found", 404));
  }

  item.text = text;

  await checklist.save();

  res.status(200).json({
    success: true,
    message: "Checklist item updated successfully",
    data: checklist,
  });
});

// Delete Checklist Item
exports.deleteChecklistItem = catchAsyncError(async (req, res, next) => {
  const checklist = await Checklist.findById(req.params.checklistId);

  if (!checklist) {
    return next(new ErrorHandler("Checklist not found", 404));
  }

  checklist.items = checklist.items.filter(
    (item) => item._id.toString() !== req.params.itemId,
  );

  // reorder items
  checklist.items.forEach((item, index) => {
    item.order = index + 1;
  });

  await checklist.save();

  res.status(200).json({
    success: true,
    message: "Checklist item deleted successfully",
    data: checklist,
  });
});

// Delete Checklist
// exports.deleteChecklist = catchAsyncError(async (req, res, next) => {
//   const checklist = await Checklist.findById(req.params.checklistId);

//   if (!checklist) {
//     return next(new ErrorHandler("Checklist not found", 404));
//   }

//   await checklist.deleteOne();

//   res.status(200).json({
//     success: true,
//     message: "Checklist deleted successfully",
//   });
// });

exports.deleteChecklist = catchAsyncError(async (req, res, next) => {
  const checklist = await Checklist.findById(req.params.checklistId);

  if (!checklist) {
    return next(new ErrorHandler("Checklist not found", 404));
  }

  const { type, order } = checklist;

  // delete checklist
  await checklist.deleteOne();

  // reorder remaining checklists
  const remainingChecklists = await Checklist.find({
    type,
    order: { $gt: order },
  });

  for (const item of remainingChecklists) {
    item.order -= 1;
    await item.save();
  }

  res.status(200).json({
    success: true,
    message: "Checklist deleted successfully",
  });
});

exports.reorderChecklistItems = catchAsyncError(async (req, res, next) => {
  const { items } = req.body;

  const checklist = await Checklist.findById(req.params.checklistId);

  if (!checklist) {
    return next(new ErrorHandler("Checklist not found", 404));
  }

  if (!Array.isArray(items) || items.length === 0) {
    return next(new ErrorHandler("Items array is required", 400));
  }

  // update order
  items.forEach((updatedItem) => {
    const item = checklist.items.id(updatedItem.id);

    if (item) {
      item.order = updatedItem.order;
    }
  });

  // sort items
  checklist.items.sort((a, b) => a.order - b.order);

  await checklist.save();

  res.status(200).json({
    success: true,
    message: "Checklist items reordered successfully",
    data: checklist,
  });
});

exports.updateChecklist = catchAsyncError(async (req, res, next) => {
  const { title, type } = req.body;

  const checklist = await Checklist.findById(req.params.checklistId);

  if (!checklist) {
    return next(new ErrorHandler("Checklist not found", 404));
  }

  // optional update
  if (title) {
    checklist.title = title;
  }

  if (type) {
    if (!allowedTypes.includes(type)) {
      return next(new ErrorHandler("Invalid checklist type", 400));
    }

    checklist.type = type;
  }

  await checklist.save();

  res.status(200).json({
    success: true,
    message: "Checklist updated successfully",
    data: checklist,
  });
});
