import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MOVIE_SERVERS,
  TV_SERVERS,
  ANIME_SERVERS,
  getServersForMediaType,
  selectPrimaryUpstreamProvider,
  normalizeMovieTvStreamProvider,
  resolveAnimeProvider,
  buildFrameXEmbedUrl,
  getSafeOrigin,
} from './servers';

test('each media type keeps only the primary server with no backup servers', () => {
  assert.equal(MOVIE_SERVERS.length, 1);
  assert.equal(TV_SERVERS.length, 1);
  assert.equal(ANIME_SERVERS.length, 1);
  assert.equal(getServersForMediaType('movie')[0].id, 'zhafx-movie');
  assert.equal(getServersForMediaType('tv')[0].id, 'zhafx-tv');
  assert.equal(getServersForMediaType('anime')[0].id, 'zhafx-anime');
});

test('selectPrimaryUpstreamProvider filters out down/unavailable providers and backup lists', () => {
  const upstream = [
    { id: 'miner', name: 'Miner XIX', status: 'down' },
    { id: 'headhunter', name: 'Headhunter XXXI', status: 'available' },
    { id: 'bowler', name: 'Bowler XVIII', tagline: 'Multi-Language', status: 'available' },
    { id: 'giant', name: 'Giant XI', tagline: 'Multi-Audio Direct Stream', status: 'available' },
  ];
  const movieSelected = selectPrimaryUpstreamProvider(upstream, 'movie');
  assert.equal(movieSelected.length, 1);
  assert.equal(movieSelected[0].id, 'giant');
  assert.equal(movieSelected[0].name, 'ZHAFX');

  const animeSelected = selectPrimaryUpstreamProvider(
    [
      { id: 'archer', name: 'Archer IV', audio: 'sub', status: 'active' },
      { id: 'grand_warden', name: 'Grand Warden XI', tagline: '1080p', audio: 'sub', status: 'active' },
    ],
    'anime'
  );
  assert.equal(animeSelected.length, 1);
  assert.equal(animeSelected[0].id, 'grand_warden');
});

test('normalizeMovieTvStreamProvider strips legacy/down/invalid provider IDs', () => {
  assert.equal(normalizeMovieTvStreamProvider('framex'), undefined);
  assert.equal(normalizeMovieTvStreamProvider('miner'), undefined);
  assert.equal(normalizeMovieTvStreamProvider('auto'), undefined);
  assert.equal(normalizeMovieTvStreamProvider(''), undefined);
  assert.equal(normalizeMovieTvStreamProvider('giant'), 'giant');
  assert.equal(normalizeMovieTvStreamProvider('bowler'), 'bowler');
});

test('resolveAnimeProvider resolves legacy framex and switches sub/dub correctly', () => {
  assert.equal(resolveAnimeProvider('framex', 'sub'), 'grand_warden');
  assert.equal(resolveAnimeProvider('framex', 'dub'), 'grand_warden_dub');
  assert.equal(resolveAnimeProvider('wizard', 'dub'), 'wizard_dub');
  assert.equal(resolveAnimeProvider('archer', 'sub'), 'grand_warden');
});

test('buildFrameXEmbedUrl omits invalid framex provider for movie/tv and resolves anime audio', () => {
  const movieUrl = new URL(
    buildFrameXEmbedUrl({ type: 'movie', id: '550', provider: 'framex', title: 'Fight Club' })
  );
  assert.equal(movieUrl.pathname, '/embed/movie/550');
  assert.equal(movieUrl.searchParams.get('provider'), null);
  assert.equal(movieUrl.searchParams.get('no_ads'), '1');

  const tvUrl = new URL(
    buildFrameXEmbedUrl({ type: 'tv', id: '1396', season: 2, episode: 3, provider: 'auto' })
  );
  assert.equal(tvUrl.pathname, '/embed/tv/1396/2/3');
  assert.equal(tvUrl.searchParams.get('provider'), null);

  const animeDubUrl = new URL(
    buildFrameXEmbedUrl({ type: 'anime', id: '21', episode: 5, provider: 'framex', audio: 'dub' })
  );
  assert.equal(animeDubUrl.pathname, '/embed/anime');
  assert.equal(animeDubUrl.searchParams.get('provider'), 'grand_warden_dub');
  assert.equal(animeDubUrl.searchParams.get('audio'), 'dub');
});

test('getSafeOrigin safely handles malformed referer strings', () => {
  assert.equal(getSafeOrigin('https://megaplay.buzz/embed'), 'https://megaplay.buzz');
  assert.equal(getSafeOrigin('not-a-valid-url', 'https://megaplay.buzz'), 'https://megaplay.buzz');
  assert.equal(getSafeOrigin('', 'https://framextv.cc'), 'https://framextv.cc');
});
