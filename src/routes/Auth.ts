import { Application } from 'express'
import { discord, steamApiKey, github } from '../config/config'
import axios from 'axios'
import * as fs from 'fs'
import * as jwt from 'jsonwebtoken'
import { Strategy } from 'passport-openid'
import * as passport from 'passport'
import { getRepository } from 'typeorm'
import { User, UserLevel, UserBalance, UserLinks } from 'machobot-database'

const SteamStrategy = new Strategy(
  {
    providerURL: 'https://steamcommunity.com/openid',
    stateless: true,
    returnURL: 'https://www.macho.ninja:8000/api/steamauth/return',
    realm: 'https://www.macho.ninja:8000'
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

  app.get('/api/discordauth', async (req, res) => {
    const redirect = req.query.redirect
    const code = req.query.code

    if (!redirect || !code) {
      console.log('Improper format.')
      return res.send('Improper format.')
    }

    const creds = Buffer.from(`${discord.clientId}:${discord.clientSecret}`).toString('base64')
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

      await userRepository.save(user)

      const apiCreds = {
        userId: discordUser.id,
        accessToken: accessToken.access_token
      }
      const privateRsa = fs.readFileSync('./src/config/id_rsa.pem')

      const token = jwt.sign(apiCreds, privateRsa, {
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
    const privateRsa = fs.readFileSync('./src/config/id_rsa.pem')

    const token = jwt.sign(apiCreds, privateRsa, {
      expiresIn: '7d',
      algorithm: 'RS256'
    })

    return res.send([accessToken, { jwt: token }])
  })

  app.post('/api/steamauth',
    passport.authenticate('openid', {
      session: false
    })
  )

  app.get('/api/steamauth/return', passport.authenticate('openid'), async (req, res) => {
    if (req.user) {
      return res.redirect(`https://www.macho.ninja/?steamid=${req.user.steamId}`)
    }

    res.send('Failed')
  })

  app.get('/api/steamauth/id/:id', async (req, res) => {
    const { data: { response: { players: steamUser } } } = await axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${
      steamApiKey}&format=json&steamids=${req.params.id}`)

    res.send(steamUser[0])
  })

  app.get('/api/steamauth/ids/:ids', async (req, res) => {
    const { data: { response: { players: steamUsers } } } = await axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${
      steamApiKey}&format=json&steamids=${req.params.ids}`)

    res.send(steamUsers)
  })

  app.get('/api/githubauth/access_token', async (req, res) => {
    const code = req.query.code
    const post = {
      client_id: github.clientId,
      client_secret: github.clientSecret,
      redirect_uri: github.redirect,
      code
    }
    const { data: response } = await axios.post('https://github.com/login/oauth/access_token', post, { headers: { Accept: 'application/json' } })

    if (!response.access_token) {
      console.log(response)
      return res.send('Error')
    }

    res.redirect(`https://www.macho.ninja/?githubId=${response.access_token}`)
  })
}
