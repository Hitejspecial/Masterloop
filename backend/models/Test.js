import mongoose from 'mongoose';

const TestSectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    questionIds: [{ type: String }],
  },
  { _id: false }
);

const TestSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    testType: {
      type: String,
      required: true,
      index: true,
    },
    targetExam: { type: String, default: 'GATE 2027 CSE', index: true },
    durationMinutes: { type: Number, required: true, default: 180 },
    totalMarks: { type: Number, required: true, default: 100 },
    questionIds: [{ type: String }],
    sections: [TestSectionSchema],
    subjectId: { type: String, index: true },
    subjectName: { type: String },
    topicId: { type: String, index: true },
    topicName: { type: String },
    year: { type: Number },
    metadata: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Number, default: () => Date.now() },
    updatedAt: { type: Number, default: () => Date.now() },
  },
  {
    timestamps: false,
    collection: 'tests',
  }
);

export const Test = mongoose.models.Test || mongoose.model('Test', TestSchema);
export default Test;
