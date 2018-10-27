import { Application } from 'express'
import { getRepository } from 'typeorm'
import { User, MusicPlaylist, Guild } from 'machobot-database'

export async function SearchRoutes (app: Application) {
  const userRepository = getRepository(User)
  const playlistRepository = getRepository(MusicPlaylist)
  const guildRepository = getRepository(Guild)

  app.get('/api/search/users', async (req, res) => {
    const query: string = req.query.query

    if (!query) {
      return res.send({ success: false, error: 'no_query' })
    }

    const users = await userRepository.createQueryBuilder()
      .where('LOWER(name) LIKE LOWER(:query)', { query: `%${query}%` })
      .getMany()

    return res.send(users)
  })

  app.get('/api/search/playlists', async (req, res) => {
    const query: string = req.query.query
    const userId: string = req.query.userId

    if (!query) {
      return res.send({ success: false, error: 'no_query' })
    }

    if (!userId) {
      return res.send({ success: false, error: 'no_userId' })
    }

    const playlists = (await userRepository.findOne(userId, { relations: [ 'playlists' ] })).playlists
    const playlist1 = playlists.find(playlist => playlist.name.toLowerCase() === query.toLowerCase())

    if (!playlist1) {
      return res.send('')
    }

    const playlist = await playlistRepository.findOne(playlist1.id, { relations: [ 'songs' ] })

    return res.send(playlist)
  })

  app.get('/api/search/tags', async (req, res) => {
    const query: string = req.query.query
    const guildId: string = req.query.guildId

    if (!query) {
      return res.send({ success: false, error: 'no_query' })
    }

    if (!guildId) {
      return res.send({ success: false, error: 'no_guildId' })
    }

    const tags = (await guildRepository.findOne(guildId, { relations: [ 'tags' ] })).tags
    const tag = tags.find(tag => tag.name.toLowerCase() === query.toLowerCase())

    if (!tag) {
      return res.send('')
    }

    return res.send(tag)
  })
}
