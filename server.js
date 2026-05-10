const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const readNotesFromFile = async () => {
  try {
    const data = await fs.readFile(path.join(__dirname, 'db.json'), 'utf8');
    let notes = JSON.parse(data);
    // Ensure every note has an id (migration for existing notes)
    let updated = false;
    notes = notes.map(note => {
      if (!note.id) {
        updated = true;
        return { ...note, id: uuidv4() };
      }
      return note;
    });
    if (updated) {
      await writeNotesToFile(notes);
    }
    return notes;
  } catch (err) {
    return [];
  }
};

const writeNotesToFile = async (notes) => {
  await fs.writeFile(path.join(__dirname, 'db.json'), JSON.stringify(notes, null, 2));
};

app.get('/api/notes', async (req, res) => {
  const notes = await readNotesFromFile();
  res.json(notes);
});

app.post('/api/notes', async (req, res) => {
  const { title, text } = req.body;
  if (!title || !text) {
    return res.status(400).json({ error: 'Title and text are required' });
  }
  const notes = await readNotesFromFile();
  const newNote = { id: uuidv4(), title, text };
  notes.push(newNote);
  await writeNotesToFile(notes);
  res.json(newNote);
});

app.delete('/api/notes/:id', async (req, res) => {
  const { id } = req.params;
  let notes = await readNotesFromFile();
  const filteredNotes = notes.filter(note => note.id !== id);
  if (notes.length === filteredNotes.length) {
    return res.status(404).json({ error: 'Note not found' });
  }
  await writeNotesToFile(filteredNotes);
  res.status(204).send();
});

app.get('/notes', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'notes.html'));
});

// Catch-all route (regex works with Express 5)
app.get(/^\/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

