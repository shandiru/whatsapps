const express = require('express');
const router = express.Router();
const ScheduleMessage = require('../models/ScheduleMessage');

// POST /api/schedule — schedule a new message
router.post('/', async (req, res) => {
  try {
    const { message, scheduledTime } = req.body;

    if (!message || !scheduledTime) {
      return res.status(400).json({
        success: false,
        error: 'Both `message` and `scheduledTime` are required',
      });
    }

    const when = new Date(scheduledTime);
    if (Number.isNaN(when.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid scheduledTime' });
    }

    const doc = await ScheduleMessage.create({ message, scheduledTime: when });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error('POST /api/schedule failed:', err);
    res.status(500).json({ success: false, error: 'Failed to schedule message' });
  }
});

// GET /api/schedule — list all (sorted by scheduledTime)
router.get('/', async (req, res) => {
  try {
    const docs = await ScheduleMessage.find().sort({ scheduledTime: 1 }).limit(200);
    res.json({ success: true, count: docs.length, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// DELETE /api/schedule/:id
router.delete('/:id', async (req, res) => {
  try {
    const doc = await ScheduleMessage.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete' });
  }
});

module.exports = router;
