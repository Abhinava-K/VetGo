const express = require('express');
const router = express.Router();
const { getPets, addPet } = require('../controllers/petController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getPets);
router.post('/', protect, addPet);

module.exports = router;
