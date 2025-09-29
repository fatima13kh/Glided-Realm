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
    res.render('events/new.ejs', {
     error: null,
        errors: {},
        formData: {}
    });
});

router.post('/', async (req, res) => {
    try {
        req.body.owner = req.session.user._id;
        req.body.datePosted = new Date();

        //convert eventDate to a Date object
        const eventDate = new Date(req.body.eventDate);
        const datePosted = new Date(req.body.datePosted);

        //validate eventDate is in the future
         if (
          eventDate.getFullYear() < now.getFullYear() ||
          (eventDate.getFullYear() === now.getFullYear() &&
            eventDate.getMonth() < now.getMonth()) ||
          (eventDate.getFullYear() === now.getFullYear() &&
            eventDate.getMonth() === now.getMonth() &&
            eventDate.getDate() <= now.getDate())
        ) {
            return res.render('events/new.ejs', {
              error: 'Event date cannot be the same or an older date.',
              formData: req.body,
            });
          }


        //validation for startTime and endTime
        const startDateTime = new Date(`${req.body.eventDate}T${req.body.startTime}`);
        const endDateTime = new Date(`${req.body.eventDate}T${req.body.endTime}`);

        if (startDateTime >= endDateTime) {
          return res.render('events/new.ejs', {
            error: 'Start time must be earlier than end time.',
            formData: req.body,
          });
        }


        //if performers is a string, convert to array
        if (typeof req.body.performers === 'string') {
            req.body.performers = req.body.performers.split(',').map(p => p.trim());
        }

        

        await Event.create(req.body);
        res.redirect('/events');
    } catch (error) {
        console.log(error);
        return res.render('events/new.ejs', {
            error: 'There was an error creating the event. Please check your inputs.',
            formData: req.body,
        });
    }
});







module.exports = router;