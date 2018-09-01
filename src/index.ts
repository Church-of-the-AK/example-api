import * as express from 'express'
import * as bodyParser from 'body-parser'
import * as morgan from 'morgan'
import { User, UserBalance, UserLevel, UserLinks, Guild, GuildSettings } from 'machobot-database'
import { db } from './config/config'
import { createConnection } from 'typeorm'
import { route } from './routes'

const app = express()
const port = 8000

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(morgan(':method :url :status :res[content] - :response-time ms'))
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  next()
})

connect().then(() => {
  route(app)

  app.listen(port, () => {
    console.log(`Listening on port ${port}`)
  })
})

async function connect () {
  const connection = await createConnection({
    type: 'postgres',
    host: db.host,
    port: db.port,
    username: db.user,
    password: db.password,
    database: db.database,
    entities: [ User, UserBalance, UserLevel, UserLinks, Guild, GuildSettings ]
  })

  await connection.synchronize()

  return connection
}
