import {get} from '../../common/action';
import {formatDate} from "../../common/utils";

export const COUNTRY_LOADING = 'COUNTRY_LOADING';
export const COUNTRY_SUCCESS = 'COUNTRY_SUCCESS';
export const COUNTRY_ERROR = 'COUNTRY_ERROR';
export const COUNTRY_DETAILS_RESET = 'COUNTRY_DETAILS_RESET';
export const COUNTRY_DETAILS_LOADING = 'COUNTRY_DETAILS_LOADING';
export const COUNTRY_DETAILS_SUCCESS = 'COUNTRY_DETAILS_SUCCESS';
export const COUNTRY_DETAILS_ERROR = 'COUNTRY_DETAILS_ERROR';
export const DATA_LOADING = 'DATA_LOADING';
export const DATA_SUCCESS = 'DATA_SUCCESS';
export const DATA_ERROR = 'DATA_ERROR';
export const DATE_RANGE_LOADING = 'DATE_RANGE_LOADING';
export const DATE_RANGE_SUCCESS = 'DATE_RANGE_SUCCESS';
export const DATE_RANGE_ERROR = 'DATE_RANGE_ERROR';

export const resetCountry = () => async dispatch => {
    dispatch({type: COUNTRY_DETAILS_RESET});
}

export const loadCountry = (position) => async dispatch => {
    const error = error => dispatch({type: COUNTRY_ERROR, error});
    try {
        dispatch({type: COUNTRY_SUCCESS, undefined});
        dispatch({type: COUNTRY_LOADING});

        const res = await dispatch(get(`/country?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}`));
        if (!res.ok || res.headers.get('content-type').includes('text/html')) return error(res);
        const country = await res.text();
        dispatch({type: COUNTRY_SUCCESS, country});
    } catch (e) {
        error(e);
    }
};

export const loadCountryDetails = (country) => async dispatch => {
    const error = error => dispatch({type: COUNTRY_DETAILS_ERROR, error});
    try {
        dispatch({type: COUNTRY_DETAILS_LOADING});

        const res = await dispatch(get(`/country-details?country=${country}`));
        if (!res.ok || res.headers.get('content-type').includes('text/html')) return error(res);
        const countryDetails = await res.json();
        dispatch({type: COUNTRY_DETAILS_SUCCESS, countryDetails});
    } catch (e) {
        error(e);
    }
};

export const loadData = (dateRange, position) => async dispatch => {
    const error = error => dispatch({type: DATA_ERROR, error});
    try {
        dispatch({type: DATA_SUCCESS, data: undefined});
        dispatch({type: DATA_LOADING});

        const start = formatDate(dateRange[0]);
        const end = formatDate(dateRange[1]);

        const res = await dispatch(get(`/data?start=${start}&end=${end}${position !== undefined ? `&latitude=${position.coords.latitude}&longitude=${position.coords.longitude}` : ''}`));
        if (!res.ok || res.headers.get('content-type').includes('text/html')) return error(res);
        const data = await res.json();
        dispatch({type: DATA_SUCCESS, data: data});
    } catch (e) {
        error(e);
    }
};

export const loadDateRange = () => async dispatch => {
    const error = error => dispatch({type: DATE_RANGE_ERROR, error});
    try {
        dispatch({type: DATE_RANGE_LOADING});
        const res = await dispatch(get(`/date-range`));
        if (!res.ok || res.headers.get('content-type').includes('text/html')) return error(res);
        const dateRange = await res.json();
        dispatch({type: DATE_RANGE_SUCCESS, dateRange});
    } catch (e) {
        error(e);
    }
};