const express = require('express');
const bcrypt = require('bcrypt');

const User = require('../models/user');

const router = express.Router();

// GET route for sign-up page
router.get('/sign-up', (req, res) => {
  // Pass empty errors array and empty formData object
  res.render('auth/sign-up.ejs', { errors: [], formData: {} });
});
  

router.get('/sign-in', (req, res) => {
  res.render('auth/sign-in.ejs', { errors: [], formData: {} });
});

router.post('/sign-up', async (req, res) => {
  // Destructure using the schema field names
  const { username, password, confirmPassword, phoneNumber, email } = req.body;
  const errors = [];

  // Check if username already exists
  const userByUsername = await User.findOne({ username });
  if (userByUsername) {
    errors.push("Username is already taken");
  }

  // Check if email already exists
  const userByEmail = await User.findOne({ email });
  if (userByEmail) {
    errors.push("Email is already registered");
  }

  // Username length validation
  if (!username || username.length < 3) {
    errors.push("Username must be at least 3 characters long");
  }

  // Phone number validation (8-10 digits)
  const trimmedPhone = phoneNumber ? phoneNumber.trim() : "";
  const phoneRegex = /^\d{8,10}$/;
  if (!phoneRegex.test(trimmedPhone)) {
    errors.push("Phone number must be 8-10 digits long");
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push("Email must be a valid email address (contain @ and .)");
  }

  // Password confirmation check
  if (password !== confirmPassword) {
    errors.push("Password and Confirm Password must match");
  }

  // Password strength validation
  const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
  if (!passwordRegex.test(password)) {
    errors.push("Password must be at least 8 characters long and include at least one capital letter and one special character");
  }

  // If any validation errors, render form with errors and previous input
  if (errors.length > 0) {
    return res.render('auth/sign-up.ejs', { errors, formData: req.body });
  }

  // Hash password
  const hashedPassword = bcrypt.hashSync(password, 10);

  // Create new user with correct schema fields
  const newUser = await User.create({
    username,
    password: hashedPassword,
    email,
    phoneNumber: trimmedPhone
  });

  // Save session
  req.session.user = {
    username: newUser.username,
    _id: newUser._id
  };

  req.session.save(() => {
    res.redirect("/");
  });
});


router.post('/sign-in', async (req, res) => {
  const { username, password } = req.body;
  const errors = [];

  // Find user by username
  const userInDatabase = await User.findOne({ username });

  if (!userInDatabase) {
    errors.push("Username or Password is invalid");
    return res.render('auth/sign-in.ejs', { errors, formData: req.body });
  }

  // Check password
  const validPassword = bcrypt.compareSync(password, userInDatabase.password);
  if (!validPassword) {
    errors.push("Username or Password is invalid");
    return res.render('auth/sign-in.ejs', { errors, formData: req.body });
  }

  // Save session if login successful
  req.session.user = {
    username: userInDatabase.username,
    _id: userInDatabase._id,
  };

  req.session.save(() => {
    res.redirect('/');
  });
});



router.get("/sign-out", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});



module.exports = router;
