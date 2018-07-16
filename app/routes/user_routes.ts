import { code } from '../../config/config'
import * as fs from 'fs'
import * as request from 'request'
import * as jwt from 'jsonwebtoken'
import axios from 'axios'

export function user(app, client) {
  app.get('/users', (req, res) => {
    console.log('GET /users')
    res.set('Access-Control-Allow-Origin', '*')
    client.query(
      `SELECT id, name, avatarurl, datecreated, banned, datelastmessage, steamid FROM public.users`,
      (err, queryRes) => {
        if (err) {
          res.send('Error')
        } else {
          res.send(queryRes.rows)
        }
      }
    )
  })
  app.get('/users/:id', (req, res) => {
    console.log(`GET /users/${req.params.id}`)
    res.set('Access-Control-Allow-Origin', '*')
    client.query(
      `SELECT id, name, avatarurl, banned, datecreated, datelastmessage, steamid, level, balance FROM public.users WHERE id='${
      req.params.id
      }'`,
      (err, queryRes) => {
        if (err) {
          res.send('Error')
        } else {
          res.send(queryRes.rows[0])
        }
      }
    )
  })

  app.post('/users&code=:code', (req, res) => {
    console.log(`POST /users&code=${req.params.code}`)
    res.set('Access-Control-Allow-Origin', '*')
    if (req.params.code != code) {
      return res.send('Error: Invalid auth code')
    }
    const text =
      'INSERT INTO users(id, name, avatarUrl, banned, dateCreated, dateLastMessage, steamId, level, balance) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *'
    const values = [
      req.body.id,
      req.body.name,
      req.body.avatarurl,
      req.body.banned,
      req.body.datecreated,
      req.body.datelastmessage,
      req.body.steamid,
      req.body.level,
      req.body.balance
    ]
    client.query(text, values, (err, queryRes) => {
      if (err) {
        res.send('Error')
        console.log(err.stack)
      } else {
        res.send(queryRes.rows[0])
      }
    })
  })

  app.delete('/users/:id&code=:code', (req, res) => {
    res.set('Access-Control-Allow-Origin', '*')
    console.log(`DELETE /users/${req.params.id}&code=${req.params.code}`)
    if (req.params.code != code) {
      return res.send('Error: Invalid auth code')
    }
    const text = `DELETE FROM users WHERE id='${req.params.id}'`
    let deleted
    client.query(
      `SELECT * FROM public.users WHERE id='${req.params.id}'`,
      (err, queryRes) => {
        if (err) {
          res.send('Error')
        } else {
          deleted = queryRes.rows[0]
        }
      }
    )
    client.query(text, (err, queryRes) => {
      if (err) {
        res.send('Error')
        console.log(err.stack)
      } else {
        res.send(deleted)
      }
    })
  })

  app.put('/users/:id&code=:code', (req, res) => {
    res.set('Access-Control-Allow-Origin', '*')
    console.log(`PUT /users/${req.params.id}&code=${req.params.code}: \n${JSON.stringify(req.body, null, 2)}`)
    if (req.params.code != code) {
      return res.send('Error: Invalid auth code')
    }
    const text = `UPDATE public.users SET id=$1, name=$2, avatarUrl=$3, banned=$4, dateLastMessage=$5, steamId=$6, level=$7, balance=$8 WHERE id='${
      req.params.id
      }'`
    const values = [
      req.body.id,
      req.body.name,
      req.body.avatarurl,
      req.body.banned,
      req.body.datelastmessage,
      req.body.steamid,
      req.body.level,
      req.body.balance
    ]
    let changed
    client.query(
      `SELECT * FROM public.users WHERE id='${req.params.id}'`,
      (err, queryRes) => {
        if (err) {
          res.send('Error')
        } else {
          changed = queryRes.rows[0]
        }
      }
    )
    client.query(text, values, (err, queryRes) => {
      if (err) {
        res.send('Error')
        console.log(err.stack)
      } else {
        res.send(changed)
      }
    })
  })

  app.post('/steamauth/link', async function steamAuthLink(req, res) {
    res.set('Access-Control-Allow-Origin', '*')
    console.log(`POST /steamauth/link`)
    const steamId = req.query.steamId
    const discordId = req.query.discordId
    const apiToken = req.query.jwt
    const publicRSA = await fs.readFileSync('./config/id_rsa.pub.pem')
    let decodedApiToken
    try {
      decodedApiToken = jwt.verify(apiToken, publicRSA)
    } catch (err) {
      console.log('Invalid JWT.')
      res.send('Invalid JWT.')
      return false
    }
    if (decodedApiToken.userId != discordId) {
      console.log(
        `Tried to link to another Discord account.\nDifference: ${
        decodedApiToken.userId
        } (length of ${
        decodedApiToken.userId.length
        }) != ${discordId} (length of ${discordId.length})`
      )
      res.send('Invalid JWT.')
      return false
    }
    let apiUser = await axios.get(`http://localhost:8000/users/${discordId}`)
    if (
      apiUser.data === '' ||
      apiUser.data === 'Error' ||
      apiUser.data === '{}'
    ) {
      return console.log("User doesn't exist.")
    }
    let user = apiUser.data
    const foundUser = await client.query(
      `SELECT * FROM public.users WHERE id='${discordId}'`
    )
    let accessToken = foundUser.rows[0].accesstoken
    if (decodedApiToken.accessToken != accessToken) {
      console.log('Access Token was incorrect')
      res.send('Invalid JWT.')
      return false
    }
    let users = await axios.get('http://localhost:8000/users')
    users = users.data
    for (let userLoc in users) {
      if (
        users[userLoc].steamid == steamId &&
        users[userLoc].steamid != 'null'
      ) {
        console.log('Steam ID already in use.')
        res.send('Steam ID already in use.')
        return false
      }
    }
    user.steamid = steamId
    let options = {
      method: 'PUT',
      url: `http://localhost:8000/users/${discordId}&code=${code}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      form: user
    }

    request(options)
    console.log('Successful')
    res.send('Successful')
  })
}
