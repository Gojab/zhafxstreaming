import handler from './[action]';

export default async function subtitlesHandler(req: any, res: any) {
  if (req.query) {
    req.query.action = 'subtitles';
  } else {
    req.query = { action: 'subtitles' };
  }
  return handler(req, res);
}
