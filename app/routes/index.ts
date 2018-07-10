import { user } from './user_routes'
import { auth } from './auth_routes'
import { Application } from 'express'
import { Client } from "pg";

export function route(app: Application, client: Client) {
  user(app, client)
  auth(app, client)
}
