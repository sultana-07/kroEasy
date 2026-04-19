const mongoose = require('mongoose');

/**
 * Video model — stores YouTube Shorts links uploaded by workers / car owners.
 *
 * Fields:
 *  uploaderId   – ObjectId of the Labour or CarOwner *profile* doc
 *  uploaderType – "labour" | "carowner"
 *  userId       – ObjectId of the User account (for populate: name, phone, avatar)
 *  youtubeUrl   – Full YouTube Shorts URL  (e.g. https://youtube.com/shorts/xxxx)
 *  videoId      – Extracted YouTube video ID  (e.g. xxxx)
 *  title        – Optional short title / caption
 *  isActive     – Admin can soft-delete by setting false
 */
const videoSchema = new mongoose.Schema(
    {
        uploaderId:   { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
        uploaderType: { type: String, enum: ['labour', 'carowner'], required: true },
        userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        youtubeUrl:   { type: String, required: true },
        videoId:      { type: String, required: true },   // YouTube video ID
        title:        { type: String, default: '' },
        isActive:     { type: Boolean, default: true, index: true },
    },
    { timestamps: true }
);

// Compound index — public feed: only active videos, newest first
videoSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model('Video', videoSchema);
