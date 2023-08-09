require('dotenv').config();
const express = require('express');
const app = express();
const session = require('express-session');
const generateSecretKey = require('./secretKey');
const path = require('path');
const db = require('./db');
const bodyParser = require('body-parser');
const User = require('./models/User');
const AnalyticsModel = require('./models/Analytics');

app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));

app.use(session({
  secret: generateSecretKey(),
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    secure: false,
    httpOnly: true
  }
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const authenticateUser = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login'); 
  }
};

const checkAdmin = (req, res, next) => {
  const user = req.session.user;

  if (user && user.role === 'admin') {
    next();
  } else {
    res.status(403).send('Access denied');
  }
};

db.connect();

const analyticsInstance = new AnalyticsModel();

app.use((req, res, next) => {
  const today = new Date().toISOString().split('T')[0];

  AnalyticsModel.updateOne(
    { date: today },
    { $inc: { pageViews: 1 } },
    { upsert: true }
  )
    .then(() => {
      next();
    })
    .catch(error => {
      console.error('Error tracking page views:', error);
      next();
    });
});

app.get('/', authenticateUser, (req, res) => {
  res.render('index');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.get('/future', (req, res) => {
    res.render('future');
});

app.get('/assessment', authenticateUser, (req, res) => {
    res.render('assessment');
});

app.get('/courses', authenticateUser, (req, res) => {
  res.render('courses');
});

app.get('/admin', authenticateUser, checkAdmin, async (req, res) => {
  const user = req.session.user;
  try {
    const administrators = await User.find({ role: 'admin' }, 'username email role permissions');
    res.render('adminHome', { administrators, user });
  } catch (err) {
    res.status(500).send('Error fetching administrators');
  }
});

app.get('/admin/users', authenticateUser, checkAdmin, async (req, res) => {
  try {
    const users = await User.find({}, 'username email role');
    res.render('admin/users/users', { users });
  } catch (error) {
    res.status(500).send('Error fetching administrators');
  }
});

app.get('/admin/reports', async (req, res) => {
  try {
    const analyticsData = await AnalyticsModel.find({}, 'date pageViews').sort({ date: 1 });
    res.render('admin/reports/reports', { analyticsData });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics data', error: error.message });
  }
});

app.get('/admin/users/update/:username', authenticateUser, checkAdmin, async (req, res) => {
  try {
    const username = req.params.username;

    const user = await User.findById(username);

    if (!user) {
      return res.status(404).send('User not found');
    }

    res.render('admin/users/updateUser', { user });
  } catch (error) {
    res.status(500).send('Error fetching user');
  }
});

app.get('/page-view', async (req, res) => {
  try {
    const currentDate = new Date();
    const existingData = await analyticsInstance.findOne({ date: currentDate });

    if (existingData) {
      existingData.pageViews += 1;
      await existingData.save();
    } else {
      const newAnalyticsData = new analyticsInstance({
        date: currentDate,
        pageViews: 1,
      });
      await newAnalyticsData.save();
    }

    res.send('Page viewed!');
  } catch (error) {
    res.status(500).send('Error recording page view');
  }
});

app.post('/track-click', async (req, res) => {
  try {
    await AnalyticsModel.updateOne(
      { date: new Date().toISOString().split('T')[0] },
      { $inc: { buttonClicks: 1 } }
    );
    res.status(200).send('Click tracked');
  } catch (error) {
    res.status(500).send('Error tracking click');
  }
});

app.get('/api/analytics/page-views', async (req, res) => {
  try {
    const analyticsData = await AnalyticsModel.find({}, 'date pageViews').sort({ date: 1 });
    res.json(analyticsData);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics data', error: error.message });
  }
});

app.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists with this email.' });
    }

    const newUser = new User({ username, email, password });

    await newUser.save();

    res.redirect('/');
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    req.session.user = user;
    res.render('index');
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

app.post('/logout', (req, res) => {

  req.session.destroy();

  res.redirect('/login');
});

app.post('/admin/users/update', authenticateUser, checkAdmin, async (req, res) => {
  try {
    const { username, role } = req.body;

    const user = await User.findOneAndUpdate(
      { username },
      { role },
      { new: true }
    );

    if (!user) {
      return res.status(404).send('User not found');
    }

    res.redirect('/admin/users/users');
  } catch (error) {
    res.status(500).send('Error updating user');
  }
});


app.post('/admin/users/update/:username', authenticateUser, checkAdmin, async (req, res) => {
  try {
    const username = req.params.username;
    const { email, password, role } = req.body;

    const user = await User.findOne({ username });

    console.log('Found user:', user);

    if (!user) {
      return res.status(404).send('User not found');
    }

    user.email = email;
    user.password = password;
    user.role = role.toLowerCase();

    await user.save();

    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).send('Error updating user');
  }
});

app.listen(3000, () => {
  console.log(`Server started`);
});
