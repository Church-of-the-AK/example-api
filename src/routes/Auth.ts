import { Application } from 'express'
import { clientId, clientSecret, steamApiKey } from '../config/config'
import axios from 'axios'
import * as fs from 'fs'
import * as jwt from 'jsonwebtoken'
import { Strategy } from 'passport-openid'
import * as passport from 'passport'
import { getRepository } from 'typeorm'
import { User, UserLevel, UserBalance, UserLinks } from 'machobot-database'

const SteamStrategy = new Strategy(
  {
    providerURL: 'http://steamcommunity.com/openid',
    stateless: true,
    returnURL: 'http://macho.ga:8000/steamauth/return',
    realm: 'http://macho.ga:8000/'
  },
  (identifier, done) => {
    process.nextTick(function () {
      let user = {
        identifier: identifier,
        steamId: identifier.match(/\d+$/)[0],
        loginTime: new Date().getTime()
      }

      return done(null, user)
    })
  }
)

passport.use(SteamStrategy)
passport.serializeUser(function (user: any, done) {
  done(null, user.identifier)
})
passport.deserializeUser(function (identifier: any, done) {
  done(null, {
    identifier: identifier,
    steamId: identifier.match(/\d+$/)[0],
    loginTime: new Date().getTime()
  })
})

export function AuthRoutes (app: Application) {
  const userRepository = getRepository(User)
  app.use(passport.initialize())

  app.get('/discordauth', async (req, res) => {
    const redirect = req.query.redirect
    const code = req.query.code

    if (!redirect || !code) {
      console.log('Improper format.')
      return res.send('Improper format.')
    }

    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const { data: accessToken } = await axios.post(`https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${code}&redirect_uri=${redirect}`, null, {
      headers: {
        Authorization: `Basic ${creds}`
      }
    })
    const { data: discordUser } = await axios.get('https://discordapp.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken.access_token}` }
    })
    const apiUser = await userRepository.findOne(discordUser.id)

    if (!apiUser) {
      const avatarUrl = `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.webp?size=512`
      const user = new User()

      user.id = discordUser.id
      user.name = discordUser.username
      user.avatarUrl = avatarUrl
      user.banned = false
      user.accessToken = accessToken.access_token
      user.admin = false
      user.level = new UserLevel()
      user.balance = new UserBalance()
      user.links = new UserLinks()
      user.links.steamId = ''

      await userRepository.save(user)

      const apiCreds = {
        userId: discordUser.id,
        accessToken: accessToken.access_token
      }
      const privateRSA = fs.readFileSync('./src/config/id_rsa.pem')

      const token = jwt.sign(apiCreds, privateRSA, {
        expiresIn: '7d',
        algorithm: 'RS256'
      })

      return res.send([accessToken, { jwt: token }])
    }

    await userRepository.update({ id: discordUser.id }, { accessToken: accessToken.access_token })

    const apiCreds = {
      userId: discordUser.id,
      accessToken: accessToken.access_token
    }
    const privateRSA = fs.readFileSync('./src/config/id_rsa.pem')

    const token = jwt.sign(apiCreds, privateRSA, {
      expiresIn: '7d',
      algorithm: 'RS256'
    })

    return res.send([accessToken, { jwt: token }])
  })

  app.post('/steamauth',
    passport.authenticate('openid', {
      session: false
    })
  )

  app.get('/steamauth/return', passport.authenticate('openid'), async (req, res) => {
    if (req.user) {
      return res.redirect(`http://www.macho.ga/?steamid=${req.user.steamId}`)
    }

    res.send('Failed')
  })

  app.get('/steamauth/id/:id', async (req, res) => {
    const { data: { response: steamResponse } } = await axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${
      steamApiKey}&format=json&steamids=${req.params.id}`)
    const steamUser = steamResponse.players[0]

    res.send(steamUser)
  })

  app.get('/steamauth/ids/:ids', async (req, res) => {
    const { data: { response: steamResponse } } = await axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${
      steamApiKey}&format=json&steamids=${req.params.ids}`)
    const steamUser = steamResponse.players

    res.send(steamUser)
  })
}
