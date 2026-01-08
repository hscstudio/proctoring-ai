const express = require('express');
const cors = require('cors');
const { AccessToken } = require('livekit-server-sdk');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

app.get('/get-token', async (req, res) => {
  const { roomName, participantName } = req.query;

  if (!roomName || !participantName) {
    return res.status(400).json({ error: 'Data room atau partisipan kurang.' });
  }

  try {
    // Buat token dengan identitas peserta
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
    });

    // Set izin (Grants)
    at.addGrant({ 
      roomJoin: true, 
      room: roomName, 
      canPublish: true,   // HP kirim video
      canSubscribe: true  // Laptop terima video
    });

    const token = await at.toJwt();
    res.json({ token });
  } catch (error) {
    console.error("Token Error:", error);
    res.status(500).json({ error: 'Gagal membuat token.' });
  }
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`🚀 LiveKit Token Server ready at http://localhost:${PORT}`);
});