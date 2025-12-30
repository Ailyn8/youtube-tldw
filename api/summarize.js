// api/summarize.js
import { YouTubeTranscript } from 'youtube-transcript';

const HF_TOKEN = process.env.HUGGING_FACE_API_KEY;
const SUMMARIZE_API = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  try {
    // Extract video ID
    const videoId = url.split('v=')[1]?.split('&')[0];
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Get transcript
    let transcriptData;
    try {
      transcriptData = await YouTubeTranscript.fetchTranscript(videoId);
    } catch (e) {
      return res.status(400).json({ 
        error: 'No transcript found. Try a different video — some videos have captions but no downloadable transcript.' 
      });
    }

    // Combine all text
    const fullText = transcriptData.map(item => item.text).join(' ');

    // Truncate if too long
    const inputText = fullText.length > 10000 ? fullText.substring(0, 10000) : fullText;

    // Summarize via Hugging Face
    const hfResponse = await fetch(SUMMARIZE_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: inputText }),
    });

    if (!hfResponse.ok) {
      return res.status(500).json({ error: 'Failed to summarize (Hugging Face error)' });
    }

    const summaryData = await hfResponse.json();
    const summary = summaryData?.[0]?.summary_text || "Could not generate summary.";

    res.status(200).json({ summary, videoId });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: 'Something went wrong. Try again.' });
  }
}
