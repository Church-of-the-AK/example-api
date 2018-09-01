import { Application } from 'express'
import { UserRoutes } from './User'
import { AuthRoutes } from './Auth'
import { GuildRoutes } from './Guild'

export function route (app: Application) {
  UserRoutes(app)
  AuthRoutes(app)
  GuildRoutes(app)
}
