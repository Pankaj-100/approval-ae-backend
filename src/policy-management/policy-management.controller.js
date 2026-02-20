const Policy = require("./policy-management.model");

// create policy
exports.createPolicy = async (req, res) => {
  try {
    const policy = await Policy.create(req.body);

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
    const policies = await Policy.find({ isDeleted: false });

    return res.status(200).json({
      success: true,
      data: policies,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get policy by id
exports.getPolicyById = async (req, res) => {
  const id = req.params.id;

  try {
    const policy = await Policy.findOne({ _id: id, isDeleted: false });

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: "Policy not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: policy,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// update policy
exports.updatePolicy = async (req, res) => {
  const id = req.params.id;

  try {
    const policy = await Policy.findOneAndUpdate(
      { _id: id, isDeleted: false },
      req.body,
      {
        new: true,
      },
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
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// delete policy
exports.deletePolicy = async (req, res) => {
  const id = req.params.id;

  try {
    const policy = await Policy.findByIdAndUpdate(
      id,
      { isDeleted: true },
      {
        new: true,
      },
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
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
