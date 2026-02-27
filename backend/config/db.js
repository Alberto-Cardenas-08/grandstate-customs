const mongoose = require('mongoose');
const dns = require('dns'); 
dns.setServers(['8.8.8.8', '1.1.1.1']);  

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);  
        console.log('MongoDB conectado');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

module.exports = connectDB;