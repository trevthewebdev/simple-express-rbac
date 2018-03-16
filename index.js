const express = require('express');
const Bluebird = require('bluebird');
const app = express();
const auth = require('./authMiddleware');
const fakeDB = require('./db');
const middleware = require('./middleware');

global.Promise = Bluebird;

middleware(app);

app.get('/games', auth.permit('game:read'), function(req, res) {
  res.json({ requiredRole: 'any' });
});

app.patch(
  '/users/:id',
  auth.permit('user:update', fakeDB.findUser), function(req, res) {
    res.status(204).json();
});

app.listen(5242, () => console.log('listening on 5242'));
