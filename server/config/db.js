const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    // If we are in development and MONGO_URI is missing, just log it instead of exiting
    if (!process.env.MONGO_URI) {
      console.warn('MONGO_URI is not defined. Please check your .env file.');
    } else {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
