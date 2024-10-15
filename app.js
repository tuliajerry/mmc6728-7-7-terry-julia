require('dotenv').config();
const express = require('express');
const exphbs = require('express-handlebars');
const session = require('express-session'); 
const MySQLStore = require('express-mysql-session')(session); 
const db = require('./db'); 
const apiRoutes = require('./routes/api-routes');
const htmlRoutes = require('./routes/html-routes');

const app = express();


const sessionStore = new MySQLStore({
  expiration: 86400000,
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions', 
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data',
    },
  },
}, db);


app.use(session({
  key: 'session_cookie_name', 
  secret: process.env.SESSION_SECRET || 'default_secret', 
  store: sessionStore, 
  resave: false, 
  saveUninitialized: false, 
  cookie: {
    secure: false, 
    maxAge: 86400000, 
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.engine('handlebars', exphbs.engine());
app.set('view engine', 'handlebars');

app.use(express.static('public'));

app.use('/', htmlRoutes);
app.use('/api', apiRoutes);

module.exports = app;
