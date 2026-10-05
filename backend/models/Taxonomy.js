import mongoose from 'mongoose';

const TaxonomySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true, default: 'gate_cse_taxonomy' },
    taxonomy: { type: mongoose.Schema.Types.Mixed, required: true },
    mistakeCategories: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedAt: { type: Number, default: () => Date.now() },
  },
  {
    timestamps: false,
    collection: 'taxonomy',
  }
);

export const Taxonomy = mongoose.models.Taxonomy || mongoose.model('Taxonomy', TaxonomySchema);
export default Taxonomy;
