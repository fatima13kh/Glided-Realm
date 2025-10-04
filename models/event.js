const mongoose = require('mongoose');

const attendeesSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  totalPaid: {
    type: Number,
    required: true,
    min: 0,
  },
});

const eventSchema = new mongoose.Schema({
  title : {
    type: String,
    required: true,
  },
  type: { // enum
    type: String,
    enum: ['Venue', 'Ballet', 'Runway','Art Gallery'],
  },
  datePosted: {
    type: Date,
    required: true,
    default: Date.now,
  },
  eventDate: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String, 
    required: true,
  },
  endTime: {
    type: String, 
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 1,
  },

  // new image fields 
  backgroundImage: {
    type: String,
    required: true,
  },
  ticketImage: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  performers: [
    {
      type: String,
      required: true,
    },
  ],
  bookingPhoneNumber: {
    type: String,
    required: true,
  },
  owner : {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  attendees: [attendeesSchema],
  ticketQuantity: {
    type: Number,
    required: true,
    min : 0,
  },
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
