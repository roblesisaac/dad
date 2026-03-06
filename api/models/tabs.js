import AmptModel from '../utils/amptModel';

function normalizeSortByGroup(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((acc, [scopeId, rawSort]) => {
    const normalizedScopeId = String(scopeId || '').trim();
    const normalizedSort = Number(rawSort);

    if (!normalizedScopeId || !Number.isFinite(normalizedSort)) {
      return acc;
    }

    acc[normalizedScopeId] = normalizedSort;
    return acc;
  }, {});
}

const tabSchema = {
  userId: String,
  tabName: String,
  showForGroup: [String],
  isSelected: Boolean,
  sort: Number,
  sortByGroup: normalizeSortByGroup,
  heading: {
    type: 'String',
    default: 'sum',
    enum: ['sum', 'average', 'min', 'max', 'count']
  },
  label1: 'userId'
};

export default AmptModel(['tabs', 'userId'], tabSchema);
