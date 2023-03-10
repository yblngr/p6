const fs = require('fs');

const Sauce = require('../models/Sauce');

// GET request on endpoint '/api/sauces'
// Request  body : none
// Response body : Array of Sauce
exports.readAllSauces = (req, res, next) => {
  Sauce.find()
    .then(sauces => res.status(200).json(sauces))
    .catch(error => res.status(400).json({ error }));
};

// GET request on endpoint '/api/sauces/:id'
// Request  body : none
// Response body : Sauce
exports.readSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then(sauce => res.status(200).json(sauce))
    .catch(error => res.status(404).json({ error }));
};

// POST request on endpoint '/api/sauces'
// Request  body : { sauce: String, image: File }
// Response body : { message: String }
exports.createSauce = (req, res, next) => {
  const sauceObj = JSON.parse(req.body.sauce);
  const sauce = new Sauce({
    ...sauceObj,
    userId: req.auth.userId,
    imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`,
    likes: 0,
    dislikes: 0,
    usersLiked: [],
    usersDisliked: []
  });
  sauce.save()
    .then(() => res.status(201).json({ message: 'Sauce created' }))
    .catch(error => res.status(400).json({ error }));
};

// PUT request on endpoint '/api/sauces/:id'
// Request  body : Sauce OR { sauce: String, image: File }
// Response body : { message: String }
exports.updateSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then(sauce => {
      if (sauce.userId != req.auth.userId) {
        res.status(403).json({ message: 'Unauthorized request' });
      } else {
        const sauceObj = req.file
          ? {
            ...JSON.parse(req.body.sauce),
            imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
          }
          : req.body;
        if (req.file) {
          const filename = sauce.imageUrl.split('/images/')[1];
          fs.unlink(`images/${filename}`, (error) => {
            if (error) console.warn(error);
          });
        }
        Sauce.updateOne({ _id: req.params.id }, sauceObj)
          .then(() => res.status(200).json({ message: 'Sauce updated' }))
          .catch(error => res.status(401).json({ error }));
      }
    })
    .catch(error => res.status(400).json({ error }));
};

// DELETE request on endpoint '/api/sauces/:id'
// Request  body : none
// Response body : { message: String }
exports.deleteSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then(sauce => {
      if (sauce.userId != req.auth.userId) {
        res.status(403).json({ message: 'Unauthorized request' });
      } else {
        const filename = sauce.imageUrl.split('/images/')[1];
        fs.unlink(`images/${filename}`, () => {
          Sauce.deleteOne({ _id: req.params.id })
            .then(() => res.status(200).json({ message: 'Sauce deleted' }))
            .catch(error => res.status(400).json({ error }));
        });
      }
    })
    .catch(error => res.status(500).json({ error }));
};

// POST request on endpoint '/api/sauces/:id/like'
// Request  body : { userId: String, like: Number }
// Response body : { message: String }
exports.defineLike = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then(sauce => {
      switch (req.body.like) {
        case 0:
          sauce.usersLiked = sauce.usersLiked.filter(id => (id !== req.auth.userId));
          sauce.usersDisliked = sauce.usersDisliked.filter(id => (id !== req.auth.userId));
          break;
        case 1:
          sauce.usersLiked.push(req.auth.userId);
          break;
        case -1:
          sauce.usersDisliked.push(req.auth.userId);
          break;
        default:
          throw new Error('Like : bad value');
      }
      sauce.likes = sauce.usersLiked.length;
      sauce.dislikes = sauce.usersDisliked.length;
      Sauce.updateOne({ _id: req.params.id }, sauce)
        .then(res.status(200).json({ message: `Like defined (${req.body.like})` }))
        .catch(error => res.status(500).json({ error }));
    })
    .catch(error => res.status(500).json({ error }));
};
