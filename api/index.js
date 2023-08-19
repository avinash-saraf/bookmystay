const express = require('express');
const cors = require('cors');
const { default: mongoose } = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const imageDownloader = require('image-downloader');
const multer = require('multer');
const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mime = require('mime-types');

const User = require('./models/User');
const Place = require('./models/Place');
const Booking = require('./models/Booking')

require('dotenv').config();
const app = express();

// more rounds will take longer 
const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = 'asdkfjaks324ksjdf09234asdf3414lk23';
const bucket = 'avinash-booking-app';

// parses json
app.use(express.json());
app.use(cookieParser());
// exposes all the files stored in /uploads 
app.use('/uploads', express.static(__dirname + '/uploads'));

// localhost:5173 can't communicate to api endpoint localhost:4000
// because it throws a Cross Origin Resource Sharing (CORS) error
// a CORS error is thrown when users are accessing shared resources on the same protocol, port
app.use(cors({
  // sets Access-Control-Allow-Credientials header to true
  // this allows browser to expose the response to the frontend JS code
  credentials: true,
  // allows origin to communicate to api
  origin: 'http://127.0.0.1:5173'
}));

// no need to await since we will have enough time to load the db before making requests
// mongoose.connect(process.env.MONGO_URL);

async function uploadToS3(path, originalFilename, mimetype) {
  const client = new S3Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });
  const parts = originalFilename.split('.');
  const ext = parts[parts.length - 1];
  const newFilename = Date.now() + '.' + ext;
  const data = await client.send(new PutObjectCommand({
    Bucket: bucket,
    Body: fs.readFileSync(path),
    Key: newFilename,
    ContentType: mimetype,
    ACL: 'public-read',
  }));
  return `https://${bucket}.s3.amazonaws.com/${newFilename}`;
}

function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    jwt.verify(req.cookies.token, jwtSecret, {}, (err, tokenData) => {
      if (err) { throw err; }
      resolve(tokenData);
    });
  });

}

app.get('/test', (req, res) => {
  mongoose.connect(process.env.MONGO_URL);
  res.json('test ok');
});

app.post('/register', async (req, res) => {
  mongoose.connect(process.env.MONGO_URL);
  const { name, email, password } = req.body;

  // try block because user creation results in error when email already exists in db
  try {
    const userDoc = await User.create({
      name,
      email,
      password: bcrypt.hashSync(password, bcryptSalt),
    });
    res.json(userDoc);
  } catch (e) {
    // throw HTTP error code 422: unprocessable entity since email is non-unique
    res.status(422).json(e);
  }

})

app.post('/login', async (req, res) => {
  mongoose.connect(process.env.MONGO_URL);
  const { email, password } = req.body;
  const userDoc = await User.findOne({ email: email });
  if (userDoc) {
    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (passOk) {
      // Create a web token that encrypts imp user info using shared secret
      jwt.sign({
        email: userDoc.email,
        id: userDoc._id,
      }, jwtSecret, {}, (err, token) => {
        if (err) { throw err; }
        // if we want to allow cross site/host sharing of cookie, we need to set cookie options
        res.cookie('token', token).json(userDoc);
      });

    } else {
      res.status(422).json("pass not ok");
    }
  } else {
    res.json('not found');
  }
});

app.get('/profile', (req, res) => {
  mongoose.connect(process.env.MONGO_URL);
  const { token } = req.cookies;
  if (token) {
    jwt.verify(token, jwtSecret, {}, async (err, tokenData) => {
      if (err) { throw err; }
      // do not retrieve password
      const { name, email, _id } = await User.findById(tokenData.id);
      res.json({ name, email, _id });
    });
  } else {
    res.json(null);
  }

});

app.post('/logout', (req, res) => {
  // deleting the cookie 
  res.cookie('token', '').json(true);
});

app.post('/upload-by-link', async (req, res) => {
  const { link } = req.body;
  const newName = 'photo' + Date.now() + '.jpg';
  await imageDownloader.image({
    url: link,
    // __ dirname is index.js path
    dest: '/tmp/' + newName,
  });
  const url = await uploadToS3('/tmp/' + newName, newName, mime.lookup('/tmp/' + newName));
  res.json(url);
});

const photosMiddleware = multer({ dest: '/tmp' })
app.post('/upload', photosMiddleware.array('photos', 100), async (req, res) => {
  const uploadedFiles = [];
  for (let i = 0; i < req.files.length; i++) {
    const { path, originalname, mimetype } = req.files[i];
    const url = await uploadToS3(path, originalname, mimetype);
    uploadedFiles.push(url);
  }
  res.json(uploadedFiles);
});

app.post('/places', (req, res) => {
  mongoose.connect(process.env.MONGO_URL);
  const { token } = req.cookies;
  const { title, address, addedPhotos, description,
    perks, extraInfo, checkIn, checkOut, maxGuests, price
  } = req.body;
  jwt.verify(token, jwtSecret, {}, async (err, tokenData) => {
    if (err) { throw err; }
    const placeDoc = await Place.create({
      owner: tokenData.id,
      title: title,
      address: address,
      photos: addedPhotos,
      description: description,
      perks: perks,
      extraInfo: extraInfo,
      checkIn: checkIn,
      checkOut: checkOut,
      maxGuests: maxGuests,
      price: price,
    });
    res.json(placeDoc);
  });

});

app.get('/user-places', (req, res) => {
  mongoose.connect(process.env.MONGO_URL);
  const { token } = req.cookies;
  jwt.verify(token, jwtSecret, {}, async (err, tokenData) => {
    if (err) { throw err; }
    const { id } = tokenData;
    res.json(await Place.find({ owner: id }));
  });
});

app.get('/places/:id', async (req, res) => {
  mongoose.connect(process.env.MONGO_URL);
  const { id } = req.params;
  res.json(await Place.findById(id));
});

app.put('/places', async (req, res) => {
  mongoose.connect(process.env.MONGO_URL);
  const { token } = req.cookies;
  const { id, title, address, addedPhotos, description,
    perks, extraInfo, checkIn, checkOut, maxGuests, price
  } = req.body;
  jwt.verify(token, jwtSecret, {}, async (err, tokenData) => {
    if (err) { throw err; }
    const placeDoc = await Place.findById(id);
    if (tokenData.id === placeDoc.owner.toString()) {
      placeDoc.set({
        title: title,
        address: address,
        photos: addedPhotos,
        description: description,
        perks: perks,
        extraInfo: extraInfo,
        checkIn: checkIn,
        checkOut: checkOut,
        maxGuests: maxGuests,
        price: price,
      });
      await placeDoc.save();
      res.json('ok');
    }
  });
});

app.get('/places', async (req, res) => {
  mongoose.connect(process.env.MONGO_URL);
  res.json(await Place.find());
});

app.post('/bookings', async (req, res) => {
  mongoose.connect(process.env.MONGO_URL);
  const userData = await getUserDataFromRequest(req);
  const {
    place, checkIn, checkOut,
    numberOfGuests, name, phone, price,
  } = req.body;
  Booking.create({
    place, checkIn, checkOut,
    numberOfGuests, name, phone, price,
    user: userData.id,
  }).then((bookingDoc) => {
    res.json(bookingDoc);
  }).catch((err) => {
    throw err;
  });
});


app.get('/bookings', async (req, res) => {
  mongoose.connect(process.env.MONGO_URL);
  const userData = await getUserDataFromRequest(req);
  const booking = await Booking.find({ user: userData.id }).populate('place');
  res.json(booking);
});

app.listen(4000);