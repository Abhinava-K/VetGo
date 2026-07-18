const express = require('express');
const router = express.Router();
const { 
  createRequest, 
  acceptRequest, 
  startRequest,
  completeRequest,
  getMyRequests,
  getRequestById
} = require('../controllers/requestController');
const { protect, authorize } = require('../middleware/auth');
const { validate, requestSchema } = require('../middleware/validators');

router.get('/my-requests', protect, getMyRequests);
router.get('/:id', protect, getRequestById);
router.post('/', protect, authorize('USER'), validate(requestSchema), createRequest);
router.post('/:id/accept', protect, authorize('DOCTOR'), acceptRequest);
router.post('/:id/start', protect, authorize('DOCTOR'), startRequest);
router.post('/:id/complete', protect, authorize('USER'), completeRequest);

module.exports = router;
