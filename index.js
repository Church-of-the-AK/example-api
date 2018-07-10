const { Client } = require('pg')
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const db = require('./config/config').db

const port = 8000

app.use(bodyParser.urlencoded({ extended: true }))

const client = new Client(db)
client.connect()

require('./app/routes')(app, client)
app.listen(port, () => {
  console.log('We are live on ' + port)
  setInterval(() => {
    console.log('Macho API')
  }, 30000)
})
