const userRoutes = require('./user_routes')
const authRoutes = require('./auth_routes').doStuff
module.exports = function(app, client) {
  userRoutes(app, client)
  authRoutes(app, client)
}
