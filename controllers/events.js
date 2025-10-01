const express = require('express');
const router = express.Router();

const Event = require('../models/event');
const User = require('../models/user');


function generateTimes() {
    const times = [];
    const periods = ['AM', 'PM'];
    periods.forEach(period => {
        for (let h = 12; h <= 11 || h === 12; h = h === 12 ? 1 : h + 1) {
            ['00', '30'].forEach(min => {
                times.push(`${h}:${min} ${period}`);
            });
            if (h === 11) break;
        }
    });
    return times;
}

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
    //generate time options for startTime and endTime
    const times = generateTimes();

    res.render('events/new.ejs', {
     error: null,
        errors: {},
        formData: {},
        times,
    });
});

router.post('/', async (req, res) => {
    const times = generateTimes(); // generate for re-rendering in case of error
    try {
        const now = new Date();
        req.body.owner = req.session.user._id;
        req.body.datePosted = new Date();

        // Convert eventDate to Date object
        const eventDate = new Date(req.body.eventDate);

        // Validate eventDate is in the future
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
                times
            });
        }

        // Helper: Parse 12h AM/PM time string into Date object
        function parseTime(dateStr, timeStr) {
            const [time, period] = timeStr.split(' ');
            let [hours, minutes] = time.split(':').map(Number);
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
            const dateTime = new Date(dateStr);
            dateTime.setHours(hours, minutes, 0, 0);
            return dateTime;
        }

        const startDateTime = parseTime(req.body.eventDate, req.body.startTime);
        const endDateTime = parseTime(req.body.eventDate, req.body.endTime);
        

        if (endDateTime <= startDateTime) {
            return res.render('events/new.ejs', {
                error: 'End time must be later than start time.',
                formData: req.body,
                times
            });
        }

        // Convert performers to array if needed
        if (typeof req.body.performers === 'string') {
            if (!req.body.performers.includes(',')) {
                return res.render('events/new.ejs', {
                error: 'Performers must be separated by commas.',
                formData: req.body,
                times
            });
    }
            req.body.performers = req.body.performers.split(',').map(p => p.trim());
        }

        await Event.create(req.body);
        res.redirect('/events');

    } catch (error) {
        console.log(error);
        return res.render('events/new.ejs', {
            error: 'There was an error creating the event. Please check your inputs.',
            formData: req.body,
            times
        });
    }
});

// show event details

router.get('/:eventId', async (req, res) => {
  try {
   const event = await Event.findById(req.params.eventId).populate('owner');
    if (!event) return res.redirect('/events');

    let userHasFavorited = false;

    if (req.session.user) {
      const user = await User.findById(req.session.user._id);
      userHasFavorited = user.favourites.some(fav => fav.equals(event._id));
    }

    // count number of people who have favorited the event
    const favouritedCount = await User.countDocuments({ favourites: event._id });

    res.render('events/show.ejs', {
      event,
      userHasFavorited,
      favouritedCount
  
      
    });
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
  });

  
//delete event route

router.delete('/:eventId', async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (event.owner.equals(req.session.user._id)) {
      await event.deleteOne();
      res.redirect('/events');
    } else {
      res.send("You don't have permission to do that.");
    }
  } catch (error) {
    console.error(error);
    res.redirect('/');
  }
});


// favourite and unfavourite event route
  router.post('/:eventId/favourite', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/auth/sign-in'); // redirect to sign in
    }

    const user = await User.findById(req.session.user._id);
    const eventId = req.params.eventId;

    const alreadyFavorited = user.favourites.includes(eventId);

    if (alreadyFavorited) {
      user.favourites.pull(eventId); // remove from favorites
    } else {
      user.favourites.push(eventId); // add to favorites
    }

    await user.save();
    res.redirect(`/events/${eventId}`);
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});




module.exports = router;