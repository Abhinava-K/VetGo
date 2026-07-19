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

// @desc    Update a pet
// @route   PUT /api/pets/:id
exports.updatePet = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    if (pet.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this pet' });
    }

    const { name, species, breed, age } = req.body;
    if (name !== undefined) pet.name = name;
    if (species !== undefined) pet.species = species;
    if (breed !== undefined) pet.breed = breed;
    if (age !== undefined) pet.age = age;

    await pet.save();
    res.json(pet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a pet
// @route   DELETE /api/pets/:id
exports.deletePet = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    if (pet.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this pet' });
    }

    await pet.deleteOne();

    // Pull pet ID from user's pets array
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { pets: pet._id }
    });

    res.json({ message: 'Pet removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

