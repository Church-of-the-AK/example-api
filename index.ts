import { Client } from 'pg'
import * as express from 'express'
import * as bodyParser from 'body-parser'
import { route } from './app/routes'
import { db } from "./config/config";

const app: express.Application = express()
const port = 8000
const client = new Client(db)

app.use(bodyParser.urlencoded({ extended: true }))
client.connect()

route(app, client)

app.listen(port, () => {
  console.log('We are live on ' + port)
  setInterval(() => {
    console.log('Macho API')
  }, 30000)
})
