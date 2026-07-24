const Report = require('../models/Report');
const RequestModel = require('../models/Request');

// @desc    Submit a report for an emergency request
// @route   POST /api/reports
exports.createReport = async (req, res) => {
  try {
    const { requestId, category, description, reportedId } = req.body;

    if (!requestId || !category) {
      return res.status(400).json({ message: 'Request ID and report category are required.' });
    }

    // Mandatory 30-char validation if category is OTHER
    if (category === 'OTHER') {
      if (!description || description.trim().length < 30) {
        return res.status(400).json({ 
          message: 'When selecting "Other", please provide a detailed explanation of at least 30 characters.' 
        });
      }
    }

    const request = await RequestModel.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Emergency request not found.' });
    }

    // Determine reported user if not explicitly passed
    let targetUserId = reportedId || null;
    if (!targetUserId) {
      if (req.user.role === 'USER') {
        targetUserId = request.acceptedBy || null;
      } else if (req.user.role === 'DOCTOR') {
        targetUserId = request.userId || null;
      }
    }

    // Check for existing report to prevent duplicate spamming
    const existingReport = await Report.findOne({
      reporterId: req.user.id,
      requestId
    });

    if (existingReport) {
      return res.status(400).json({ message: 'You have already submitted a report for this emergency.' });
    }

    const report = await Report.create({
      reporterId: req.user.id,
      reportedId: targetUserId,
      requestId,
      reporterRole: req.user.role,
      category,
      description: description ? description.trim() : ''
    });

    res.status(201).json({
      message: 'Report submitted successfully. Our safety team will review it.',
      report
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already submitted a report for this emergency.' });
    }
    console.error('Error creating report:', error);
    res.status(500).json({ message: error.message });
  }
};
