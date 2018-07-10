import { clientId, clientSecret, steamApiKey } from '../../config/config'
import axios from 'axios'
import * as fs from 'fs'
import * as jwt from 'jsonwebtoken'
import { Strategy as OpenIDStrategy } from 'passport-openid'
import * as passport from 'passport'
import { Application } from '../../node_modules/@types/express';
import { Client } from '../../node_modules/@types/pg';

const SteamStrategy = new OpenIDStrategy(
  {
    providerURL: 'http://steamcommunity.com/openid',
    stateless: true,
    returnURL: 'http://macho.ga:8000/steamauth/return',
    realm: 'http://macho.ga:8000/'
  },
  function(identifier, done) {
    process.nextTick(function() {
      var user = {
        identifier: identifier,
        steamId: identifier.match(/\d+$/)[0],
        loginTime: new Date().getTime()
      }
      return done(null, user)
    })
  }
)

passport.use(SteamStrategy)
passport.serializeUser(function(user: any, done) {
  done(null, user.identifier)
})
passport.deserializeUser(function(identifier: any, done) {
  done(null, {
    identifier: identifier,
    steamId: identifier.match(/\d+$/)[0],
    loginTime: new Date().getTime()
  })
})

export function auth (app: Application, client: Client) {
  app.use(passport.initialize())

  app.get('/discordauth', async function discordAuth(req, res) {
    res.set('Access-Control-Allow-Origin', '*')
    const redirect = req.query.redirect
    const code = req.query.code
    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const accessToken = await axios.post(
      `https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${code}&redirect_uri=${redirect}`,
      null,
      { headers: { Authorization: `Basic ${creds}` } }
    )
    let discordUser = await axios.get('https://discordapp.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken.data.access_token}` }
    })
    let apiUser = await axios.get(
      `http://localhost:8000/users/${discordUser.data.id}`
    )
    if (apiUser.data == '' || apiUser.data == 'Error' || apiUser.data == '{}') {
      const avatarUrl = `https://cdn.discordapp.com/avatars/${
        discordUser.data.id
      }/${discordUser.data.avatar}.png?size=512`
      const text =
        'INSERT INTO users(id, name, avatarUrl, banned, dateCreated, dateLastMessage, steamId, level, balance, accesstoken) VALUES($1, $2, $3, $4, $5, $6, \
        $7, $8, $9, $10) RETURNING *'
      const values = [
        discordUser.data.id,
        discordUser.data.username,
        avatarUrl,
        false,
        new Date().getTime(),
        new Date().getTime(),
        null,
        { xp: 0, level: 0, timestamp: '' },
        { networth: 0, balance: 0, dateclaimeddailies: '' },
        accessToken.data.access_token
      ]
      client.query(text, values, function createUser(err, queryRes) {
        if (err) {
          console.log(err)
        } else {
          let apiCreds = {
            userId: discordUser.data.id,
            accessToken: accessToken.data.access_token
          }
          const privateRSA = fs.readFileSync('./config/id_rsa.pem')
          jwt.sign(
            apiCreds,
            privateRSA,
            { expiresIn: '7d', algorithm: 'RS256' },
            function sendJwt(err, token) {
              if (err) console.log(err)
              res.send([accessToken.data, { jwt: token }])
            }
          )
        }
      })
    } else {
      let changed
      const findUserRes = await client.query(
        `SELECT * FROM public.users WHERE id='${discordUser.data.id}'`
      )
      changed = findUserRes.rows[0]
      const text = `UPDATE public.users SET id=$1, name=$2, avatarUrl=$3, banned=$4, dateLastMessage=$5, steamId=$6, level=$7, balance=$8, accesstoken=$9 
        WHERE id='${discordUser.data.id}'`
      const values = [
        changed.id,
        changed.name,
        changed.avatarurl,
        changed.banned,
        changed.datelastmessage,
        changed.steamid,
        changed.level,
        changed.balance,
        accessToken.data.access_token
      ]
      client.query(text, values)
      let apiCreds = {
        userId: discordUser.data.id,
        accessToken: accessToken.data.access_token
      }
      const privateRSA = fs.readFileSync('./config/id_rsa.pem')
      jwt.sign(
        apiCreds,
        privateRSA,
        { expiresIn: '7d', algorithm: 'RS256' },
        function sendJwt(err, token) {
          if (err) console.log(err)
          res.send([accessToken.data, { jwt: token }])
        }
      )
    }
  })

  app.post(
    '/steamauth',
    passport.authenticate('openid', {
      session: false
    })
  )

  app.get('/steamauth/return', passport.authenticate('openid'), function(
    req,
    res
  ) {
    if (req.user) {
      res.redirect(`http://www.macho.ga/?steamid=${req.user.steamId}`)
    } else {
      res.send('Failed')
    }
  })

  app.get('/steamauth/id/:id', (req, res) => {
    res.set('Access-Control-Allow-Origin', '*')
    axios
      .get(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamApiKey}&format=json&steamids=${
          req.params.id
        }`
      )
      .then(steamResponse => {
        const steamUser = steamResponse.data.response.players[0]
        res.send(steamUser)
      })
  })

  app.get('/steamauth/ids/:ids', (req, res) => {
    res.set('Access-Control-Allow-Origin', '*')
    axios
      .get(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamApiKey}&format=json&steamids=${
          req.params.ids
        }`
      )
      .then(steamResponse => {
        const steamUser = steamResponse.data.response.players
        res.send(steamUser)
      })
  })
}
