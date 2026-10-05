import mongoose from 'mongoose';

const MistakeRecordSchema = new mongoose.Schema(
  {
    mistakeId: { type: String, required: true, unique: true, index: true },
    questionId: { type: String, required: true, index: true },
    userId: { type: String, default: 'anonymous_candidate', index: true },
    subjectId: { type: String, required: true, index: true },
    topicId: { type: String, required: true, index: true },
    userAnswer: { type: mongoose.Schema.Types.Mixed },
    correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
    category: {
      type: String,
      enum: ['Conceptual', 'Calculation', 'Misread Question', 'Formula Amnesia', 'Time Pressure', 'Silly Mistake', 'Uncategorized'],
      default: 'Uncategorized',
      index: true,
    },
    userNotes: { type: String, default: '' },
    resolved: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const MistakeRecord = mongoose.models.MistakeRecord || mongoose.model('MistakeRecord', MistakeRecordSchema);
export default MistakeRecord;
