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
      // Only fetch events where ticketQuantity > 0
    const populatedEvents = await Event.find({ ticketQuantity: { $gt: 0 } }).populate('owner');

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
    const performersStr = req.body.performers.trim();

    if (performersStr.includes(',')) {
        // Multiple performers separated by commas → split into array
        req.body.performers = performersStr.split(',').map(p => p.trim());
    } else {
        // Single performer → allowed
        req.body.performers = [performersStr];
    }

    // Optional: catch multiple words without commas
    if (req.body.performers.length === 1 && req.body.performers[0].includes(' ') && !performersStr.includes(',')) {
        return res.render('events/new.ejs', {
            error: 'Performers must be separated by commas.',
            formData: req.body,
            times
        });
    }
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
   const event = await Event.findById(req.params.eventId).populate('owner').populate('attendees');
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
      favouritedCount,
      bookingMessage: null
    });
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
  });

  
//delete event route
router.delete('/:eventId', async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .populate('owner')
      .populate('attendees.user', 'username');

    if (!event) return res.redirect('/events');

    const currentUser = req.session.user
      ? await User.findById(req.session.user._id)
      : null;

    // ✅ compute real favourites info
    const favouritedCount = await User.countDocuments({ favourites: event._id });
    const userHasFavorited = currentUser
      ? currentUser.favourites.some(fav => fav.equals(event._id))
      : false;

    // Ownership check
    if (!currentUser || !event.owner._id.equals(currentUser._id)) {
      return res.render('events/show.ejs', {
        event,
        user: currentUser,
        favouritedCount,
        userHasFavorited,
        bookingMessage: "You don't have permission to delete this event.",
        bookingMessageColor: 'red'
      });
    }

    // Prevent deletion if tickets have been booked
    if (event.attendees && event.attendees.length > 0) {
      return res.render('events/show.ejs', {
        event,
        user: currentUser,
        favouritedCount,
        userHasFavorited,
        bookingMessage: "You cannot delete this event because tickets have already been booked!",
        bookingMessageColor: 'red'
      });
    }

    // Delete event
    await event.deleteOne();
    return res.redirect('/events');

  } catch (error) {
    console.error(error);
    return res.redirect('/');
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
    const performersStr = req.body.performers.trim();

    if (performersStr.includes(',')) {
        // Multiple performers separated by commas → split into array
        req.body.performers = performersStr.split(',').map(p => p.trim());
    } else {
        // Single performer → allowed
        req.body.performers = [performersStr];
    }

    // catch multiple words without commas
    if (req.body.performers.length === 1 && req.body.performers[0].includes(' ') && !performersStr.includes(',')) {
        return res.render('events/edit.ejs', {
            event,
            formData: { ...req.body, _id: req.params.eventId },
            times,
            error: 'Performers must be separated by commas.'
        });
    }
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

// book event route 
router.post('/:eventId/book', async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).populate('owner').populate('attendees.user', 'username');
    if (!event) return res.redirect('/events');

    // check if user is signed in
    if (!req.session.user) {
      return res.redirect('/auth/sign-in');
    }

    const user = await User.findById(req.session.user._id);

    // prevent owner from booking their own event
    if (event.owner._id.equals(user._id)) {
      return res.redirect(`/events/${event._id}`);
    }

    // parse quantity
    const quantity = parseInt(req.body.quantity);
    if (!quantity || quantity < 1) {
      return res.render('events/show.ejs', {
        event,
        user,
        userHasFavorited: user.favourites.includes(event._id),
        favouritedCount: await User.countDocuments({ favourites: event._id }),
        bookingMessage: 'Please enter a valid number of tickets.',
        bookingMessageColor: 'red'
      });
    }

    // check ticket availability
    if (quantity > event.ticketQuantity) {
      return res.render('events/show.ejs', {
        event,
        user,
        userHasFavorited: user.favourites.includes(event._id),
        favouritedCount: await User.countDocuments({ favourites: event._id }),
        bookingMessage: `Cannot Complete Booking Process. Not enough tickets available. Only ${event.ticketQuantity} left.`,
        bookingMessageColor: 'red'
      });
    }

    const totalPrice = event.price * quantity;

    // reduce available tickets
    event.ticketQuantity -= quantity;

    // update attendees
    if (!event.attendees) event.attendees = [];
    const existingAttendee = event.attendees.find(a => a.user._id.equals(user._id));
    if (existingAttendee) {
      existingAttendee.quantity += quantity;
      existingAttendee.totalPaid += totalPrice;
    } else {
      event.attendees.push({
        user: user._id,
        quantity,
        totalPaid: totalPrice
      });
    }

    // update user bookings (embedded)
    if (!user.bookings) user.bookings = [];
    user.bookings.push({
      event: event._id,
      quantity,
      totalPaid: totalPrice,
      date: new Date()
    });

    await event.save();
    await user.save();

    // re-fetch event to populate attendee usernames for rendering
    const populatedEvent = await Event.findById(event._id)
      .populate('owner')
      .populate('attendees.user', 'username');

    res.set('Refresh', `3; url=/users/${user._id}`); // redirect to profile after 3 seconds

    // render with success message
    res.render('events/show.ejs', {
      event: populatedEvent,
      user,
      userHasFavorited: user.favourites.includes(event._id),
      favouritedCount: await User.countDocuments({ favourites: event._id }),
      bookingMessage: `You successfully booked ${quantity} ticket(s) for ${totalPrice.toFixed(2)} BHD`,
      bookingMessageColor: 'green'
    });

  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});



module.exports = router;