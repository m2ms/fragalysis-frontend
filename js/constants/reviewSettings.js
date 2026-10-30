export const DEFAULT_REVIEW_HEIGHT = 376;
export const MIN_REVIEW_HEIGHT = 160;
export const SET_REVIEW_SETTINGS = 'SET_REVIEW_SETTINGS';
export const SET_REVIEW_OWNERSHIP = 'SET_REVIEW_OWNERSHIP';

const sides = ['lhs', 'rhs'];
const sorts = ['POSE_NAME', 'COMPOUND_CODE', 'OBSERVATION_COUNT', 'CANONSITE_NUMBER', 'CONFORMERSITE_NUMBER'];
const id = value =>
  (typeof value === 'string' && value.length) || (typeof value === 'number' && Number.isFinite(value));
const ids = values => [...new Set((Array.isArray(values) ? values : []).filter(id).map(String))];

// Whitelist only serializable ownership intent. Renderer handles and pending work never enter this record.
export const normalizeReviewOwnership = value => {
  const members = (Array.isArray(value?.members) ? value.members : [])
    .filter(member => member && id(member.id) && typeof member.code === 'string')
    .map(member => ({
      id: String(member.id),
      code: member.code,
      owned: [
        ...new Set(
          (Array.isArray(member.owned) ? member.owned : [])
            .filter(v => v === null || id(v))
            .map(v => (v === null ? null : String(v)))
        )
      ],
      held: (Array.isArray(member.held) ? member.held : []).filter(v => typeof v === 'string')
    }));
  const known = new Set(members.map(member => member.id));
  const groups = (Array.isArray(value?.groups) ? value.groups : [])
    .filter(group => group && id(group.id))
    .map(group => ({
      id: String(group.id),
      members: ids(group.members).filter(member => known.has(member)),
      releasing: group.releasing === true
    }))
    .filter(group => group.members.length);
  const used = new Set(groups.flatMap(group => group.members));
  return { groups, members: members.filter(member => used.has(member.id)) };
};

export const normalizeReviewSettings = value => ({
  owner: sides.includes(value?.owner) ? value.owner : null,
  open: sides.includes(value?.owner) && value?.open === true,
  height:
    typeof value?.height === 'number' && Number.isFinite(value.height)
      ? Math.max(MIN_REVIEW_HEIGHT, value.height)
      : DEFAULT_REVIEW_HEIGHT,
  orderingBySide: Object.fromEntries(
    sides
      .filter(side => value?.orderingBySide?.[side])
      .map(side => [
        side,
        {
          sortOption: sorts.includes(value.orderingBySide[side].sortOption)
            ? value.orderingBySide[side].sortOption
            : 'POSE_NAME',
          ascending: value.orderingBySide[side].ascending !== false
        }
      ])
  ),
  ligandGroups: normalizeReviewOwnership(value?.ligandGroups)
});

export const normalizeReviewSelection = (selection = {}) => {
  const rhs = selection.unifiedFilter?.rhs || {};
  return {
    ...selection,
    review: normalizeReviewSettings(selection.review),
    unifiedFilter: {
      ...selection.unifiedFilter,
      rhs: {
        ...rhs,
        filters:
          rhs.filters || (selection.unifiedFilter?.detailRHS ? { detail: selection.unifiedFilter.detailRHS } : {}),
        sortings: rhs.sortings || {},
        generalFilter: rhs.generalFilter ?? selection.filter ?? { active: false },
        mainStatusFilters: ['GOOD', 'MEDIOCRE', 'BAD', 'NONE'].filter(
          status => Array.isArray(rhs.mainStatusFilters) && rhs.mainStatusFilters.includes(status)
        ),
        activeOnly: rhs.activeOnly === true
      }
    }
  };
};
