 /******************************************************
 * PLEASE DO NOT EDIT THIS FILE
 * the verification process may break
 * ***************************************************/

'use strict';

var fs = require('fs');
var express = require('express');
var app = express();
var path    = require("path");
var mongodb = require('mongodb');

var MongoClient = mongodb.MongoClient;
var url = 'mongodb://root:glitch@ds021326.mlab.com:21326/glitch_db'


if (!process.env.DISABLE_XORIGIN) {
  app.use(function(req, res, next) {
    var allowedOrigins = ['https://narrow-plane.gomix.me', 'https://www.freecodecamp.com'];
    var origin = req.headers.origin || '*';
    if(!process.env.XORIG_RESTRICT || allowedOrigins.indexOf(origin) > -1){
         console.log(origin);
         res.setHeader('Access-Control-Allow-Origin', origin);
         res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    }
    next();
  });
}

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

app.use('/public', express.static(__dirname + '/public'));

app.route('/_api/package.json')
  .get(function(req, res, next) {
    console.log('requested');
    fs.readFile(__dirname + '/package.json', function(err, data) {
      if(err) return next(err);
      res.type('txt').send(data.toString());
    });
  });
  

app.route('/')
.get(function(req, res) {
    res.render('main.html');
});

app.route('/go/:key')
.get(function(req, res) {
  MongoClient.connect(url, function (err, db) {
    var collection = db.collection('urls');
    collection.find({'short_url': parseInt(req.params.key)}).toArray(function(err, docs) {
      var original_url = docs[0]['original_url'];
      res.redirect(original_url);
    });
  });
});

app.route('/api/new/:key(*)')
.get(function(req, res) {
  var result = {};
  
  if (req.params.key.indexOf('http://') < 0 && req.params.key.indexOf('https://') < 0) {
    result.err = "you passed an invalid URL that doesn't follow the valid http://www.example.com format";
    res.send(result);
    return;
  }
  
  MongoClient.connect(url, function (err, db) {
    if (err) {
      result.err = 'Unable to connect to the mongoDB server. ERROR: '.concat(err);
      res.send(result);
    } else {
      
      console.log('Connection established to ', url);
      var collection = db.collection('urls');
      
      collection.find().sort({short_url: -1}).limit(1).toArray(function(err, docs) {
        var short_url = docs[0]['short_url'] + 1;
        
        result = {
          'original_url': req.params.key,
          'short_url': short_url
        };
        
        collection.insert(result, function(err, data) {
          result['short_url'] = req.protocol + '://' + req.get('host') + "/go/" + short_url;
          db.close();
          res.send(result);
        });
        
      });
    }
  });
  
});


app.route('/api/whoami')
.get(function(req, res) {
  var result = {
    'ipadress': req.headers['x-forwarded-for'].split(',')[0],
    'language': req.headers['accept-language'].split(',')[0],
    'software': req.headers['user-agent']
  }
  res.send(result);
});


app.route('/api/time/:key')
.get(function(req, res) {
  var key = req.params.key;
  var result = {
    'unix': null,
    'natural': null
  };
  
  var natural = new Date(key * 1000);
  
  if (!isNaN(natural)) {
    result.unix = key;
    result.natural = natural;
    res.send(result);
    
  } else {
    var unix = new Date(key).getTime() / 1000;
    if (!isNaN(unix)) {
      result.natural = key;
      result.unix = unix;
      res.send(result);
    } else {
      res.send(result);
    }
  }
});

// Respond not found to all the wrong routes
app.use(function(req, res, next){
  res.status(404);
  res.type('txt').send('Not found');
});

// Error Middleware
app.use(function(err, req, res, next) {
  if(err) {
    res.status(err.status || 500)
      .type('txt')
      .send(err.message || 'SERVER ERROR');
  }  
})

app.listen(process.env.PORT, function () {
  console.log('Node.js listening ...');
});

