const express = require('express');
const router = express.Router();

const Event = require('../models/event');

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

module.exports = router;