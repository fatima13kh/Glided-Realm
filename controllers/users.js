const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Event = require('../models/event');

// Profile route
router.get('/:userId', async (req, res) => {
  try {
    const profileUser = await User.findById(req.params.userId).populate('favourites bookings');
    if (!profileUser) return res.redirect('/');

    // Fetch events posted by the user
    const postedEvents = await Event.find({ owner: profileUser._id });

    // Fetch favourite events
    const favouriteEvents = await Event.find({ _id: { $in: profileUser.favourites } });

    // Booked events 
    const bookedEvents = []; 

    res.render('users/profile.ejs', {
      profileUser,
      postedEvents,
      favouriteEvents,
      bookedEvents,
    });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

module.exports = router;
