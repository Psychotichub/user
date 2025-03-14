const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const dbName = 'dailyReport';

let db;

async function connectToMongo() {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        db = client.db(dbName);
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
}

function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call connectToMongo first.');
    }
    return db;
}

module.exports = { connectToMongo, getDb };
