const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  image: String, // Path to the image file
});

const MenuItem = mongoose.model('MenuItem', menuItemSchema);

module.exports = MenuItem;
