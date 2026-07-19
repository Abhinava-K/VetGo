const express = require('express');
const router = express.Router();
const { getPets, addPet, updatePet, deletePet } = require('../controllers/petController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getPets);
router.post('/', protect, addPet);
router.put('/:id', protect, updatePet);
router.delete('/:id', protect, deletePet);

module.exports = router;

