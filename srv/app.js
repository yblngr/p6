const mongoose = require('mongoose');
const express = require('express');
const helmet = require('helmet');
const path = require('path');

const userRoutes = require('./routes/user');
const sauceRoutes = require('./routes/sauce');

mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGODB_URI,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('MongoDB : Successful connection'))
  .catch(() => console.log('MongoDB : Connection failed'));

const app = express();

app.use(express.json());

// Helmet sets the CORP header to 'same-origin' by default, which is too restrictive.
// 'localhost:4200' (client) and 'localhost:3000' (server) are 'same-site', not 'same-origin'.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  next();
});

app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/api/auth', userRoutes);
app.use('/api/sauces', sauceRoutes);

module.exports = app;
