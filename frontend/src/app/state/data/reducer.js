import {
    COUNTRY_DETAILS_ERROR,
    COUNTRY_DETAILS_LOADING, COUNTRY_DETAILS_RESET, COUNTRY_DETAILS_SUCCESS,
    COUNTRY_ERROR,
    COUNTRY_LOADING,
    COUNTRY_SUCCESS,
    DATA_ERROR,
    DATA_LOADING,
    DATA_SUCCESS,
    DATE_RANGE_ERROR,
    DATE_RANGE_LOADING,
    DATE_RANGE_SUCCESS,
} from './actions';
import moment from "moment";

const DEFAULT_STATE = {
    data:           undefined,
    country:        undefined,
    countryDetails: undefined,
    dateRange:      undefined,
};

export default (state = DEFAULT_STATE, action) => {
    switch (action.type) {
        case DATA_ERROR:
        case COUNTRY_ERROR:
        case COUNTRY_DETAILS_ERROR:
        case DATE_RANGE_ERROR: {
            const {error} = action;
            return {...state, error, loading: false};
        }

        case DATA_LOADING:
        case COUNTRY_LOADING:
        case COUNTRY_DETAILS_LOADING:
        case DATE_RANGE_LOADING: {
            return {...state, loading: true, error: undefined};
        }

        case COUNTRY_DETAILS_RESET: {
            return {
                ...state,
                countryDetails:         undefined,
                countryDetailsLastWeek: undefined
            };
        }


        case DATA_SUCCESS: {
            const {data} = action;
            return {...state, data, loading: false};
        }

        case COUNTRY_SUCCESS: {
            const {country} = action;
            return {...state, country, loading: false};
        }

        case COUNTRY_DETAILS_SUCCESS: {
            let {countryDetails} = action;
            countryDetails = countryDetails ?
                Object.keys(countryDetails.fireIncidents).map((fireIncidentDate) => {
                    return {
                        x: moment(fireIncidentDate).format('DD/MM/YYYY'),
                        y: countryDetails.fireIncidents[fireIncidentDate]
                    }
                }).sort((a, b) => {
                    const A = moment(a.x, 'DD/MM/YYYY'), B = moment(b.x, 'DD/MM/YYYY');
                    if (A.isAfter(B)) return 1;
                    else return -1;
                }) : [];

            const countryDetailsLastWeek = countryDetails ? countryDetails.slice(countryDetails.length - 7, countryDetails.length) : [];
            return {...state, countryDetails, countryDetailsLastWeek, loading: false};
        }

        case DATE_RANGE_SUCCESS: {
            const {dateRange} = action;
            return {...state, dateRange, loading: false};
        }

        default:
            return state;
    }
};
