import handler from './[action]';

export default async function streamHandler(req: any, res: any) {
  if (req.query) {
    req.query.action = 'stream';
  } else {
    req.query = { action: 'stream' };
  }
  return handler(req, res);
}
