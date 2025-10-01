const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  favourites: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
    },
  ],
  bookings: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
    },
  ],
  
});

const User = mongoose.model('User', userSchema);

module.exports = User;
