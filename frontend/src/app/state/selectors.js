import {createSelector} from 'reselect';

import {dataErrorSelector} from './data/selectors';

export const appErrorSelector = createSelector(
    dataErrorSelector,
    (
        dataErrorSelector,
    ) =>
        dataErrorSelector
);
