const mongoose = require('mongoose');

// Define the schema for daily report
const receivedSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    materialName: { type: String, required: true },
    quantity: { type: Number, required: true },
    materialPrice: { type: Number, required: null },
    labourPrice: { type: Number, required: null },
    unit: { type: String, required: true },
    notes: { type: String, default: '' }
},
{ collection: 'materialReceived' });

const Received = mongoose.model('received', receivedSchema);

module.exports = Received;
