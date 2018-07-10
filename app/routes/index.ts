import { user } from './user_routes'
import { auth } from './auth_routes'
import { Application, Request, Response } from 'express'
import { Client } from "pg";

export function route(app: Application, client: Client) {
  user(app, client)
  auth(app, client)

  app.get('/', async function home (request: Request, response: Response) {
    response.send('Macho API')
  })
}
