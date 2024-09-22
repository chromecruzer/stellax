import dotenv from 'dotenv';
//import util from 'util'
//const dump = (obj, depth = null) => util.inspect(obj, { depth, colors: true });

// Load environment variables from .env file
dotenv.config();
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { GoogleGenerativeAI } from '@google/generative-ai'
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const port: any = process.env.PORT || 3000

const app = new Hono()
app.use(logger())

// Load the AI model (Gemini 1.5 Flash)
const loadModel = async () => {
  return await genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

app.get('/healthz', (c) => {
  return c.json({ msg: "server is Healthy" }, 203)
})

// POST route to handle prompt submission
app.post('/generate', async (c) => {
  try {
    // Parse the incoming JSON request body
    const { prompt } = await c.req.json();

    // Check if prompt exists
    if (!prompt) {
      return c.json({ error: "No prompt provided!" }, 400)
    }

    // Load model and generate response
    const model = await loadModel();
    const response = await model.generateContent(prompt);
    // Extract the generated text
    // Extract the generated text
    // Extract the generated text safely
    const generatedText = response.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    // Check if generated text is available
    if (!generatedText) {
      return c.json({ error: "No content generated!" }, 500);
    }

    // Clean and format the generated text
    const formattedText = generatedText.replace(/\n+/g, '\n').trim();





    // Return the response in pretty JSON format
    //console.log(dump(formattedText))
    return c.json(formattedText, 200)

  } catch (error) {
    console.error('Error:', error);
    return c.json({ error: 'Something went wrong!' }, 500)
  }
})



console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})

