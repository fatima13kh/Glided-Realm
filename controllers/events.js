const express = require('express');
const router = express.Router();

const Event = require('../models/event');

router.get('/', async (req, res) => {
  try {
    const populatedEvents = await Event.find({}).populate('owner');

    res.render('events/index.ejs', {
      events: populatedEvents,
    });
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

router.get('/new', (req, res) => {
    res.render('events/new.ejs');
});

router.post('/', async (req, res) => {
  req.body.owner = req.session.user._id;
  await Event.create(req.body);
  res.redirect('/events');
});



module.exports = router;