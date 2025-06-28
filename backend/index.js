const express = require('express');
const dotenv = require('dotenv');
const rateLimit = require("express-rate-limit");
const path = require("path");
const { summarize, answerQuestion } = require('./summarize');
const healthRoutes = require('./health');
const cors = require("cors");
dotenv.config();
const multer = require("multer");
const fs = require("fs");
const app = express();
app.set("trust proxy", 1);
const pdfParse = require("pdf-parse");
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "token"],
  credentials: true,
};
app.use(cors(corsOptions));
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, message: "Too many requests, please try again later." },
}); 

app.use(express.json());
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, "public")));
app.use(limiter);
app.use('/', healthRoutes);
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
const upload = multer({ dest: "uploads/" });
const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.status(200).render('index', { data: { status: 200 } });
});


app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        const filePath = path.join(__dirname, req.file.path);
        const fileType = req.file.mimetype;

        let text = "";

        if (fileType === "application/pdf") {
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            text = pdfData.text;
        } else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            const dataBuffer = fs.readFileSync(filePath);
            const result = await mammoth.extractRawText({ buffer: dataBuffer });
            text = result.value;
        } else if (fileType === "text/plain") {
            text = fs.readFileSync(filePath, "utf8");
        } else {
            return res.status(400).json({ message: "Unsupported file type" });
        }

        fs.unlinkSync(filePath);

        if (!text.trim()) return res.status(400).json({ message: "Failed to extract text" });

        res.status(200).json({ text });
    } catch (error) {
        res.status(500).json({ message: "Error processing file", error: error.message });
    }
});

app.post("/summarize", async (req, res) => {
    const { text, type } = req.body;
    if (!text || typeof text !== "string") {
        return res.status(400).json({ message: "Invalid text input" });
    }
    const response = await summarize(text, type);
    return res.status(response.status).json({ message: response.message });
});


app.post("/ask", async (req, res) => {
    const { question } = req.body;
    if (!question) return res.status(400).json({ message: "Invalid question input" });

    const response = await answerQuestion(question);
    return res.status(response.status).json(response);
});

app.listen(PORT, () => {
    console.log(`working on Port:${PORT}`);
});