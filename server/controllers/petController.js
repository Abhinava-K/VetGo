const Pet = require('../models/Pet');
const User = require('../models/User');

// @desc    Get current user's pets
// @route   GET /api/pets
exports.getPets = async (req, res) => {
  try {
    const pets = await Pet.find({ ownerId: req.user.id });
    res.json(pets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a new pet
// @route   POST /api/pets
exports.addPet = async (req, res) => {
  try {
    const { name, species, breed, age } = req.body;
    
    const pet = await Pet.create({
      ownerId: req.user.id,
      name,
      species,
      breed,
      age
    });

    // Update user's pets array
    await User.findByIdAndUpdate(req.user.id, {
      $push: { pets: pet._id }
    });

    res.status(201).json(pet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
