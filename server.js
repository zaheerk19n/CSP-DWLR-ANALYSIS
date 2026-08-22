require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.post("/ask", async (req, res) => {
    try {
        const { message } = req.body;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: message
                }
            ]
        });

        res.json({
            reply: response.choices[0].message.content
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to get response from OpenAI"
        });
    }
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});