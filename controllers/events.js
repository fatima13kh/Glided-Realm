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

        //Parse 12h AM/PM time string into Date object
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

// edit event route
router.get('/:eventId/edit', async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.redirect('/events');

    // Check if current user is the owner
    if (!event.owner.equals(req.session.user._id)) {
      return res.redirect(`/events/${event._id}`); // redirect to show page
    }

    const times = generateTimes(); // for start/end time dropdown

    res.render('events/edit.ejs', {
      event,
      formData: event, // prefill form with current event data
      times,
      error: null
    });
  } catch (err) {
    console.error(err);
    res.redirect('/events');
  }
});

// update event route
router.put('/:eventId', async (req, res) => {
  try {
    // Get the event by ID from the URL
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.redirect('/events');

    // Check ownership
    if (!event.owner.equals(req.session.user._id)) {
      return res.redirect(`/events/${event._id}`);
    }

    const times = generateTimes(); // for re-rendering in case of validation error

    const now = new Date();
    const eventDate = new Date(req.body.eventDate);

    // Validate event date
    if (
      eventDate.getFullYear() < now.getFullYear() ||
      (eventDate.getFullYear() === now.getFullYear() &&
        eventDate.getMonth() < now.getMonth()) ||
      (eventDate.getFullYear() === now.getFullYear() &&
        eventDate.getMonth() === now.getMonth() &&
        eventDate.getDate() <= now.getDate())
    ) {
      return res.render('events/edit.ejs', {
        event,
        formData: { ...req.body, _id: req.params.eventId },
        times,
        error: 'Event date cannot be the same or in the past.'
      });
    }

    // Parse 12h AM/PM time string into Date object
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
      return res.render('events/edit.ejs', {
        event,
        formData: { ...req.body, _id: req.params.eventId },
        times,
        error: 'End time must be later than start time.'
      });
    }

    // Convert performers to array if needed
    if (typeof req.body.performers === 'string') {
      if (!req.body.performers.includes(',')) {
        return res.render('events/edit.ejs', {
          event,
          formData: { ...req.body, _id: req.params.eventId },
          times,
          error: 'Performers must be separated by commas.'
        });
      }
      req.body.performers = req.body.performers.split(',').map(p => p.trim());
    }

    // Perform the update
    await event.updateOne(req.body);

    // Redirect to the event page
    res.redirect(`/events/${req.params.eventId}`);
  } catch (err) {
    console.error(err);
    const times = generateTimes();
    res.render('events/edit.ejs', {
      event: req.body,
      formData: { ...req.body, _id: req.params.eventId },
      times,
      error: 'There was an error updating the event.'
    });
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