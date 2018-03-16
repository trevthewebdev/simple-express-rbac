module.exports.getCurrentUserFromDb = function getCurrentUserFromDb(req, res, next) {
  res.locals.auth.currentUser = {
    _id: '1234',
    first_name: 'John',
    last_name: 'Doe',
    role: 'user',
    is_active: true
  };

  next();
}

module.exports.findUser = function findUser(req, res) {

  switch(req.params.id) {
    case '1234':
      return Promise.resolve({
        user: {
          _id: '1234',
          first_name: 'John',
          last_name: 'Doe',
          role: 'user',
          is_active: true
        }
      });
    break;

    case '1111':
      return Promise.resolve({
        user: {
          _id: '1111',
          first_name: 'Jane',
          last_name: 'Dont',
          role: 'user',
          is_active: true
        }
      });
    break;

    default:
      return Promise.resolve(null);
  }
}
