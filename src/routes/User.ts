import { Application } from 'express'
import { getRepository } from 'typeorm'
import { User, UserLevel, UserBalance, UserLinks } from 'machobot-database'
import * as config from '../config/config'
import * as fs from 'fs'
import * as jwt from 'jsonwebtoken'

export async function UserRoutes (app: Application) {
  const userRepository = getRepository(User)
  const userLevelRepository = getRepository(UserLevel)
  const userBalanceRepository = getRepository(UserBalance)
  const userLinksRepository = getRepository(UserLinks)

  app.get('/users', async (req, res) => {
    const users = await userRepository.find()

    res.send(users)
  })

  app.get('/users/:id', async (req, res) => {
    const user = await userRepository.findOne(req.params.id, { relations: [ 'balance', 'level', 'links' ] })

    res.send(user)
  })

  app.get('/users/:id/level', async (req, res) => {
    const user = await userRepository.findOne(req.params.id, { relations: [ 'level' ] })

    if (!user) {
      return res.send('')
    }

    res.send(user.level)
  })

  app.get('/users/:id/balance', async (req, res) => {
    const user = await userRepository.findOne(req.params.id, { relations: [ 'balance' ] })

    if (!user) {
      return res.send('')
    }

    res.send(user.balance)
  })

  app.get('/users/:id/links', async (req, res) => {
    const user = await userRepository.findOne(req.params.id, { relations: [ 'links' ] })

    if (!user) {
      return res.send('')
    }

    res.send(user.links)
  })

  app.post('/users&code=:code', async (req, res) => {
    const code = req.params.code
    const userReq = req.body

    if (code !== config.code) {
      res.statusCode = 401
      return res.send({ code: 401, message: 'invalid code' })
    }

    const user = new User(userReq)

    user.level = new UserLevel()
    user.balance = new UserBalance()
    user.links = new UserLinks()

    user.links.steamId = ''

    const response = await userRepository.save(user).catch(error => {
      return error
    })

    res.statusCode = 201
    res.send(response)
  })

  app.put('/users/:id&code=:code', async (req, res) => {
    const code = req.params.code
    const user = req.body

    if (code !== config.code) {
      res.statusCode = 401
      return res.send({ code: 401, message: 'invalid code' })
    }

    let responses: any[] = []

    await userRepository.update(req.params.id, user).catch(error => {
      responses.push(error)
    })

    if (user.balance) {
      responses.push(await userBalanceRepository.update(req.params.id, user.balance).catch(error => {
        return error
      }))
    }

    if (user.level) {
      responses.push(await userLevelRepository.update(req.params.id, user.level).catch(error => {
        return error
      }))
    }

    if (user.links) {
      responses.push(await userLinksRepository.update(req.params.id, user.links).catch(error => {
        return error
      }))
    }

    res.send(responses)
  })

  app.delete('/users/:id&code=:code', async (req, res) => {
    const code = req.params.code

    if (code !== config.code) {
      res.statusCode = 401
      return res.send({ code: 401, message: 'invalid code' })
    }

    let responses: any[] = []

    const user = await userRepository.findOne(req.params.id, { relations: [ 'balance', 'level', 'links' ] }).catch(error => {
      responses.push(error)
    })

    if (!user) {
      return res.send(responses[0])
    }

    await userRepository.delete({ id: user.id }).catch(error => {
      responses.push(error)
    })

    await userBalanceRepository.delete({ id: user.balance.id }).catch(error => {
      responses.push(error)
    })
    await userLevelRepository.delete({ id: user.level.id }).catch(error => {
      responses.push(error)
    })
    await userLinksRepository.delete({ id: user.links.id }).catch(error => {
      responses.push(error)
    })

    res.send(responses)
  })

  app.put('/users/:id/balance&code=:code', async (req, res) => {
    const code = req.params.code
    const balance = req.body

    if (code !== config.code) {
      res.statusCode = 401
      return res.send({ code: 401, message: 'invalid code' })
    }

    const old = (await userRepository.findOne(req.params.id, { relations: [ 'balance' ] })).balance
    balance.user = old.user
    balance.id = old.id

    const response = await userBalanceRepository.save(balance).catch(error => {
      return error
    })

    res.send(response)
  })

  app.put('/users/:id/level&code=:code', async (req, res) => {
    const code = req.params.code
    const level = req.body

    if (code !== config.code) {
      res.statusCode = 401
      return res.send({ code: 401, message: 'invalid code' })
    }

    const old = (await userRepository.findOne(req.params.id, { relations: [ 'level' ] })).level
    level.user = old.user
    level.id = old.id

    const response = await userLevelRepository.save(level).catch(error => {
      return error
    })

    res.send(response)
  })

  app.put('/users/:id/links&code=:code', async (req, res) => {
    const code = req.params.code
    const links = req.body

    if (code !== config.code) {
      res.statusCode = 401
      return res.send({ code: 401, message: 'invalid code' })
    }

    const old = (await userRepository.findOne(req.params.id, { relations: [ 'links' ] })).links
    links.user = old.user
    links.id = old.id

    const response = await userLinksRepository.save(links).catch(error => {
      return error
    })

    res.send(response)
  })

  app.post('/steamauth/link', async (req, res) => {
    const steamId = req.query.steamId
    const discordId = req.query.discordId
    const apiToken = req.query.jwt
    const publicRSA = await fs.readFileSync('./src/config/id_rsa.pub.pem')
    let decodedApiToken

    try {
      decodedApiToken = jwt.verify(apiToken, publicRSA)
    } catch (err) {
      console.log('Invalid JWT.')
      return res.send('Invalid JWT.')
    }

    if (decodedApiToken.userId !== discordId) {
      console.log(
        `Tried to link to another Discord account.\nDifference: ${decodedApiToken.userId} (length of ${
          decodedApiToken.userId.length}) != ${discordId} (length of ${discordId.length})`
      )
      return res.send('Invalid JWT.')
    }

    const user = await userRepository.findOne(discordId, { relations: [ 'links' ], select: [ 'accessToken', 'links' ] })

    if (!user) {
      console.log('User doesn\'t exist.')
      return res.send('User doesn\'t exist.')
    }

    const accessToken = user.accessToken

    if (decodedApiToken.accessToken !== accessToken) {
      console.log(`Access Token was incorrect\n${decodedApiToken.accessToken} !== ${accessToken}`)
      return res.send('Invalid JWT.')
    }

    const same = await userRepository.findOne({ where: { links: { steamId } } })

    if (same) {
      console.log('Account already linked.')
      return res.send('Account is already linked.')
    }

    user.links.steamId = steamId
    await userLinksRepository.save(user.links)

    console.log('Successful')
    return res.send('Successful')
  })
}
