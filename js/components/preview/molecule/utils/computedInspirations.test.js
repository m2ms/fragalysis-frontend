import {
  getComputedSetIdsFromTags,
  getComputedInspirationsForPose,
  getDefaultComputedInspirations,
  getFilteredComputedInspirations
} from './computedInspirations';

describe('computed inspirations helpers', () => {
  it('resolves a pose main observation before applying the active RHS computed-set tags', () => {
    expect.hasAssertions();
    expect(
      getComputedInspirationsForPose(
        {
          data: { main_site_observation: 2, computed_inspirations: [99] },
          observations: [
            { id: 1, computed_inspirations: [11] },
            { id: 2, computed_inspirations: [12, 13], computed_inspirations_by_set: { 7: [13] } }
          ]
        },
        [{ id: 'custom', additional_info: { computed_set: 7 } }]
      )
    ).toStrictEqual([13]);
  });

  it('preserves the navigator pose fallback and legacy tag filtering when observations have no inspiration data', () => {
    expect.hasAssertions();
    expect(
      getComputedInspirationsForPose(
        {
          data: { main_site_observation: 2, computed_inspirations: [12, 13] },
          observations: [{ id: 2, computed_inspirations_by_set: { 7: [12] } }]
        },
        [{ id: 'rhs-7' }]
      )
    ).toStrictEqual([12]);
  });

  it('prefers main observation inspirations over pose-level inspirations', () => {
    expect.hasAssertions();

    expect(
      getDefaultComputedInspirations({
        data: {
          main_site_observation: 2,
          computed_inspirations: [99]
        },
        observations: [
          { id: 1, computed_inspirations: [1] },
          { id: 2, computed_inspirations: [2, 3] }
        ]
      })
    ).toStrictEqual([2, 3]);
  });

  it('reads computed set ids from synthetic rhs tags', () => {
    expect.hasAssertions();

    expect(
      getComputedSetIdsFromTags([
        {
          id: 'rhs-7'
        }
      ])
    ).toStrictEqual([7]);
  });

  it('prefers explicit computed set ids from additional_info', () => {
    expect.hasAssertions();

    expect(
      getComputedSetIdsFromTags([
        {
          id: 'rhs-custom',
          additional_info: {
            computed_set: 11
          }
        }
      ])
    ).toStrictEqual([11]);
  });

  it('filters inspirations to the currently active computed sets', () => {
    expect.hasAssertions();

    expect(
      getFilteredComputedInspirations(
        {
          computed_inspirations: [3, 10, 14, 16],
          computed_inspirations_by_set: {
            1: [3, 10],
            2: [14, 16]
          }
        },
        [
          {
            id: 'rhs-2'
          }
        ]
      )
    ).toStrictEqual([14, 16]);
  });

  it('returns all inspirations when no rhs tag is active', () => {
    expect.hasAssertions();

    expect(
      getFilteredComputedInspirations(
        {
          computed_inspirations: [3, 10, 14]
        },
        []
      )
    ).toStrictEqual([3, 10, 14]);
  });

  it('returns no inspirations when the active set has none for the observation', () => {
    expect.hasAssertions();

    expect(
      getFilteredComputedInspirations(
        {
          computed_inspirations: [3, 10],
          computed_inspirations_by_set: {
            1: [3, 10]
          }
        },
        [
          {
            id: 'rhs-2'
          }
        ]
      )
    ).toStrictEqual([]);
  });
});
