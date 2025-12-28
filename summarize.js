// api/summarize.js
import { getTranscript } from 'youtube-transcript';

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
    // Extract YouTube video ID
    const videoId = url.split('v=')[1]?.split('&')[0];
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Fetch transcript
    let transcriptData;
    try {
      transcriptData = await getTranscript({ videoId });
    } catch (e) {
      return res.status(400).json({ error: 'Transcript not available for this video' });
    }

    const fullText = transcriptData.map(item => item.text).join(' ');
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
      return res.status(500).json({ error: 'Failed to generate summary' });
    }

    const summaryData = await hfResponse.json();
    const summary = summaryData?.[0]?.summary_text || "Could not generate summary.";

    res.status(200).json({ summary, videoId });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: 'Something went wrong' });
  }
}
