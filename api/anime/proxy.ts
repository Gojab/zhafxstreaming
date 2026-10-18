import handler from './[action]';

export default async function proxyHandler(req: any, res: any) {
  if (req.query) {
    req.query.action = 'proxy';
  } else {
    req.query = { action: 'proxy' };
  }
  return handler(req, res);
}
