import { Application } from 'express'
import { UserRoutes } from './User'
import { AuthRoutes } from './Auth'

export function route (app: Application) {
  UserRoutes(app)
  AuthRoutes(app)
}
