const multer = require('multer');

const MIME_TYPES = {
  'image/jpg': 'jpg',
  'image/jpeg': 'jpg',
  'image/png': 'png'
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, 'images');
  },
  filename: (req, file, callback) => {
    // First cleans the original filename, by replacing spaces with underscores, then decompose it
    const name = file.originalname.split(' ').join('_').split('.');
    // Removes the original file extension
    name.pop();
    // Adds a timestamp followed by the matching mimetype extension
    name.push(Date.now().toString(), MIME_TYPES[file.mimetype]);
    // Finally rebuilds the filename
    callback(null, name.join('.'));
  }
});

module.exports = multer({ storage: storage }).single('image');
