const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const i18n = require('i18n');
const path = require('path');
const ip = require('my-ip');
const publicIp = require('public-ip');

const { isAuth, log } = require('./utils');

const port = process.env.PORT || 3000;
const db = require('./config/db.config.js');
const User = db.user;
const Role = db.role;
const Op = db.Sequelize.Op;

var bcrypt = require('bcryptjs');
const protect = (req, res, next) => {
  if (!req.signedCookies.username) {
    console.log(req.signedCookies.username)
    res.redirect('/');
  }

  next();
};
// force: true will drop the table if it already exists
db.sequelize.sync({ force: false }).then(() => {
  console.log('Drop and Resync with { force: true }');
 // initial();
});
function webServer(app, server) {
  server.listen(port, '0.0.0.0', () => {
    log('');
    log('Web server is running on:', 'white');
    log(`http://localhost:${port}`);
    log(`http://${ip()}:${port}`);

    publicIp
      .v4()
      .then((v4) => {
        log('Your external IP is:', 'white');
        log(`http://${v4}`);
        log('');
      })
      .catch(() => log('Cannot get external IP'));
  });

  // Cookie secret.
  const secret = 'Mmm98N)8bewd88';
  app.use(cookieParser(secret));
  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true })); // for x-www-form-urlencoded
  app.use('/videos', protect);
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // i18n
  i18n.configure({
    locales: ['pt', 'en'],
    queryParameter: 'lang',
    directory: path.join(__dirname, 'locales'),
  });
  app.use(i18n.init);

  // View engine.
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'pages'));

  // Routes.
  app.get('/', (req, res) => {
    res.render('index', { title: 'The index page!' });
  });
  app.post('/register', (req,res)=>{
      // Save User to Database
      console.log("Processing func -> SignUp");
      
      User.create({
        username: req.body.username,
        email: req.body.email,
        password: bcrypt.hashSync(req.body.password, 8)
      }).then(user => {
        Role.findAll({
          where: {
          name: {
            [Op.or]: ['USER']
          }
          }
        }).then(roles => {
          user.setRoles(roles).then(() => {
            res.send("User registered successfully!");
                });
        }).catch(err => {
          res.status(500).send("Error -> " + err);
        });
      }).catch(err => {
        res.status(500).send("Fail! Error -> " + err);
      })
    });
  app.post('/login', (req, res) => {
    User.findOne({
      where: {
        username: req.body.username
      }
    }).then(user => {
      if (!user) {
        return res.status(404).send('User Not Found.');
      }
  
      var passwordIsValid = bcrypt.compareSync(req.body.password, user.password);
      if (!passwordIsValid) {
        return res.status(401).send({ auth: false, reason: "Invalid Password!" });
      }
      res.status(200).send({ auth: true});
    
  }).catch(err => {
		res.status(500).send('Error -> ' + err);
  })
  });

  app.get('/logout', (req, res) => {
    res.cookie('username', '');
    res.redirect('/');
  });
}
//function initial(){
	//Role.create({
	//	id: 1,
	//	name: "USER"
	//});
	
	//Role.create({
	//	id: 2,
	//	name: "ADMIN"
  //});
//}
module.exports = webServer;
