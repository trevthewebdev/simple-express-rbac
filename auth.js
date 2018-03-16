let theRoles = {
  superadmin: {
    inherits: ['admin'],
    can: [
      'user:create',
      'user:delete',
      'game:archive',
      'group:archive',
      'play:archive',
      'play:delete'
    ]
  },
  admin: {
    inherits: ['contributor'],
    can: [
      {
        name: 'user:update',
        when: function (params) {
          if (
            params.currentUser.role === 'admin' &&
            (params.user.role === 'admin' || params.user.role === 'superadmin')
          ) {
            return false;
          } else {
            return true;
          }
        }
      },
      'user:deactivate',
      'group:read',
      'group:update',
      'event:read',
      'event:update',
      'play:read'
    ]
  },
  contributor: {
    inherits: ['user'],
    can: [
      'game:create',
      'game:update'
    ]
  },
  user: {
    can: [
      'game:read',
      'user:read',
      {
        name: 'user:update',
        when: function(params) {
          return (
            params.user.is_active &&
            params.currentUser._id === params.user._id
          );
        }
      },
      {
        name: 'group:read',
        when: function(params) {
          return (
            params.group.is_public ||
            !!params.group.members.find(id => params.currentUser._id)
          );
        }
      },
      'group:create',
      {
        name: 'group:update',
        when: function (params) {
          return params.currentUser._id === params.group.owner;
        }
      },
      {
        name: 'group:delete',
        when: function (params) {
          return params.currentUser._id === params.group.owner;
        }
      },
      'event:create',
      {
        name: 'event:read',
        when: function() {
          return (
            params.event.is_public ||
            !!params.group.attendees.find(id => params.currentUser._id) ||
            !!params.group.invitees.find(id => params.currentUser._id)
          );
        }
      },
      {
        name: 'event:update',
        when: function (params) {
          return params.currentUser._id === params.event.owner;
        }
      },
      {
        name: 'event:delete',
        when: function (params) {
          return params.currentUser._id === params.event.owner;
        }
      },
      'play:create',
      {
        name: 'play:read',
        when: function(params) {
          return !!params.play.players.find(id => params.currentUser._id);
        }
      },
      {
        name: 'play:update',
        when: function (params) {
          return params.currentUser._id === params.play.owner;
        }
      }
    ]
  }
};

class rbac {
  constructor(roles) {
    this.init(roles);
  }

  init(roles) {
    if (typeof roles !== 'object') {
      throw new TypeError('Expected an object as input');
    }

    let map = {};
    Object.keys(roles).forEach(role => {
      map[role] = { can: {} };

      if (roles[role].inherits) {
        map[role].inherits = roles[role].inherits;
      }

      roles[role].can.forEach(operation => {
        if (typeof operation === 'string') {
          map[role].can[operation] = 1;
        } else if (
          typeof operation.name === 'string' &&
          typeof operation.when === 'function'
        ) {
          map[role].can[operation.name] = operation.when;
        }
      });
    });

    this.roles = map;
  }

  can(role, operation, params) {
    return new Promise((resolve, reject) => {
      if (typeof role !== 'string') {
        throw new TypeError('Expected first parameter to be string : role');
      }

      if (typeof operation !== 'string') {
        throw new TypeError('Expected second parameter to be string : operation');
      }

      let $role = this.roles[role];

      if (!$role) {
        throw new Error('Undefined role');
      }

      // if this operation is not defined at current level try what it inherited from
      if (!$role.can[operation]) {
        if (!$role.inherits) {
          return reject(false);
        }

        // return if any parent resolves true or all reject
        return (
          Promise
            .any($role.inherits.map(parent => this.can(parent, operation, params)))
            .then(resolve, reject)
        );
      }

      // we have the operation to resolve
      if ($role.can[operation] === 1) {
        return resolve(true);
      }

      if (typeof $role.can[operation] === 'function') {
        const pass = $role.can[operation](params);

        if (pass) {
          return resolve(true);
        } else {
          return reject(false);
        }
      }

      // no operation reject as false
      reject(false);
    });
  }

  /**
   *
   * @param {string} operation
   * @param {function} getParams gets required data
   */
  permit(operation, getParams) {
    return (req, res, next) => {
      let defaultParams = Object.assign({}, res.locals.auth);

      const resolveIncomingParams = (
        new Promise((resolve, reject) => {
          resolve(
            (typeof getParams === 'function') ? getParams(req, res): {}
          );
        })
      );

      resolveIncomingParams
        .then(params => Object.assign({}, defaultParams, params))
        .then((params) => this.can(params.currentUser.role, operation, params))
        .then(() => next())
        .catch(error => {
          res.status(403).json({
            title: 'Unauthorized',
            message: 'You are not authorized to perform the requested action'
          })
        });
    }
  }
}

module.exports.RBAC = rbac;
module.exports.roles = theRoles;

/*
Authorization Rules
  Super Admin:
    Inherits from Admin
    Can:
      - uers
        - delete
        - create admins
      - games
        - archive
      - groups
        - archive
      - play log
        - archive
        - delete

  Admin:
    Inherits from Contributor
    Can:
      - users
        - update
        - deactivate
      - groups
        - read
        - update
      - events
        - read
        - update
      - play log
        - read

  Contributor:
    Inherits from General User
    Can:
      - games
        - create
        - update

  General User:
    Can:
      - users
        - read
        - update: when it is themselves & their account is active
      - games
        - read
      - groups
        - read: when the group is public OR they are a member of the group
        - create
        - update: when they are the owner
        - delete: when they are the owner
      - events
        - create
        - read: when the event is public OR they are on the attendees / invitee list OR the group they are a part of is the attendee / invitee
        - update: when they are the owner of the event
        - delete: when they are the owner of the event
      - play log
        - create
        - read: when they are on the list of people who played the game
        - update: when they are the owner of the play log
      - locations -- this might just be under the user object.. could technically kill this resource
        - create
        - read: when they are the owner
        - update: when they are the owner
        - delete: when they are the owner
*/
