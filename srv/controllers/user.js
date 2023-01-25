const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/User');

// POST request on endpoint '/api/auth/signup'
// Request  body : { email: String, password: String }
// Response body : { message: String }
exports.signup = (req, res, next) => {
  bcrypt.hash(req.body.password, 10)
    .then(hash => {
      const user = new User({
        email: req.body.email.toLowerCase(),
        password: hash
      });
      user.save()
        .then(() => res.status(201).json({ message: 'User created' }))
        .catch(error => res.status(500).json({ error }));
    })
    .catch(error => res.status(500).json({ error }));
};

// POST request on endpoint '/api/auth/login'
// Request  body : { email: String, password: String }
// Response body : { userId: String, token: String }
exports.login = (req, res, next) => {
  User.findOne({ email: req.body.email.toLowerCase() })
    .then(user => {
      if (!user) {
        res.status(401).json({ message: 'Wrong email or password' });
      } else {
        bcrypt.compare(req.body.password, user.password)
          .then(valid => {
            if (!valid) {
              res.status(401).json({ message: 'Wrong email or password' });
            } else {
              res.status(200).json({
                userId: user._id,
                token: jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: '12h' })
              });
            }
          })
          .catch(error => res.status(500).json({ error }));
      }
    })
    .catch(error => res.status(500).json({ error }));
};
