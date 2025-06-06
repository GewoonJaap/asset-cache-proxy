import { Hono } from 'hono'
import { GeminiApiRoute } from './routes/geminiApiRoute';
import { ReplicateApiRoute } from './routes/replicateApiRoute'

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get('/', (c) => {
  return c.text('Hello Hono!')
});

app.route('/api/gemini', GeminiApiRoute);
app.route('/api/replicate', ReplicateApiRoute)

app.notFound((c) => c.text("Not found", 404));

export default app
