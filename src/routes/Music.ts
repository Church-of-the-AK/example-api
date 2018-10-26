import { Application } from 'express'
import { getRepository } from 'typeorm'
import { MusicPlaylist, MusicSong } from 'machobot-database'
import * as config from '../config/config'

export async function MusicRoutes (app: Application) {
  const playlistRepository = getRepository(MusicPlaylist)
  const songRepository = getRepository(MusicSong)

  app.get('/api/music', async (req, res) => {
    const music = await playlistRepository.find()

    res.send(music)
  })

  app.get('/api/music/song/:id', async (req, res) => {
    const song = await songRepository.findOne(req.params.id)
    res.send(song)
  })

  app.get('/api/music/playlist/:id', async (req, res) => {
    const playlist = await playlistRepository.findOne(req.params.id, { relations: [ 'songs' ] })
    res.send(playlist)
  })

  app.post('/api/music/song&code=:code', async (req, res) => {
    const code = req.params.code
    const songReq = req.body

    if (code !== config.code) {
      res.statusCode = 401
      return res.send({ code: 401, message: 'invalid code' })
    }

    const song = new MusicSong(songReq)
    const response = await songRepository.save(song).catch(error => {
      console.log(error)
      return error
    })

    res.statusCode = 201
    res.send(response)
  })

  app.post('/api/music/playlist&code=:code', async (req, res) => {
    const code = req.params.code
    const playlistReq = req.body

    if (code !== config.code) {
      res.statusCode = 401
      return res.send({ code: 401, message: 'invalid code' })
    }

    const playlist = new MusicPlaylist(playlistReq)
    const alreadyExists = await playlistRepository.createQueryBuilder()
      .where('user.id = :userId', { userId: playlist.user.id })
      .andWhere('LOWER(name) = LOWER(:name)', { name: playlist.name }).getOne()

    if (alreadyExists) {
      return res.send({ error: 'already_exists' })
    }

    const response = await playlistRepository.save(playlist).catch(error => {
      console.log(error)
      return error
    })

    res.statusCode = 201
    res.send(response)
  })

  app.put('/api/music/song/:id&code=:code', async (req, res) => {
    const code = req.params.code
    const song: MusicSong = req.body

    if (code !== config.code) {
      res.statusCode = 401
      return res.send({ code: 401, message: 'invalid code' })
    }

    const response = await songRepository.save(song).catch(error => {
      console.log(error)
      return error
    })

    res.send(response)
  })

  app.put('/api/music/playlist/:id&code=:code', async (req, res) => {
    const code = req.params.code
    const playlist: MusicPlaylist = req.body

    if (code !== config.code) {
      res.statusCode = 401
      return res.send({ code: 401, message: 'invalid code' })
    }

    const response = await playlistRepository.save(playlist).catch(error => {
      console.log(error)
      return error
    })

    res.send(response)
  })

  app.delete('/api/music/song/:id&code=:code', async (req, res) => {
    const code = req.params.code

    if (code !== config.code) {
      res.statusCode = 401
      return res.send({ code: 401, message: 'invalid code' })
    }

    const responses: any[] = []

    responses.push(await songRepository.delete({ id: req.params.id }).catch(error => {
      console.log(error)
      return error
    }))

    res.send(responses)
  })

  app.delete('/api/music/playlist/:id&code=:code', async (req, res) => {
    const code = req.params.code

    if (code !== config.code) {
      res.statusCode = 401
      return res.send({ code: 401, message: 'invalid code' })
    }

    const responses: any[] = []

    responses.push(await playlistRepository.delete({ id: req.params.id }).catch(error => {
      console.log(error)
      return error
    }))

    res.send(responses)
  })

  app.put('/api/music/playlist/:id/songs/add&code=:code', async (req, res) => {
    const code = req.params.code
    const song: MusicSong = req.body

    if (code !== config.code) {
      res.statusCode = 401
      return res.send({ code: 401, message: 'invalid code' })
    }

    const responses: any[] = []

    const playlist = await playlistRepository.findOne(req.params.id, { relations: [ 'songs' ] })

    if (!playlist) {
      res.statusCode = 404
      return res.send({ code: 404, message: 'playlist_not_found' })
    }

    if (playlist.songs.find(song1 => song1.id === song.id)) {
      res.statusCode = 409
      return res.send({ code: 409, message: 'playlist_contains_song' })
    }

    playlist.songs.push(song)
    await playlistRepository.save(playlist).catch(error => {
      console.log(error)
      responses.push(error)
    })

    responses.push(await songRepository.save(song).catch(error => {
      console.log(error)
      return error
    }))

    res.send(responses)
  })
}
