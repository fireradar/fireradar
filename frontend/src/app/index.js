import 'react-app-polyfill/ie11';
import 'react-app-polyfill/stable';
import 'url-search-params-polyfill';
import 'abortcontroller-polyfill/dist/polyfill-patch-fetch';

import React, {Component} from 'react';
import {Provider} from 'react-redux';
import PropTypes from 'prop-types';

import {Main} from './screens';

import createStore from './common/store';
import reducer from './state';

class Root extends Component {
    static propTypes = {
        locale: PropTypes.string
    };

    store = createStore(reducer);

    render() {
        return (
            <Provider store={this.store}>
                <Main/>
            </Provider>
        );
    }
}

export default Root;
