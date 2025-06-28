import { useState } from "react";
import axios from "axios";

function App() {
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summaryType, setSummaryType] = useState("short");
  const [question, setQuestion] = useState("");
  const [fileSelected, setFileSelected] = useState(false);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setFileSelected(true);
  };

  const formatAnswer = (answer) => {
    return answer
      .replace(/```([\s\S]*?)```/g, '<pre style="background-color: #1E293B; color: #10B981; padding: 10px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap;"><code>$1</code></pre>')
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/_(.*?)_/g, '<i>$1</i>')
      .replace(/__(.*?)__/g, '<u>$1</u>');
  };

  const uploadAndSummarizeFile = async () => {
    if (!file) {
      alert("Please select a file first");
      return;
    }

    setLoading(true);
    setError(null);
    setSummary("Processing...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://localhost:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      const extractedText = response.data.text;
      setSummary("Summarizing...");
      
      const summaryResponse = await axios.post("http://localhost:5000/summarize", {
        text: extractedText,
        type: summaryType,
      });
      setSummary(summaryResponse.data.message);
    } catch (error) {
      setError("Failed to upload file and summarize text");
    } finally {
      setLoading(false);
    }
  };

  const askQuestion = async () => {
    if (!question.trim()) return;

    setChat([...chat, { question, answer: "Thinking..." }]);

    try {
      const response = await axios.post("http://localhost:5000/ask", {
        question,
        context: summary,
      });
      setChat([...chat, { question, answer: formatAnswer(response.data.answer) }]);
    } catch {
      setChat([...chat, { question, answer: "Failed to get an answer" }]);
    }
    setQuestion("");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#000", color: "white", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "16px" }}>File Summarizer & QA</h1>
      <label style={{ backgroundColor: "#2563EB", padding: "12px", borderRadius: "8px", cursor: "pointer", marginBottom: "16px", width: "80%", maxWidth: "300px", textAlign: "center" }}>
        Choose File
        <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileChange} style={{ display: "none" }} />
      </label>
      {fileSelected && (
        <>
          <select value={summaryType} onChange={(e) => setSummaryType(e.target.value)} style={{ marginBottom: "16px", padding: "10px", backgroundColor: "#1E40AF", borderRadius: "6px", width: "80%", maxWidth: "300px", color: "white" }}>
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="detailed">Detailed</option>
          </select>
          <button onClick={uploadAndSummarizeFile} disabled={loading} style={{ backgroundColor: "#10B981", padding: "12px", borderRadius: "8px", width: "80%", maxWidth: "300px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Processing..." : "Summarize"}
          </button>
        </>
      )}
      {summary && <div style={{ marginTop: "16px", backgroundColor: "#374151", padding: "12px", borderRadius: "8px", width: "80%", maxWidth: "700px", color: "white" }}>{summary}</div>}
      {error && <p style={{ color: "#EF4444", marginTop: "16px" }}>{error}</p>}
      <div style={{ marginTop: "16px", width: "80%", maxWidth: "700px", display: "flex" }}>
        <input 
          type="text" 
          value={question} 
          onChange={(e) => setQuestion(e.target.value)} 
          placeholder="Ask a question..." 
          style={{ flex: 1, padding: "12px", borderRadius: "8px", color: "white", backgroundColor: "#374151", border: "none" }}
          onKeyDown={(e) => e.key === "Enter" && question.trim() && askQuestion()}
        />
        <button onClick={askQuestion} disabled={!question.trim()} style={{ backgroundColor: "#10B981", padding: "12px", borderRadius: "8px", marginLeft: "12px", cursor: !question.trim() ? "not-allowed" : "pointer", opacity: !question.trim() ? 0.6 : 1 }}>Ask</button>
      </div>
      <div style={{ marginTop: "16px", width: "80%", maxWidth: "700px" }}>
        {chat.map((entry, index) => (
          <div key={index} style={{ padding: "12px", borderRadius: "8px", marginTop: "8px", backgroundColor: entry.question ? "#374151" : "#1E40AF", textAlign: entry.question ? "right" : "left" }}>
            <p><strong>{entry.question ? "You:" : "AI:"}</strong></p>
            <p dangerouslySetInnerHTML={{ __html: entry.answer }}></p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
