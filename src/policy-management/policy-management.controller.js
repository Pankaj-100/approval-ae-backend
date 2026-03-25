const Policy = require("./policy-management.model");
// create policy
exports.createPolicy = async (req, res) => {
  try {
    const { policyType, role, title, content } = req.body;

    if (!policyType || !role || !title || !content) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingPolicy = await Policy.findOne({
      policyType,
      role,
      isDeleted: false,
    });
    if (existingPolicy) {
      return res.status(400).json({
        success: false,
        message: "Policy already exists",
      });
    }

    const policy = await Policy.create({
      policyType,
      role,
      title,
      content,
    });

    return res.status(201).json({
      success: true,
      message: "Policy created successfully",
      data: policy,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// get all policies
exports.getAllPolicies = async (req, res) => {
  try {
    const policies = await Policy.find({ isDeleted: false }).sort({
      createdAt: -1,
    });
    return res.status(200).json({
      success: true,
      data: policies,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// get single policy
exports.getSinglePolicy = async (req, res) => {
  try {
    const { policyType, role } = req.query;

    const policy = await Policy.findOne({
      policyType,
      role,
      isDeleted: false,
    });

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: "Policy not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Policy found",
      data: policy,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// update api policy
exports.updatePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const policy = await Policy.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { title, content },
      { new: true },
    );

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: "Policy not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Policy updated successfully",
      data: policy,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// delete policy
exports.deletePolicy = async (req, res) => {
  try {
    const { id } = req.params;

    const policy = await Policy.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true },
      { new: true },
    );

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: "Policy not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Policy deleted successfully",
      data: policy,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
