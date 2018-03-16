const getCurrentUserFromDb = require('./db').getCurrentUserFromDb;

module.exports = (app) => {
  // create some namespaces
  app.use((req, res, next) => {
    res.locals.auth = {};
    next();
  });

  app.use(getCurrentUserFromDb);
};
