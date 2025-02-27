// import dotenv from "dotenv";
// //import util from 'util'
// //const dump = (obj, depth = null) => util.inspect(obj, { depth, colors: true });

// // Load environment variables from .env file
// dotenv.config();
// import { serve } from "@hono/node-server";
// import { Hono } from "hono";
// import { logger } from "hono/logger";
// import { GoogleGenerativeAI } from "@google/generative-ai";
// const genAI = new GoogleGenerativeAI(process.env.API_KEY);
// const port: any = process.env.PORT || 3000;

// const app = new Hono();
// app.use(logger());

// // Load the AI model (Gemini 1.5 Flash)
// const loadModel = async () => {
//   // return await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); or "gemini-1.5-flash-" >> most advanced model
//   return await genAI.getGenerativeModel({ model: "gemini-1.0-pro" });  // deprecated model
// };

// app.get("/healthz", (c) => {
//   return c.json({ msg: "server is Healthy" }, 203);
// });

// // POST route to handle prompt submission
// // app.post('/generate', async (c) => {
// //   try {
// //     // Parse the incoming JSON request body
// //     const { prompt } = await c.req.json();

// //     // Check if prompt exists
// //     if (!prompt) {
// //       return c.json({ error: "No prompt provided!" }, 400)
// //     }

// //     // Load model and generate response
// //     const model = await loadModel();
// //     const response = await model.generateContent(prompt);
// //     // Extract the generated text
// //     // Extract the generated text
// //     // Extract the generated text safely
// //     const generatedText = response.response?.candidates?.[0]?.content?.parts?.[0]?.text;
// //     // Check if generated text is available
// //     if (!generatedText) {
// //       return c.json({ error: "No content generated!" }, 500);
// //     }

// //     // Clean and format the generated text
// //     const formattedText = generatedText.replace(/\n+/g, '\n').trim();

// //     // Return the response in pretty JSON format
// //     //console.log(dump(formattedText))
// //     return c.json(formattedText, 200)

// //   } catch (error) {
// //     console.error('Error:', error);
// //     return c.json({ error: 'Something went wrong!' }, 500)
// //   }
// // })

// //////////////// formatted response via text/plain
// app.post("/generate", async (c) => {
//   try {
//     // Parse the incoming JSON request body
//     const { prompt } = await c.req.json();

//     // Check if prompt exists
//     if (!prompt) {
//       return c.json({ error: "No prompt provided!" }, 400);
//     }

//     // Load model and generate response
//     const model = await loadModel();
//     const response = await model.generateContent(prompt);

//     // Extract the generated text safely
//     const generatedText = response.response?.candidates?.[0]?.content?.parts
//       ?.[0]?.text;

//     // Check if generated text is available
//     if (!generatedText) {
//       return c.json({ error: "No content generated!" }, 500);
//     }

//     // Clean and format the generated text for CLI output
//     let formattedText = generatedText
//       .replace(/```(javascript|js|jsx|tsx|python|html|java|ts)?/g, "") // Remove Markdown block markers for all languages
//       .replace(/[*_`~]/g, "") // Remove common Markdown symbols
//       .replace(/\\n/g, "\n") // Replace escaped newline characters with actual newlines
//       .replace(/&lt;/g, "<").replace(/&gt;/g, ">") // Handle HTML entity codes
//       .trim();

//     // Return the formatted response as plain text
//     return c.text(formattedText, 200); // Send plain text response instead of JSON
//   } catch (error) {
//     console.error("Error:", error);
//     return c.json({ error: "Something went wrong!" }, 500);
//   }
// });

// //

// console.log(`Server is running on port ${port}`);

// serve({
//   fetch: app.fetch,
//   port,
// });

//////////////////

import dotenv from "dotenv";
dotenv.config();
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { compress } from "hono/compress";
import { logger } from "hono/logger";
import { GoogleGenerativeAI } from "@google/generative-ai";
import nodemailer from "nodemailer";

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const port: any = process.env.PORT || 3000;

const app = new Hono();
app.use(logger());
app.use(compress());

// In-memory store for request logs
let requestLogs: Array<{ timestamp: string; endpoint: string; data: object }> =
  [];

// Function to log request details
const logRequest = (endpoint: string, data: object) => {
  requestLogs.push({
    timestamp: new Date().toISOString(),
    endpoint,
    data,
  });
};

// Configure NodeMailer transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS, // Your email password or app-specific password
  },
});

// Function to send consolidated email periodically
const sendConsolidatedEmail = async () => {
  if (requestLogs.length === 0) {
    console.log("No logs to send in this batch.");
    return;
  }

  const mailOptions = {
    from: `"Stellax Server Logs" <${process.env.EMAIL_USER}>`,
    to: process.env.NOTIFY_EMAIL,
    subject: `Stellax Server Logs [${new Date().toLocaleString()}]`,
    text: `Here are the recent request logs:\n\n${
      requestLogs
        .map(
          (log) =>
            `Timestamp: ${log.timestamp}\nEndpoint: ${log.endpoint}\nData: ${
              JSON.stringify(
                log.data,
                null,
                2,
              )
            }\n---`,
        )
        .join("\n\n")
    }`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Consolidated email sent successfully.");
    requestLogs = []; // Clear logs after sending
  } catch (error) {
    console.error("Error sending consolidated email:", error);
  }
};

// Set a timer to send emails every 5 minutes
setInterval(sendConsolidatedEmail, 12 * 60 * 1000); // 12 minutes in milliseconds

// Load the AI models
const loadModel = async (modelName: string) => {
  return await genAI.getGenerativeModel({ model: modelName });
};

// Health check endpoint
app.get("/healthz", async (c) => {
  logRequest("/healthz", {});
  return c.json({ msg: "server is Healthy" }, 203);
});

// Generate endpoint with "gemini-1.0-pro"
app.post("/generate", async (c) => {
  try {
    const { prompt } = await c.req.json();
    if (!prompt) {
      return c.json({ error: "No prompt provided!" }, 400);
    }

   // const model = await loadModel("gemini-1.5-flash");
    const model = await loadModel("gemini-2.0-flash");
    const response = await model.generateContent(prompt);
    const generatedText = response.response?.candidates?.[0]?.content?.parts
      ?.[0]?.text;

    if (!generatedText) {
      return c.json({ error: "No content generated!" }, 500);
    }

    const formattedText = generatedText
      .replace(/```(javascript|js|jsx|tsx|python|html|java|ts)?/g, "")
      .replace(/[*_`~]/g, "")
      .replace(/\\n/g, "\n")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .trim();

    logRequest("/generate", { prompt });
    return c.text(formattedText, 200);
  } catch (error) {
    console.error("Error:", error);
    return c.json({ error: "Something went wrong!" }, 500);
  }
});

// Generate2 endpoint with "gemini-1.5-flash"
app.post("/generate2", async (c) => {
  try {
    const { prompt } = await c.req.json();
    if (!prompt) {
      return c.json({ error: "No prompt provided!" }, 400);
    }

    const model = await loadModel("gemini-2.0-pro-exp-02-05");
    const response = await model.generateContent(prompt);
    const generatedText = response.response?.candidates?.[0]?.content?.parts
      ?.[0]?.text;

    if (!generatedText) {
      return c.json({ error: "No content generated!" }, 500);
    }

    const formattedText = generatedText
      .replace(/```(javascript|js|jsx|tsx|python|html|java|ts)?/g, "")
      .replace(/[*_`~]/g, "")
      .replace(/\\n/g, "\n")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .trim();

    logRequest("/generate2", { prompt });
    return c.text(formattedText, 200);
  } catch (error) {
    console.error("Error:", error);
    return c.json({ error: "Something went wrong!" }, 500);
  }
});

console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
