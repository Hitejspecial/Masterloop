import mongoose from 'mongoose';

const UserAttemptSchema = new mongoose.Schema(
  {
    attemptId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, default: 'anonymous_candidate', index: true },
    examId: { type: String, required: true },
    totalQuestions: { type: Number, required: true },
    attemptedCount: { type: Number, required: true },
    correctCount: { type: Number, required: true },
    incorrectCount: { type: Number, required: true },
    rawScore: { type: Number, required: true },
    maxMarks: { type: Number, required: true },
    accuracyPercentage: { type: Number, required: true },
    timeTakenSeconds: { type: Number, required: true },
    answers: { type: mongoose.Schema.Types.Mixed, default: {} },
    questionTimes: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

export const UserAttempt = mongoose.models.UserAttempt || mongoose.model('UserAttempt', UserAttemptSchema);
export default UserAttempt;
