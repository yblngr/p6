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
  // POST /api/sauces/:id/like
  // req.body: { userId : String, like: Number }
  // res: { message : String }
  // req.like = 1 : aime la sauce
  // req.like = 0 : annulation de like et dislike
  // req.like = -1 : n'aime pas la sauce
  // usersLike / usersDislike : ajout/retrait de l'userId
  // like / dislike : mise à jour
  console.log('Identifiant sauce (id) : ' + req.params.id); // on a l'id de la sauce
  console.log('utilisateur authentifié : ' + req.auth.userId); // et l'id de l'utilsateur qui l'évalue
  // de quelle sauce s'agit-t-il ? Parce que sinon, c'est http500
  Sauce.findOne({ _id: req.params.id }) // On pécho la sauce dans BDD, on la mettra à jour après
    .then(sauce => {
      console.log('AVANT');
      const sauceObj = sauce;
      console.log(sauceObj);
      // C'est là que ça le fait, on a l'objet 'sauce' et tout ce qui le concerne
      // J'en fais quoi ? Le modifier, mais ça dépend du 'like' passé dans la req

      // .length ne prend pas de parenthèse, c'est une propriété
      
      console.log('Valeur du like');
      console.log(req.body.like);
      switch (req.body.like) {
        case 0:  // Si like = 0, l'utilisateur annule son like ou son dislike, il n'a plus d'avis
          //Tu disparais des users(Dis)Like et on met à jour le nombre de like et de dislike (après, plus tard)
          console.log('***T\'as plus d\'avis, t\a cliqué sur pouce haut ou pouce bas, c\est le frontend qui gère');
          // Là on te supprime des 'usersLiked' et des 'usersDisliked'..
          sauceObj.usersLiked = sauceObj.usersLiked.filter(id => (id !== req.body.userId));
          sauceObj.usersDisliked = sauceObj.usersDisliked.filter(id => (id !== req.body.userId));
          console.log('LIKE 0');
          console.log(sauceObj);
          break;
        case 1: // i like = 1, l'utilisateur aime (= like) la sauce.
          console.log('***T\'aime bien ça, t\as cliqué sur pouce haut, tu pouvais');
          // On va te rajouter ton user Id à la liste des like, et le nombre de like sera la longueur des utilisateurs qui like...
          sauceObj.usersLiked.push(req.body.userId);
          console.log('T\as appuyé sur le pouce haut');
          console.log('LIKE 1');
          console.log(sauceObj);
          console.log(sauceObj.usersLiked);
          console.log(sauceObj.usersLiked.length);
          sauceObj.likes = sauceObj.usersLiked.length;

          break;
        case -1: //Si like = -1, l'utilisateur n'aime pas (= dislike) la sauce, tu le vires des tableaux
          console.log('***T\'aime pas ça');
          sauceObj.usersDisliked.push(req.body.userId);
          console.log('LIKE -1');
          console.log(sauceObj);
          break;
        default:
        //throw new Error('On est dans la mouise');
      }
      // On a pu mettre à jour les propriétés de 'sauce' avec le 'case'
      // Là faut mettre à jour (updater) l'objet 'sauce' sur MongoDB
      // T'as mis à jour la les nombres like et dislike ? C'est juste la longueurs des tableaux correspondants...
      console.log('APRES');
      console.log(sauceObj);
      sauceObj.likes = sauceObj.usersLiked.length;
      sauceObj.dislikes = sauceObj.usersDisliked.length;
      console.log(sauceObj);
      Sauce.updateOne({ _id: req.params.id }, sauceObj) // eh eh c'est quoi qu'on met là ?

    .then(res.status(200).json({ message: 'OK, c\'est fait' }))
    .catch(error => res.status(555).json({ error }));
})
    .catch (error => res.status(552).json({ error }));

}