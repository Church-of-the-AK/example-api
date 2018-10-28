import * as express from 'express'
import { urlencoded, json } from 'body-parser'
import * as morgan from 'morgan'
import { createServer } from 'https'
import { readFileSync } from 'fs'
import { db } from './config/config'
import { createConnection } from 'typeorm'
import { route } from './routes'

const app = express()
const port = 8000

app.use(urlencoded({ extended: true }))
app.use(json())
app.use(morgan(':method :url :status :res[content] - :response-time ms'))
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  next()
})

connect().then(connection => {
  route(app)

  createServer({
    key: readFileSync('/etc/letsencrypt/live/www.macho.ninja/privkey.pem'),
    cert: readFileSync('/etc/letsencrypt/live/www.macho.ninja/fullchain.pem')
  }, app).listen(port, function () {
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
    entities: [ 'node_modules/machobot-database/out/type/**/*.js' ]
  })

  await connection.synchronize()

  return connection
}
