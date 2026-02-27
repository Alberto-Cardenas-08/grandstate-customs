// bd.js
const mongoose = require('mongoose');
const dns = require('dns');

dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB Atlas conectado correctamente');
  } catch (err) {
    console.error('Error al conectar con MongoDB Atlas:', err);
    process.exit(1);
  }
};

module.exports = connectDB;