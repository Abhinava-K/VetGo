const express = require('express');
const router = express.Router();
const { createReport, getReportByRequest } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createReport);
router.get('/check/:requestId', protect, getReportByRequest);

module.exports = router;
