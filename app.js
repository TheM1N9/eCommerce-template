const express = require("express");
const session = require("express-session");
const path = require("path");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./models/User");
const MenuItem = require('./models/MenuItem');
const Admin = require("./models/Admin");
const app = express();

// app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.use("/public", express.static(__dirname + "/public"));
app.use('/assets', express.static(__dirname + '/assets'));

app.use(
  session({
    secret: "user-unknown",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const dbURI = "mongodb://localhost:27017/ecommerce-temp";
mongoose
  .connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

function requireLogin(req, res, next) {
  if (req.session && req.session.userId && req.session.userType === "user") {
    return next(); // Proceed to the next middleware or route handler
  } else {
    res.redirect("/userlogin"); // Redirect to login page if not logged in or not a regular user
  }
}

function requireAdminLogin(req, res, next) {
  if (req.session && req.session.userId && req.session.userType === "admin") {
    return next(); // Proceed to the next middleware or route handler
  } else {
    res.redirect("/adminLogin"); // Redirect to admin login page if not logged in or not an admin
  }
}

app.get("/", (req, res) => {
  if (req.session.userId) {
    res.render("index");
  } else {
    res.render("login");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (user) {
      // Compare the provided password with the hashed password stored in the database
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (passwordMatch) {
        req.session.userId = user._id; // Store user ID in session
        req.session.userType = "user";
        res.json({ success: true });
      } else {
        res
          .status(401)
          .json({ success: false, message: "Invalid username or password" });
      }
    } else {
      res
        .status(401)
        .json({ success: false, message: "Invalid username or password" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.post("/signup", async (req, res) => {
  const { email, username, password } = req.body;

  try {
    const existingUser = await User.findOne({
      $or: [{ email: email }, { username: username }],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email or username already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user instance with the hashed password
    const newUser = new User({ email, username, password: hashedPassword });

    // Save the new user to the database
    await newUser.save();

    // Respond with success message
    res
      .status(201)
      .json({ success: true, message: "User created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.post("/adminLoginForm", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await Admin.findOne({ username });

    if (user) {
      // Compare the provided password with the hashed password stored in the database
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (passwordMatch) {
        req.session.userId = user._id; // Store user ID in session
        req.session.userType = "admin";
        res.json({ success: true });
      } else {
        res
          .status(401)
          .json({ success: false, message: "Invalid username or password" });
      }
    } else {
      res
        .status(401)
        .json({ success: false, message: "Invalid username or password" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Route to handle admin signup
app.post("/adminSignupForm", async (req, res) => {
  const { email, username, password } = req.body;

  try {
    const existingUser = await Admin.findOne({
      $or: [{ email: email }, { username: username }],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email or username already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user instance with the hashed password
    const newAdmin = new Admin({ email, username, password: hashedPassword });

    // Save the new user to the database
    await newAdmin.save();

    // Respond with success message
    res
      .status(201)
      .json({ success: true, message: "Admin created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});



// Route to handle adding menu items (if needed)
app.post("/menu/add", async (req, res) => {
  try {
    // Assuming the request body contains information about the menu item
    const { name, description, price, image } = req.body;

    // Create a new menu item
    const menuItem = new MenuItem({
      name,
      description,
      price,
      image,
    });

    // Save the menu item to the database
    await menuItem.save();

    res.status(201).json({ success: true, message: "Menu item added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Route to fetch all menu items
app.get("/menu", requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId);
    // Fetch all menu items from the database
    const menuItems = await MenuItem.find();

    res.render("menu", { menuItems,user });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/menuAdd", requireAdminLogin, async(req,res) =>{
  res.render("menuAdd");
});


// Route to handle adding items to cart
app.post("/add-to-cart/:itemId", async (req, res) => {
  try {
    const userId = req.session.userId;
    const itemId = req.params.itemId;

    // Find the user by ID
    const user = await User.findById(userId);

    // Push the item ID into the user's cart array
    user.cart.push(itemId);

    // Save the updated user object
    await user.save();

    // res.redirect("/cart"); 
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.delete('/cart/remove/:itemId', async (req, res) => {
  const userId = req.session.userId; // Assuming you're using session and userId is stored
  const itemId = req.params.itemId;

  try {
      // Find the user by ID and update their cart by removing the specified item
      const user = await User.findByIdAndUpdate(userId, { $pull: { cart: itemId } }, { new: true });

      if (!user) {
          return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json({ message: 'Item removed from cart successfully', user: user });
  } catch (error) {
      console.error('Error removing item from cart:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});




// Route to display the cart page
app.get("/cart", requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId).populate('cart');

    res.render("cart", { user });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/userlogin", (req, res) => {
  res.render("login")
});

app.get("/userSignup", (req, res) => {
  res.render("signup");
});

app.get("/adminlogin", (req, res) => {
  res.render("adminLogin");
});

app.get("/adminSignup", (req, res) => {
  res.render("adminSignup");
});

app.get("/index", requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId);
    const menuItems = await MenuItem.find();
    res.render("index", { user, menuItems });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/users/:id", requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send("user not found");
    }

    // Render the user page template with the user data
    res.render("myAccount", { user });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// app.get("/menu", requireLogin, async (req, res) => {
//   res.render("menu");
// });
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/userlogin");
});

app.get("/adminLogout", (req, res) => {
  req.session.destroy();
  res.redirect("/adminlogin");
});


const port = 3000;
app.listen(port, () => console.log(`server running ...`));
