import { Application } from 'express'
import { getRepository } from 'typeorm'
import { Guild, GuildSettings, GuildTag } from 'machobot-database'
import * as config from '../config/config'

export async function GuildRoutes (app: Application) {
  const guildRepository = getRepository(Guild)
  const guildSettingsRepository = getRepository(GuildSettings)
  const guildTagsRepository = getRepository(GuildTag)

  app.get('/api/guilds', async (req, res) => {
    const guilds = await guildRepository.find()

    res.send(guilds)
  })

  app.get('/api/guilds/:id', async (req, res) => {
    const guild = await guildRepository.findOne(req.params.id, { relations: [ 'settings' ] })
    res.send(guild)
  })

  app.get('/api/guilds/:id/settings', async (req, res) => {
    const guild = await guildRepository.findOne(req.params.id, { relations: [ 'settings' ] })

    if (!guild) {
      return res.send('')
    }

    res.send(guild.settings)
  })

  app.get('/api/guilds/:id/tags', async (req, res) => {
    const guild = await guildRepository.findOne(req.params.id, { relations: [ 'tags' ] })

    if (!guild) {
      return res.send('')
    }

    res.send(guild.tags)
  })

  app.get('/api/guilds/:id/tags/:tagId', async (req, res) => {
    const guild = await guildRepository.findOne(req.params.id, { relations: [ 'tags' ] })

    if (!guild) {
      return res.send('')
    }

    const tag = guild.tags.find(tag => tag.id === Number(req.params.id))

    res.send(tag ? tag : '')
  })

  app.post('/api/guilds&code=:code', async (req, res) => {
    const code = req.params.code
    const guildReq = req.body

    if (code !== config.code) {
      res.statusCode = 401
      return res.send({ code: 401, message: 'invalid code' })
    }

    const guild = new Guild(guildReq)
    guild.settings = new GuildSettings()

    const response = await guildRepository.save(guild).catch(error => {
      console.log(error)
      return error
    })

    res.statusCode = 201
    res.send(response)
  })

  app.put('/api/guilds/:id&code=:code', async (req, res) => {
    const code = req.params.code
    const guild: Guild = req.body

    if (code !== config.code) {
      res.statusCode = 401
      return res.send({ code: 401, message: 'invalid code' })
    }

    const response = await guildRepository.save(guild).catch(error => {
      console.log(error)
      return error
    })

    res.send(response)
  })

  app.delete('/api/guilds/:id&code=:code', async (req, res) => {
    const code = req.params.code

    if (code !== config.code) {
      res.statusCode = 401
      return res.send({ code: 401, message: 'invalid code' })
    }

    const responses: any[] = []

    const guild = await guildRepository.findOne(req.params.id, { relations: [ 'settings' ] }).catch(error => {
      console.log(error)
      responses.push(error)
    })

    if (!guild) {
      return res.send(responses[0])
    }

    await guildRepository.delete({ id: guild.id }).catch(error => {
      console.log(error)
      responses.push(error)
    })

    await guildSettingsRepository.delete({ id: guild.settings.id }).catch(error => {
      console.log(error)
      responses.push(error)
    })

    res.send(responses)
  })

  app.put('/api/guilds/:id/settings&code=:code', async (req, res) => {
    const code = req.params.code
    const settings: GuildSettings = req.body

    if (code !== config.code) {
      res.statusCode = 401
      return res.send({ code: 401, message: 'invalid code' })
    }

    const response = await guildSettingsRepository.save(settings).catch(error => {
      console.log(error)
      return error
    })

    res.send(response)
  })

  app.put('/api/guilds/:id/tags&code=:code', async (req, res) => {
    const code = req.params.code
    const tag: GuildTag = req.body

    if (code !== config.code) {
      res.statusCode = 401
      return res.send({ code: 401, message: 'invalid code' })
    }

    const guild = await guildRepository.findOne(req.params.id, { relations: [ 'tags' ] })

    if (!guild) {
      return res.send('')
    }

    const existing = guild.tags.find(tag1 => tag1.name === tag.name)

    if (existing) {
      existing.content = tag.content

      const response = await guildTagsRepository.save(existing).catch(error => {
        console.log(error)
        return error
      })

      return res.send(response)
    }

    guild.tags.push(tag)

    const response = await guildRepository.save(guild).catch(error => {
      console.log(error)
      return error
    })

    res.send(response)
  })

  app.delete('/api/guilds/:id/tags/:tagId&code=:code', async (req, res) => {
    const code = req.params.code

    if (code !== config.code) {
      res.statusCode = 401
      return res.send({ code: 401, message: 'invalid code' })
    }

    const guild = await guildRepository.findOne(req.params.id, { relations: [ 'tags' ] })

    if (!guild) {
      return res.send('')
    }

    const tag = guild.tags.find(tag => tag.id === Number(req.params.id))
    const response = await guildTagsRepository.remove(tag).catch(error => {
      console.log(error)
      return error
    })

    res.send(response)
  })
}
