const fs = require('fs');

const Sauce = require('../models/Sauce');

exports.readAllSauces = (req, res, next) => {
  Sauce.find()
    .then(sauces => res.status(200).json(sauces))
    .catch(error => res.status(400).json({ error }));
};

exports.readSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then(sauce => res.status(200).json(sauce))
    .catch(error => res.status(404).json({ error }));
};

exports.createSauce = (req, res, next) => {
  const sauceObj = JSON.parse(req.body.sauce);
  delete sauceObj.userId; // nécessaire ? auparavant sauceObj._userId (undefined)
  const sauce = new Sauce({
    ...sauceObj,
    userId: req.auth.userId, // pas la peine de le delete avant ! ça le met à jour au besoin...
    imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`,
    likes: 0,
    dislikes: 0,
    usersLiked: [],
    usersDisliked: []
  });
  sauce.save()
    .then(() => res.status(201).json({ message: 'Sauce created' }))
    .catch(error => res.status(400).json({ error }))
};

exports.updateSauce = (req, res, next) => {
  const sauceObj = req.file
    ? {
      ...JSON.parse(req.body.sauce),
      imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
    }
    : { ...req.body }
  // delete sauceObj.userId;
  // ???? again ! J'ai supprimé l'instruction précédente, c'était 'delete sauceObj._userId' mais cette propriété n'existe pas
  // MDN : "Si la propriété qu'on souhaite supprimer n'existe pas, delete n'aura aucun effet et l'opération renverra true"
  // et pourquoi supprimer sauceObj.userId puisque l'updateOne ne vaut que s'il est valide ?
  Sauce.findOne({ _id: req.params.id })
    .then(sauce => {
      if (sauce.userId != req.auth.userId) {
        res.status(403).json({ message: 'Unauthorized request' });
      } else { // Le sauce.userId est donc valide, ce ne peut être que celui retourné par MongoDB ! Pourquoi le supprimer auparavant de sauceObj ?
        // console.log(sauceObj);
        Sauce.updateOne({ _id: req.params.id }, { ...sauceObj, _id: req.params.id }) // meme pas sur que préciser '_id: req.params.id' soit utile
          .then(() => res.status(200).json({ message: 'Sauce updated' }))
          .catch(error => res.status(401).json({ error }));
      }
    })
    .catch(error => res.status(400).json({ error }));
};

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
        })
      }
    })
    .catch(error => res.status(500).json({ error }));
};

exports.defineLike = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then(sauce => {
      console.log(req.body.like);
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
          throw new Error('Bad value');
      }
      sauce.likes = sauce.usersLiked.length;
      sauce.dislikes = sauce.usersDisliked.length;
      Sauce.updateOne({ _id: req.params.id }, sauce)
        .then(res.status(200).json({ message: 'Sauce updated' }))
        .catch(error => res.status(500).json({ error }));
    })
    .catch(error => res.status(500).json({ error }));
}
