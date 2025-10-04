const dotenv = require('dotenv');

dotenv.config();
require('./config/database.js');
const express = require('express');
const path = require('path');

const app = express();

const methodOverride = require('method-override');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const isSignedIn = require('./middleware/is-signed-in.js');
const passUserToView = require('./middleware/pass-user-to-view.js');

// Controllers
const authController = require('./controllers/auth.js');

const eventController = require('./controllers/events.js');

const userController = require('./controllers/users.js');

// Set the port from environment variable or default to 3000
const PORT = process.env.PORT ? process.env.PORT : '3000';

// MIDDLEWARE
//
// Middleware to parse URL-encoded data from forms
app.use(express.urlencoded({ extended: false }));
// Middleware for using HTTP verbs such as PUT or DELETE
app.use(methodOverride('_method'));
// Morgan for logging HTTP requests
app.use(morgan('dev'));

// Serve static files from the Assets directory
app.use('/Assets', express.static(path.join(__dirname, 'Assets')));
// Session Storage with MongoStore
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
    }),
  })
);

app.use(express.static(path.join(__dirname, 'public')));


// Add user variable to all templates
app.use(passUserToView);

// PUBLIC
app.get('/', (req, res) => {
  res.render('index.ejs');
});

app.use('/auth', authController);

app.use('/events', eventController);

app.use('/users', isSignedIn, userController);

// PROTECTED


app.listen(PORT, () => {
  console.log(`The express app is ready on port ${PORT}!`);
});
