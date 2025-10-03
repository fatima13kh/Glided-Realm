const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/user');
const Event = require('../models/event');

// Profile route
router.get('/:userId', async (req, res) => {
  try {
    const profileUser = await User.findById(req.params.userId)
      .select('-password')
      .populate('favourites bookings.event'); // populate bookings' event

    if (!profileUser) return res.redirect('/');

    // Posted events
    const postedEvents = await Event.find({ owner: profileUser._id });

    // Favourite events
    const favouriteEvents = await Event.find({ _id: { $in: profileUser.favourites } });

    // Booked events: get unique event IDs from bookings
    const bookedEventIds = profileUser.bookings.map(b => b.event);
    const bookedEvents = await Event.find({ _id: { $in: bookedEventIds } })
      .populate('owner')
      .populate('attendees.user');

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



// Edit profile route
router.get('/:userId/edit', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.redirect('/');

    res.render('users/edit.ejs', {
      formData: user,
      errors: []
    });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

// Update profile route
router.post('/:userId/edit', async (req, res) => {
  const { username, email, phoneNumber, password, confirmPassword } = req.body;
  const errors = [];
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId);
    if (!user) return res.redirect('/');

    // Username validation
    if (!username || username.trim().length < 3) {
      errors.push("Username must be at least 3 characters long");
    } else {
      const existingUser = await User.findOne({ username: username.trim() });
      if (existingUser && existingUser._id.toString() !== userId) {
        errors.push("Username is already taken");
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push("Email must be valid");
    } else {
      const existingEmail = await User.findOne({ email });
      if (existingEmail && existingEmail._id.toString() !== userId) {
        errors.push("Email is already registered");
      }
    }

    // Phone number validation
    const phoneRegex = /^\d{8,10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      errors.push("Phone number must be 8-10 digits long");
    }

    // Password validation (optional)
    if (password || confirmPassword) {
      if (password !== confirmPassword) {
        errors.push("Password and Confirm Password must match");
      }
      const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
      if (!passwordRegex.test(password)) {
        errors.push("Password must be at least 8 characters long and include at least one capital letter and one special character");
      }
    }

    if (errors.length > 0) {
      return res.render('users/edit.ejs', { 
        errors, 
        formData: { _id: userId, username, email, phoneNumber } 
      });
    }

    // Update user
    user.username = username;
    user.email = email;
    user.phoneNumber = phoneNumber;

    if (password) {
      user.password = bcrypt.hashSync(password, 10);
    }

    await user.save();

    // Redirect to profile page
    res.redirect(`/users/${userId}`);
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

// display a signle ticket with event details
router.get('/:userId/tickets/:eventId', async (req, res) => {
  try {
    const { userId, eventId } = req.params;

    // Fetch user
    const user = await User.findById(userId).populate('bookings.event');
    if (!user) return res.redirect('/');

    // Filter bookings for this event and calculate totals
    const userBookingsForEvent = user.bookings.filter(
      booking => booking.event._id.toString() === eventId
    );

    if (userBookingsForEvent.length === 0) return res.redirect(`/users/${userId}`);

    const totalTickets = userBookingsForEvent.reduce((sum, b) => sum + b.quantity, 0);
    const totalPaid = userBookingsForEvent.reduce((sum, b) => sum + b.totalPaid, 0);

    // Fetch full event details
    const event = await Event.findById(eventId).populate('owner');

    res.render('users/ticket.ejs', {
      user,
      event,
      totalTickets,
      totalPaid,
    });

  } catch (err) {
    console.error(err);
    res.redirect(`/users/${req.params.userId}`);
  }
});





module.exports = router;
