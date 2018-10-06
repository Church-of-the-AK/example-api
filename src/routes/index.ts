import { Application } from 'express'
import { UserRoutes } from './User'
import { AuthRoutes } from './Auth'
import { GuildRoutes } from './Guild'
import { ActionRoutes } from './Actions'
import { DBLRoutes } from './DBL'

export function route (app: Application) {
  UserRoutes(app)
  AuthRoutes(app)
  GuildRoutes(app)
  ActionRoutes(app)
  DBLRoutes(app)
}
