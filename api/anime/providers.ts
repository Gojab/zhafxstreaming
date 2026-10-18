import handler from './[action]';

export default async function providersHandler(req: any, res: any) {
  if (req.query) {
    req.query.action = 'providers';
  } else {
    req.query = { action: 'providers' };
  }
  return handler(req, res);
}
