import mongoose from 'mongoose';

const OptionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const QuestionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    examId: { type: String, default: 'GATE_CSE', index: true },
    sectionId: { type: String, default: 'gate-cs' },
    sectionName: { type: String, default: 'Computer Science & IT' },
    questionText: { type: String, required: true },
    questionType: {
      type: String,
      required: true,
      index: true,
    },
    correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
    explanation: { type: String, default: '' },
    subjectId: { type: String, index: true },
    subjectName: { type: String },
    topicId: { type: String, index: true },
    topicName: { type: String },
    subtopicId: { type: String },
    subtopicName: { type: String },
    cognitiveLevel: { type: String },
    level: { type: Number },
    difficulty: {
      type: String,
      default: 'MEDIUM',
      index: true,
    },
    marks: { type: Number, required: true, default: 1 },
    negativeMarks: { type: Number, required: true, default: 0 },
    sourceType: { type: String, default: 'OFFICIAL_GATE_PYQ' },
    sourceName: { type: String, default: '' },
    sourceYear: { type: Number },
    validationStatus: { type: String, default: 'VERIFIED' },
    tags: [{ type: String }],
    options: [OptionSchema],
    diagram: { type: mongoose.Schema.Types.Mixed },
    codeSnippet: { type: mongoose.Schema.Types.Mixed },
    hints: [{ type: String }],
    stepByStepBreakdown: [{ type: String }],
    sourceId: { type: String },
    datasetFile: { type: String },
    createdAt: { type: Number, default: () => Date.now() },
    updatedAt: { type: Number, default: () => Date.now() },
  },
  {
    timestamps: false,
    collection: 'questions',
  }
);

// Helpful text index for keyword search across question text and explanations
QuestionSchema.index({ questionText: 'text', explanation: 'text' });

export const Question = mongoose.models.Question || mongoose.model('Question', QuestionSchema);
export default Question;
