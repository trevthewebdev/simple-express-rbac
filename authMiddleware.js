const authModule = require('./auth');
const rbac = authModule.RBAC;
const roles = authModule.roles;

module.exports = new rbac(roles);
