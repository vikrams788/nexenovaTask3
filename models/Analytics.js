const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  pageViews: { type: Number, required: true }
});

const AnalyticsModel = mongoose.model('Analytics', analyticsSchema);

module.exports = AnalyticsModel;
