const mongoose = require('mongoose');

/**
 * Connect to MongoDB database with Mongoose
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campus_coin_db';
    const conn = await mongoose.connect(mongoURI);

    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
