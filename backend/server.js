const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// ——— MongoDB & GridFSBucket ———
const mongoURI = 'mongodb+srv://armaansalam786:11@armaan.z2dhe64.mongodb.net/fswd?retryWrites=true&w=majority&appName=armaan';
mongoose
  .connect(mongoURI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

let gfsBucket;
mongoose.connection.once('open', () => {
  gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'resumes'
  });
});

// ——— Server-side “Upload by Path” Endpoint ———
// Call this once (e.g. via Postman or curl) to load your resume into GridFS.
app.post('/upload-path', async (req, res) => {
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'Missing filePath' });

  try {
    const absolute = path.resolve(filePath);
    const buffer = fs.readFileSync(absolute);
    const filename = path.basename(absolute);
    const ext = path.extname(filename).toLowerCase();
    const mimeType = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }[ext] || 'application/octet-stream';

    const uploadStream = gfsBucket.openUploadStream(filename, {
      contentType: mimeType,
    });
    uploadStream.end(buffer);

    uploadStream.on('error', err => {
      console.error('Upload error:', err);
      return res.status(500).json({ error: 'Upload failed' });
    });

    uploadStream.on('finish', async () => {
      try {
        const [uploadedFile] = await gfsBucket
          .find({ filename })
          .sort({ uploadDate: -1 })
          .limit(1)
          .toArray();

        if (!uploadedFile) {
          return res.status(404).json({ error: 'File not found after upload' });
        }

        res.json({
          message: 'File uploaded to GridFS',
          fileId: uploadedFile._id,
          filename: uploadedFile.filename,
        });
      } catch (err) {
        console.error('Error fetching uploaded file info:', err);
        res.status(500).json({ error: 'Upload completed but file not found' });
      }
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error reading file' });
  }
});


// ——— Download the Latest Uploaded Resume ———
app.get('/resume', async (req, res) => {
  try {
    // Find most recent upload
    const files = await gfsBucket
      .find({})
      .sort({ uploadDate: -1 })
      .limit(1)
      .toArray();

    if (!files.length) {
      return res.status(404).json({ error: 'No resume found' });
    }
    const file = files[0];
    res.set('Content-Type', file.contentType);
    res.set(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`
    );
    gfsBucket.openDownloadStreamByName(file.filename).pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Backend server running on port ${PORT}`)
);