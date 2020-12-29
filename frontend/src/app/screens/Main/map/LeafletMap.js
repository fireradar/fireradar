import L from "leaflet";
import React, {Fragment, PureComponent} from 'react';
import {GeoJSON, Map, Pane, TileLayer, ZoomControl} from 'react-leaflet';
import HeatmapLayer from 'react-leaflet-heatmap-layer';
import {connect} from "react-redux";
import {loadCountry, loadCountryDetails, loadData, loadDateRange, resetCountry} from "../../../state/data/actions";
import {dataSelector, dateRangeSelector} from "../../../state/data/selectors";
import {Button, Checkbox, Divider, Dropdown, Header, Icon, Loader, Modal, Popup} from "semantic-ui-react";
import json from './common/geojson/countries-medium.geo.json';
import countries from './common/geojson/countries.json';
import Control from 'react-leaflet-control';
import './LeafletMap.scss';
import RangeDatePicker from "../../../common/components/RangeDatePicker/RangeDatePicker";
import {Slider} from "react-semantic-ui-range";
import moment from "moment";
import {isArrayEqual} from "../../../common/utils";
import {debounce} from "lodash";
import {Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis} from "recharts";

class CustomizedLabel extends PureComponent {
    render() {
        const {
            x, y, stroke, value,
        } = this.props;

        return <text x={x} y={y} dy={-5} fill={stroke} fontSize={10} textAnchor="middle">{value}</text>;
    }
}

const getOffset = (topList, positive = true, key = false) => {
    let maxDigits = Math.max(...topList.map((item) => {
        if (key ||
            ((positive && item >= 0)
                || (!positive && item < 0))) {
            return String(item).replace(/[^a-zA-Z0-9]+/g, "").length;
        } else {
            return 0;
        }
    }));
    maxDigits += 1; //axis may hold rounded value bigger than max data value
    if (!key && !positive) {
        if (maxDigits > 0) {
            maxDigits += 2;
        }
        return maxDigits * 10;
    } else {
        return Math.max(25, maxDigits * 7 + 5);
    }
}

class LeafletMap extends React.Component {

    state = {
        heatmapLayerHidden:    true,
        choroplethLayerHidden: false,
        dailyAlerts:           true,
        darkTheme:             true,
        map:                   'basic',
        radius:                5,
        blur:                  5,
        zoomCenter:            [30, 0],
        zoomLevel:             2,
        selectedDateRange:     undefined,
        selectedDateIndex:     1, // start index from 1 because starting from 0 breaks animation while setting to 0 position, slider doesn't move circle to 0 position
        // highlightedLayer:      undefined,
        selectedCountryLayer:  undefined,
        menuHidden:            undefined,
        aboutPopupOpen:        undefined,
        filteredData:          [],
        dataByCountry:         [],
        topCountriesData:      [],
    };

    mapRef = React.createRef();
    geoJSONRef = React.createRef();
    weekLinechartRef = React.createRef();
    monthLinechartRef = React.createRef();
    choropleth;
    animation = undefined;
    mobile = window.screen.width <= 768 || window.screen.height <= 768;

    debouncedSetRadius = debounce((value) => {
        if (value !== this.state.radius) {
            this.setState({radius: value});
        }
    }, 200);

    debouncedShowHideMenu = debounce((value) => {
        this.setState({menuHidden: !this.state.menuHidden});
        setTimeout(() => {
            const map = this.mapRef.current.leafletElement;
            map.invalidateSize(true);
            this.forceUpdate();
            // if (this.monthLinechartRef.current) {
            //
            // }
        }, 800)
    }, 0);

    debouncedSetBlur = debounce((value) => {
        if (value !== this.state.blur) {
            this.setState({blur: value});
        }
    }, 200);

    componentDidMount() {
        const {loadDateRange} = this.props;
        window.addEventListener('resize', this.onResizeScreen);
        window.addEventListener('orientationchange', this.onOrientationChange);

        loadDateRange();
        if (this.mobile) {
            this.setState({menuHidden: true});
        }
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (!isArrayEqual(prevProps.dateRange, this.props.dateRange)) {

            // let newSelectedDateRange = [moment(this.props.dateRange[1]).add(-7, 'days').format('YYYY-MM-DD'), this.props.dateRange[1]];
            let newSelectedDateRange = [moment(this.props.dateRange[1], 'YYYY-MM-DD').add(-1, 'days').format('YYYY-MM-DD'), this.props.dateRange[1]];
            this.setState({selectedDateRange: newSelectedDateRange, selectedDateIndex: 1});

            this.readData(newSelectedDateRange);
        }

        if (prevProps.country !== this.props.country) {
            console.log('Geo position country: ' + this.props.country)
            const geoJSON = this.geoJSONRef.current.leafletElement;
            // for (const layer of L.geoJSON(json).getLayers()) {
            for (const layer of geoJSON.getLayers()) {
                if (layer.feature.properties.iso_a3 === this.props.country) {
                    this.zoomToLayer(layer);
                }
            }
        }

        if (!isArrayEqual(prevProps.data, this.props.data)
            || prevState.dailyAlerts !== this.state.dailyAlerts) {
            const dataByCountry = {};
            let selectedDate = moment(this.state.selectedDateRange[1]).startOf('day');//moment(this.state.selectedDateRange[0]).add(this.state.selectedDateIndex - 1, 'days');
            let previousDate = selectedDate.clone().add(-1, 'days').startOf('day');
            const filteredData = this.props.data.length > 0 ?
                this.props.data.filter(d => {
                    if (this.state.dailyAlerts) {
                        // const dataDate = moment(d.acq_date[0] + '-' + d.acq_date[1] + '-' + d.acq_date[2], 'YYYY-MM-DD').startOf('day');
                        // console.log(dataDate.format('YYYY-MM-DD'), selectedDate.startOf('day').format('YYYY-MM-DD'), selectedDate.clone().add(-1, 'days').startOf('day').format('YYYY-MM-DD'))
                        return (d.acq_date[0] === selectedDate.year()
                            && d.acq_date[1] === (selectedDate.month() + 1)
                            && d.acq_date[2] === selectedDate.date())
                            || (d.acq_date[0] === previousDate.year()
                                && d.acq_date[1] === (previousDate.month() + 1)
                                && d.acq_date[2] === previousDate.date());
                    } else {
                        return true;
                    }
                })
                : [];

            for (const datum of filteredData) {
                if (!dataByCountry[datum.countryCodeIso3]) {
                    dataByCountry[datum.countryCodeIso3] = 1;
                } else {
                    dataByCountry[datum.countryCodeIso3] += 1;
                }
            }

            let topCountriesData = [];
            if (this.geoJSONRef.current) {
                let dataByCountriesSortedDesc = Object.keys(dataByCountry).sort((a, b) => {
                    const A = dataByCountry[a],
                        B = dataByCountry[b];
                    if (A > B) {
                        return -1;
                    } else {
                        return 1;
                    }
                });

                const geoJSON = this.geoJSONRef.current.leafletElement;
                for (let i = 0; i < 5; i++) {
                    for (const layer of geoJSON.getLayers()) {
                        if (layer.feature.properties.iso_a3 === dataByCountriesSortedDesc[i]) {
                            topCountriesData.push({
                                country: layer.feature.properties.name,
                                value:   [0, dataByCountry[dataByCountriesSortedDesc[i]]]
                            })
                        }
                    }
                }
            }
            this.setState({filteredData, dataByCountry, topCountriesData});
        }
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.onResizeScreen);
        window.removeEventListener('orientationchange', this.onOrientationChange);
    }

    onOrientationChange = () => {
        this.forceUpdate();
    }

    onResizeScreen = () => {
        this.forceUpdate();
    };

    readData(dateRange, position) {
        const {loadData} = this.props;
        loadData(dateRange, position);
    }

    getMenu() {
        const {dateRange} = this.props;

        let countryOptions = [];
        if (this.geoJSONRef.current) {
            const geoJSON = this.geoJSONRef.current.leafletElement;
            countryOptions = geoJSON.getLayers()
                .map((layer) => {
                    return {
                        key:   layer.feature.properties.iso_a3,
                        value: layer.feature.properties.iso_a3,
                        // flag:  layer.feature.properties.iso_a2,
                        text:  layer.feature.properties.name
                    }
                })
                .filter((layer) => layer.key !== '-99')
                .sort((a, b) => {
                    const A = a.text,
                        B = b.text;
                    if (A > B) {
                        return 1;
                    } else {
                        return -1;
                    }
                });
        }

        return <div>
            <div className='fields'>
                <div className='flex-row'>
                    <span className='label'>Country search: </span>
                    <Dropdown
                        fluid
                        search
                        selection
                        value={this.state.selectedCountryLayer ? this.state.selectedCountryLayer.feature.properties.iso_a3 : null}
                        onChange={(event, data) => {
                            const geoJSON = this.geoJSONRef.current.leafletElement;
                            // for (const layer of L.geoJSON(json).getLayers()) {
                            for (const layer of geoJSON.getLayers()) {
                                if (layer.feature.properties.iso_a3 === data.value) {
                                    this.zoomToLayer(layer);
                                }
                            }
                        }}
                        options={countryOptions}
                        placeholder='Select Country'
                    />
                    <div className='get-geo-location'>
                        <Icon className='map marker alternate' onMouseDown={() => {
                            if (window.navigator.geolocation) {
                                // Geolocation available
                                window.navigator.geolocation.getCurrentPosition(
                                    (position) => {
                                        console.log("Geo position: ", position);
                                        this.props.loadCountry(position);
                                    }, () => {
                                        //ignore
                                    });
                            }
                        }}/>
                    </div>
                </div>
                {/*<Divider/>*/}
                <div className='flex-row'>
                    <span className='label'>Map: </span>
                    <Dropdown
                        placeholder='Select Map'
                        fluid
                        value={this.state.map}
                        onChange={($, data) => {
                            this.setState({map: data.value});
                            setTimeout(() => {
                                this.forceUpdate();
                            }, 2000)
                        }}
                        selection
                        options={[
                            {
                                key:   'basic',
                                text:  'Basic',
                                value: 'basic',
                                image: {avatar: true, src: './images/basic.jpg'},
                            },
                            {
                                key:   'dark-matter',
                                text:  'Dark Matter',
                                value: 'dark-matter',
                                image: {avatar: true, src: './images/dark-matter.jpg'},
                            },
                            {
                                key:   'blackwhite',
                                text:  'Black & White',
                                value: 'blackwhite',
                                image: {avatar: true, src: './images/blackwhite.jpg'},
                            },
                            {
                                key:   'satellite',
                                text:  'Satellite',
                                value: 'satellite',
                                image: {avatar: true, src: './images/satellite.jpg'},
                            },
                            {
                                key:   'night',
                                text:  'World at Night',
                                value: 'night',
                                image: {avatar: true, src: './images/dark.jpg'},
                            },
                        ]}
                    />
                </div>
                <Divider/>
                <div>
                    <Checkbox toggle
                              onChange={() => this.setState({
                                  heatmapLayerHidden:    !this.state.heatmapLayerHidden,
                                  choroplethLayerHidden: !this.state.choroplethLayerHidden
                              })}
                              checked={!this.state.heatmapLayerHidden}
                              label='Fire Alerts (VIIRS)'/>
                    <Popup
                        position='top center'
                        wide
                        trigger={<Icon className='info circle' color='olive' name='circle'/>}
                        content={<div>Displays fire alerts based on NASA data (satellite VIIRS, 375 m precision)</div>}
                        on='hover'
                        hideOnScroll
                    />
                </div>
                <span className='secondary-label'>daily, 375 m, global, NASA</span>
                {!this.state.heatmapLayerHidden &&
                <Fragment>
                    <div className='slider heatmap'>
                        <span className='label'>Radius</span>
                        <Slider color="blue"
                                value={this.state.radius}
                                inverted
                                settings={{
                                    start:    2,
                                    min:      2,
                                    max:      10,
                                    step:     1,
                                    onChange: this.debouncedSetRadius
                                }}/>
                        <span className='value'>{this.state.radius}</span>
                    </div>

                    <div className='slider heatmap'>
                        <span className='label'>Blur</span>
                        <Slider color="blue"
                                value={this.state.blur}
                                inverted
                                settings={{
                                    start:    1,
                                    min:      1,
                                    max:      10,
                                    step:     1,
                                    onChange: this.debouncedSetBlur
                                }}/>
                        <span className='value'>{this.state.blur}</span>
                    </div>
                </Fragment>
                }
                <Divider/>
                <div>
                    <Checkbox toggle
                              onChange={() => this.setState({
                                  choroplethLayerHidden: !this.state.choroplethLayerHidden,
                                  heatmapLayerHidden:    this.state.choroplethLayerHidden
                              })}
                              checked={!this.state.choroplethLayerHidden}
                              label='Heatmap (Per Country)'/>
                    <Popup
                        position='top center'
                        wide
                        trigger={<Icon className='info circle' color='olive' name='circle'/>}
                        content={<div>Displays a color-coded country-grouped map of fire alerts based on NASA data
                            (satellite
                            VIIRS, 375 m precision)</div>}
                        on='hover'
                        hideOnScroll
                    />
                </div>
                <Divider/>
                <div className='daily-alerts-combobox'>
                    <span>Alerts: Per period</span>
                    <Checkbox toggle
                              inverted={"true"}
                              onChange={() => {
                                  if (!this.state.dailyAlerts) {
                                      let newSelectedDateRange = [moment(this.props.dateRange[1], 'YYYY-MM-DD').add(-1, 'days').format('YYYY-MM-DD'), this.props.dateRange[1]];
                                      this.setState({
                                          dailyAlerts:       true,
                                          selectedDateRange: newSelectedDateRange,
                                          selectedDateIndex: 1
                                      });

                                      this.readData(newSelectedDateRange);
                                  } else {
                                      this.setState({dailyAlerts: false})
                                  }
                              }}
                              checked={this.state.dailyAlerts}/>
                    <span>Today</span>
                    <Popup
                        position='top center'
                        wide
                        trigger={<Icon className='info circle' color='olive' name='circle'/>}
                        content={<div>Choose between all alerts for selected period and alerts for today (starting from
                            yesterday 00:00 GMT) </div>}
                        on='hover'
                        hideOnScroll
                    />
                </div>
                {!this.state.dailyAlerts ?
                    <Fragment>
                        <RangeDatePicker
                            popupPosition='bottom center'
                            title='Date range:'
                            className='fire-date-range'
                            disableClear
                            onChange={this.onSelectDate}
                            value={this.state.selectedDateRange}
                            dateRange={dateRange}
                        />
                        {/*<div className='animation-label'>Start animation</div>
                    <div className='slider'>
                        {this.animation === undefined
                            ? <Icon className='play' onClick={this.startAnimation.bind(this)}/>
                            : <Icon className='pause' onClick={() => {
                                clearInterval(this.animation);
                                this.animation = undefined;
                                this.forceUpdate();
                            }}/>
                        }
                        <Slider color="red" discrete
                                value={this.state.selectedDateIndex}
                                inverted
                                settings={{
                                    min:      1,
                                    max:      moment(this.state.selectedDateRange[1]).diff(moment(this.state.selectedDateRange[0]), 'days') + 1,
                                    step:     1,
                                    onChange: (value, meta) => {
                                        if (value !== this.state.selectedDateIndex) {
                                            this.setState({dailyAlerts: true, selectedDateIndex: value});
                                            if (!meta.triggeredByUser && this.animation !== undefined) {
                                                clearInterval(this.animation);
                                                this.animation = undefined;
                                                this.forceUpdate();
                                            }
                                        }
                                    }
                                }}/>
                        <span
                            className='value'>{moment(this.state.selectedDateRange[0]).add(this.state.selectedDateIndex - 1, 'days').format('DD-MM-yyyy')}</span>
                    </div>*/}
                    </Fragment>
                    : null
                }
                <Divider/>
            </div>

            <div className='powered-by'><span onMouseDown={(event) => {
                event.preventDefault();
                this.setState({aboutPopupOpen: true})
            }}>About us</span></div>
        </div>
    }

    onSelectDate = date => {
        this.setState({selectedDateRange: date, selectedDateIndex: undefined},
            () => {
                // hack for slider to apply max range on UI
                this.setState({
                    selectedDateRange: date,
                    selectedDateIndex: moment(date[1]).diff(moment(date[0]), 'days') + 1
                });
                this.readData(date);
            });
    };

    startAnimation = () => {
        const daysRange = moment(this.state.selectedDateRange[1]).diff(moment(this.state.selectedDateRange[0]), 'days');
        if (this.state.selectedDateIndex > daysRange) {
            this.setState({dailyAlerts: true, selectedDateIndex: 1});
        }

        this.animation = setInterval(() => {
            const daysRange = moment(this.state.selectedDateRange[1]).diff(moment(this.state.selectedDateRange[0]), 'days');
            if (this.state.selectedDateIndex > daysRange) {
                clearInterval(this.animation);
                this.animation = undefined;
                this.forceUpdate();
            } else {
                this.setState({selectedDateIndex: this.state.selectedDateIndex + 1});
            }
        }, 1000)
    }

    getMap() {
        const {filteredData, dataByCountry, topCountriesData} = this.state;

        const gradient = this.state.map !== 'night' && this.state.map !== 'dark-matter' ? {
            0.1: '#89BDE0', 0.2: '#96E3E6', 0.4: '#82CEB6',
            0.6: '#FAF3A5', 0.8: '#F5D98B', '1.0': '#DE9A96'
        } : {
            0:   '#EBF0FF', 0.1: '#BAD2EB', 0.2: '#8EBEDA', 0.4: '#5A9ECC',
            0.6: '#357EB9', 0.8: '#1C5BA6', '1.0': '#0B3281'
        }/*{
                0:   '#FCE51E', 0.1: '#7FD335', 0.2: '#2FAC66', 0.4: '#26547B',
                0.6: '#26547B', 0.8: '#342870', '1.0': '#340042'
            },
            {
                0:   '#DBE2AF', 0.1: '#E89B53', 0.2: '#E89B53', 0.4: '#E89B53',
                0.6: '#CF7047', 0.8: '#A93E3C', '1.0': '#7A002D'
            }*/;

        const southWest = L.latLng(-89.98155760646617, -180),
            northEast = L.latLng(89.99346179538875, 180);
        const bounds = L.latLngBounds(southWest, northEast);

        return <Fragment>
            {this.getCountryDetails(dataByCountry)}
            <Map center={this.state.zoomCenter} zoom={this.state.zoomLevel}
                 onViewportChange={({center, zoom}) => {
                     // this.setState({zoomLevel: zoom, zoomCenter: center})
                 }}
                 zoomControl={false} minZoom={2} maxZoom={17}
                 maxBounds={bounds}
                // onDrag={() => {
                //     const map = this.mapRef.current.leafletElement;
                //     map.panInsideBounds(bounds, { animate: false });
                // }}
                 ref={this.mapRef}>
                <Pane name='labels' style={{zIndex: 10000}}></Pane>

                {this.state.map === 'basic' &&
                <Fragment>
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        noWrap={false}
                    />

                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        pane='labels'
                        noWrap={false}
                    />
                </Fragment>
                }

                {this.state.map === 'dark-matter' &&
                <Fragment>
                    <Fragment>
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            noWrap={false}
                        />

                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            pane='labels'
                            noWrap={false}
                        />
                    </Fragment>
                </Fragment>
                }

                {this.state.map === 'blackwhite' &&
                <Fragment>
                    <TileLayer
                        url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner-background/{z}/{x}/{y}{r}.png"
                        attribution='Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        noWrap={false}
                    />
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        pane='labels'
                        noWrap={false}
                    />
                </Fragment>
                }

                {this.state.map === 'satellite' &&
                <Fragment>
                    <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                        noWrap={false}
                    />
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        pane='labels'
                        noWrap={false}
                    />
                </Fragment>
                }

                {this.state.map === 'night' &&
                <Fragment>
                    <TileLayer
                        url="https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default//GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg"
                        attribution='Imagery provided by services from the Global Imagery Browse Services (GIBS), operated by the NASA/GSFC/Earth Science Data and Information System (<a href="https://earthdata.nasa.gov">ESDIS</a>) with funding provided by NASA/HQ.'
                        noWrap={false}
                    />
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        pane='labels'
                        noWrap={false}
                    />
                </Fragment>
                }

                <GeoJSON
                    data={json}
                    style={(feature) => {
                        return {
                            fillColor:   'rgba(0,0,0,0.1)',
                            weight:      (this.state.selectedCountryLayer && feature.properties.iso_a3 === this.state.selectedCountryLayer.feature.properties.iso_a3) ? 3 : 0,
                            opacity:     1,
                            color:       (this.state.selectedCountryLayer && feature.properties.iso_a3 === this.state.selectedCountryLayer.feature.properties.iso_a3) ? '#777' : 'white',
                            dashArray:   '3',
                            fillOpacity: 0.7,
                        };
                    }}
                    onEachFeature={(feature, layer) => {
                        layer.on({
                            mouseover: this.highlightFeature,
                            mouseout:  this.resetHighlight,
                            click:     (e) => {
                                this.zoomToLayer(e.target);
                            }
                        });
                    }}
                    ref={this.geoJSONRef}/>

                {!this.state.choroplethLayerHidden && this.props.data !== undefined &&
                <GeoJSON
                    data={json}
                    style={(feature) => {
                        return {
                            fillColor:   this.getColor(dataByCountry[feature.properties.iso_a3]),
                            weight:      (this.state.selectedCountryLayer && feature.properties.iso_a3 === this.state.selectedCountryLayer.feature.properties.iso_a3) ? 3 : 1,
                            opacity:     1,
                            color:       '#777',
                            dashArray:   '0',
                            fillOpacity: 0.8
                        };
                    }}
                    onEachFeature={(feature, layer) => {
                        layer.on({
                            mouseover: this.highlightFeature,
                            mouseout:  (e) => this.resetHighlight(e, true, feature),
                            click:     (e) => {
                                this.zoomToLayer(e.target);
                            }
                        });
                    }}/>
                    /*<Choropleth
                        data={json}
                        valueProperty={(feature) => {
                            return dataByCountry[feature.properties.iso_a3];
                        }}
                        visible={(feature) => true/!*feature.id !== active.id*!/}
                        scale={this.state.map === 'dark' || this.state.map === 'dark-matter' ? ['#b3cde0', '#011f4b'] : ['#FFEDA0', '#E31A1C']}
                        steps={7}
                        mode='e'
                        style={{
                            fillColor:   'rgba(0,0,0,0.1)',
                            weight:      0,
                            opacity:     1,
                            color:       'white',
                            dashArray:   '3',
                            fillOpacity: 0.7,
                        }}
                        onEachFeature={(feature, layer) => {
                            layer.on({
                                mouseover: this.highlightFeature,
                                mouseout:  this.resetHighlight,
                                click:     (e) => {
                                    this.zoomToLayer(e.target);
                                }
                            });

                            // layer.bindPopup(feature.properties.name + ": "
                            //     + (dataByCountry[feature.properties.iso_a3] !== undefined ? dataByCountry[feature.properties.iso_a3] : "no") + " fire alerts")
                        }}
                        ref={(el) => el ? this.choropleth = el.leafletElement : this.choropleth = null}
                    />*/
                }

                {!this.state.heatmapLayerHidden &&
                <HeatmapLayer
                    // fitBoundsOnLoad
                    // fitBoundsOnUpdate
                    points={this.props.data.length > 0 ? filteredData
                        .map(d => [d.latitude, d.longitude, d.brightness]) : []}
                    longitudeExtractor={m => m[1]}
                    latitudeExtractor={m => m[0]}
                    gradient={gradient}
                    intensityExtractor={m => parseFloat(m[2])}
                    radius={Number(this.state.radius)}
                    blur={Number(this.state.blur)}
                    max={Number.parseFloat(this.state.max)}
                />
                }

                <ZoomControl position='topright'/>
                <Control position="topright">
                    <div className='zoom-buttons'>
                        <Button basic size={'medium'}
                                inverted={this.state.map === 'night' || this.state.map === 'dark-matter' || this.state.map === 'satellite'}
                                onClick={() => {
                                    this.zoomToEurope();
                                }}>
                            Europe
                        </Button>
                        <Button basic size={'medium'}
                                inverted={this.state.map === 'night' || this.state.map === 'dark-matter' || this.state.map === 'satellite'}
                                onClick={() => {
                                    this.zoomToWorld();
                                }}>
                            World
                        </Button>
                    </div>
                </Control>

                {(!this.mobile || (this.mobile && !this.state.selectedCountryLayer && this.state.menuHidden)) ?
                    <Control position="bottomright">
                        <Popup
                            position='left center'
                            wide
                            trigger={<Icon className='info circle legend-info-sign' color='olive' name='circle'/>}
                            content={<div>Color of the country depends on how many fire alerts were registered in this
                                country for period</div>}
                            on='hover'
                            hideOnScroll
                        />
                        <div className="legend">
                            <i style={{background: 'rgba(0,0,0,0.1)'}}></i> 0<br/>
                            <i style={{background: '#FED976'}}></i> 1–20<br/>
                            <i style={{background: '#FEB24C'}}></i> 20–50<br/>
                            <i style={{background: '#FD8D3C'}}></i> 50–100<br/>
                            <i style={{background: '#FC4E2A'}}></i> 100–200<br/>
                            <i style={{background: '#E31A1C'}}></i> 200–500<br/>
                            <i style={{background: '#BD0026'}}></i> 500–1000<br/>
                            <i style={{background: '#800026'}}></i> 1000+
                        </div>
                    </Control>
                    : null
                }

                <Control position="topleft">
                    {this.props.data.length > 0 && topCountriesData.length > 0 && (!this.mobile || (this.mobile && !this.state.selectedCountryLayer && this.state.menuHidden)) ?
                        <div className='top-countries-on-fire'>
                            <div className='top-countries-header-wrapper'>
                                <span className='header'>Top countries by fire alerts</span>
                                <Popup
                                    position='top center'
                                    wide
                                    trigger={<Icon className='info circle' color='olive' name='circle'/>}
                                    content={<div>Open fire accidents registered by NASA satellites</div>}
                                    on='hover'
                                    hideOnScroll
                                />
                            </div>
                            <div className='bar-chart-wrapper'>
                                <div className='countries-names'>
                                    {topCountriesData.map((topCountry) => {
                                        return <div key={topCountry.country}>{topCountry.country}</div>;
                                    })}
                                </div>
                                <BarChart
                                    width={this.mobile ? 120 : 240}
                                    height={this.mobile ? 80 : 120}
                                    data={topCountriesData}
                                    margin={{right: getOffset(topCountriesData.map(item => item.value[1])) + 10, left: 20}}
                                    layout="vertical"
                                >
                                    <XAxis dataKey="value" type="number" hide={true}/>
                                    <YAxis dataKey="country" type="category" hide={true} allowDataOverflow={false}
                                           axisLine={false} tickLine={false}/>
                                    <Bar label={{position: 'right', offset: 10}} dataKey="value" fill="#8884d8"
                                         isAnimationActive={true} animationBegin={0} animationDuration={400}
                                         animationEasing="ease-out"/>
                                </BarChart>
                                <div className='countries-back'>
                                    {topCountriesData.map((topCountry) => {
                                        return <div onMouseEnter={(event) => {
                                            event.target.classList.add("highlight")
                                        }}
                                                    onMouseLeave={(event) => {
                                                        event.target.classList.remove("highlight")
                                                    }}
                                                    onClick={(event) => {
                                                        if (!this.state.selectedCountryLayer || this.state.selectedCountryLayer.feature.properties.name !== topCountry.country) {
                                                            const geoJSON = this.geoJSONRef.current.leafletElement;
                                                            for (const layer of geoJSON.getLayers()) {
                                                                if (layer.feature.properties.name === topCountry.country) {
                                                                    this.zoomToLayer(layer);
                                                                }
                                                            }
                                                        }
                                                    }}
                                                    key={topCountry.country}>&nbsp;</div>;
                                    })}
                                </div>
                            </div>
                        </div>
                        : null
                    }
                </Control>
            </Map>
        </Fragment>;
    }

    getCountryDetails(dataByCountry) {
        const {countryDetails, countryDetailsLastWeek} = this.props;
        const isPortrait = window.orientation === 0;
        /*let ticks;
        if (countryDetails) {
            let dataPoints = countryDetails.map(countryDetail => countryDetail.y);
            let min = Math.min(...dataPoints);
            let max = Math.max(...dataPoints);
            ticks = [min, /!*min + Math.round((max - min) * 0.5),*!/ max]
        } else {
            ticks = [];
        }*/
        const data = countryDetails;
        const dataLastWeek = countryDetailsLastWeek;
        // const data = [
        //     {name: 'Page A', uv: 4000, pv: 2400, amt: 2400},
        //     {name: 'Page B', uv: 3000, pv: 1398, amt: 2210},
        //     {name: 'Page C', uv: 2000, pv: 9800, amt: 2290},
        //     {name: 'Page D', uv: 2780, pv: 3908, amt: 2000},
        //     {name: 'Page E', uv: 1890, pv: 4800, amt: 2181},
        //     {name: 'Page F', uv: 2390, pv: 3800, amt: 2500},
        //     {name: 'Page G', uv: 3490, pv: 4300, amt: 2100},
        // ];
        const firesNumber = this.state.selectedCountryLayer ? dataByCountry[this.state.selectedCountryLayer.feature.properties.iso_a3] !== undefined ? dataByCountry[this.state.selectedCountryLayer.feature.properties.iso_a3] : 0 : 0;
        const areaUnderFire = this.state.selectedCountryLayer ? (firesNumber * 0.888).toFixed(2) : 0;
        const areaUnderFirePercent = this.state.selectedCountryLayer ? (areaUnderFire / this.findCountryByIso3(this.state.selectedCountryLayer.feature.properties.iso_a3).area * 100).toFixed(4) : 0;

        let width = document.getElementsByClassName('trends').length > 0 ? document.getElementsByClassName('trends').item(0).offsetWidth : 0;

        return <div
            className={`country-details ${this.state.selectedCountryLayer && (!this.mobile || (this.mobile && this.state.menuHidden)) ? '' : 'hidden'}`}>
            <div className='left-info-pane'>
                <div className='country-name'>
                    {this.state.selectedCountryLayer ?
                        <Fragment>
                            <img
                                src={`https://www.countryflags.io/${this.state.selectedCountryLayer.feature.properties.iso_a2}/shiny/32.png`}
                                alt={this.state.selectedCountryLayer.feature.properties.iso_a2}/>
                            <h2>{this.state.selectedCountryLayer.feature.properties.name}</h2>
                        </Fragment>
                        : null
                    }
                </div>
                <div className='fires-count'>
                    <div>
                                <span
                                    className='fires-number'>{firesNumber} </span>
                        <span>{" fire alert(s) "}</span>
                        <div className='selected-dates'>{this.getDateSelected()}</div>
                        <div
                            className='selected-dates'>{"(appr. " + areaUnderFire + " km"}<sup>2</sup>{" on fire)"}
                        </div>
                        <div
                            className='selected-dates'>{"(" + areaUnderFirePercent + "% of territory)"}
                        </div>
                    </div>
                </div>
                <div className='close-button' onMouseDown={
                    () => {
                        this.state.selectedCountryLayer.setStyle({
                            weight:      0,
                            opacity:     1,
                            color:       'white',
                            dashArray:   '3',
                            fillOpacity: 0.7
                        });
                        this.setState({selectedCountryLayer: undefined});
                        this.props.resetCountry();
                        // this.zoomToWorld();
                    }}>
                    <Icon className='close'/>
                </div>
            </div>
            <div className='right-info-pane'>
                {!isPortrait &&
                <div>As of {this.getDateSelected()}, NASA confirmed {firesNumber} cases of wildfires in this country
                    <Popup
                        position='top center'
                        wide
                        trigger={<Icon className='info circle' style={{marginLeft: '3px'}} color='olive'
                                       name='circle'/>}
                        content={<div>On a daily basis, NASA provides free data on fires across the globe
                            based on photos taken from space.</div>}
                        on='hover'
                        hideOnScroll
                    />
                </div>
                }
                <div className='trends'>
                    <div className='last-week-trend'>
                        {/*{countryDetails ? <LineChart
                                    width={200}
                                    height={100}
                                    data={data}
                                >
                                    <CartesianGrid strokeDasharray="3 3"/>
                                    <XAxis dataKey="name" interval={0} angle={30} dx={20}/>
                                    <YAxis tickCount={10}/>
                                    <Legend/>
                                    <Line type="monotone" dataKey="pv" stroke="#8884d8" activeDot={{r: 8}}/>
                                    <Line type="monotone" dataKey="uv" stroke="#82ca9d"/>
                                </LineChart>
                                : null
                            }*/}

                        {width > 0 && countryDetails &&
                        <Fragment>
                            <span className='last-week-trend-label'>Last week fire activity</span>
                            <LineChart width={isPortrait && this.mobile ? width : width / 2} height={70}
                                       data={dataLastWeek}
                                       margin={{left: getOffset(dataLastWeek.map(item => item.y)) - 60, top: 2, right: 15}} ref={this.weekLinechartRef}>
                                <XAxis dataKey="x" hide={true} padding={{left: 0, right: 0}}/>
                                <YAxis hide={false} interval="preserveStartEnd" axisLine={false}
                                       tickLine={false}
                                       padding={{left: 0, top: 10, bottom: 12, right: 10}}/>
                                <CartesianGrid strokeDasharray="3 3"/>
                                <Tooltip contentStyle={{borderRadius: '5px', padding: '2px 10px'}}
                                         content={this.lineChartTooltip}/>
                                <Line type="monotone" dataKey="y" stroke="#8884d8" activeDot={{r: 4}}
                                      label={<CustomizedLabel/>}/>
                            </LineChart>
                        </Fragment>
                        }
                    </div>
                    <div className='last-week-trend'>
                        {/*{countryDetails ? <LineChart
                                    width={200}
                                    height={100}
                                    data={data}
                                >
                                    <CartesianGrid strokeDasharray="3 3"/>
                                    <XAxis dataKey="name" interval={0} angle={30} dx={20}/>
                                    <YAxis tickCount={10}/>
                                    <Legend/>
                                    <Line type="monotone" dataKey="pv" stroke="#8884d8" activeDot={{r: 8}}/>
                                    <Line type="monotone" dataKey="uv" stroke="#82ca9d"/>
                                </LineChart>
                                : null
                            }*/}
                        {width > 0 && countryDetails &&
                        <Fragment>
                            <span className='last-week-trend-label'>Last month fire activity</span>
                            <LineChart width={isPortrait && this.mobile ? width : width / 2} height={70} data={data}
                                       margin={{left: getOffset(data.map(item => item.y)) - 55, top: 2, right: 15}} ref={this.monthLinechartRef}>
                                <XAxis dataKey="x" hide={true} padding={{left: 0, right: 0}}/>
                                <YAxis hide={false} interval="preserveStartEnd" axisLine={false}
                                       tickLine={false}
                                       padding={{left: 0, top: 10, bottom: 12, right: 10}}/>
                                <CartesianGrid strokeDasharray="3 3"/>
                                <Tooltip contentStyle={{borderRadius: '5px', padding: '2px 10px'}}
                                         content={this.state.selectedCountryLayer ? this.lineChartTooltip : ""}/>
                                <Line type="monotone" dataKey="y" stroke="#8884d8" activeDot={{r: 2}}
                                      dot={{r: 2}}/>
                            </LineChart>
                        </Fragment>
                        }
                    </div>
                </div>
            </div>
        </div>;
    }

    findCountryByIso3(countryCodeIso3) {
        for (const country of countries) {
            if (country.cca3 === countryCodeIso3) {
                return country;
            }
        }
    }

    lineChartTooltip = ({active, payload, label}) => {
        if (active) {
            return (
                payload && payload[0] ?
                    <div className="recharts-default-tooltip" style={{
                        margin: 0, padding: '2px 10px', backgroundColor: 'rgb(255, 255, 255)',
                        border: '1px solid rgb(204, 204, 204)', whiteSpace: 'nowrap', borderRadius: '5px'
                    }}>
                        <p className="recharts-tooltip-label" style={{margin: 0}}>Fires: {payload[0].value}</p>
                        <p className="recharts-tooltip-label"
                           style={{margin: 0}}>{moment(label, 'DD/MM/YYYY').format('dddd')}</p>
                        <p className="recharts-tooltip-label" style={{margin: 0}}>{label}</p>
                    </div>
                    : null
            );
        }

        return null;
    };

    getDateSelected() {
        const today = moment(new Date());
        const yesterday = moment(new Date()).add(-1, "days");
        if ((moment(this.state.selectedDateRange[0]).startOf('day').isSame(moment(this.state.selectedDateRange[1]).startOf('day'))
            && moment(this.state.selectedDateRange[0]).startOf('day').isSame(today.startOf('day')))
            || ((moment(this.state.selectedDateRange[0]).startOf('day').isSame(yesterday.startOf('day')) ||
                moment(this.state.selectedDateRange[1]).startOf('day').isSame(today.startOf('day'))))
            || this.state.dailyAlerts) {
            return 'today'
        } else if (moment(this.state.selectedDateRange[0]).startOf('day').isSame(moment(this.state.selectedDateRange[1]).startOf('day'))) {
            return moment(this.state.selectedDateRange[0]).format('DD/MM/YYYY');
        } else {
            return moment(this.state.selectedDateRange[0]).format('DD/MM/YYYY') + " - " + moment(this.state.selectedDateRange[1]).format('DD/MM/YYYY');
        }
    }

    zoomToEurope() {
        const map = this.mapRef.current.leafletElement;
        map.setView([50, 10], 4);
    }

    zoomToWorld() {
        const map = this.mapRef.current.leafletElement;
        map.setView([30, 0], 2);
    }

    getColor = (d) => {
        return d > 1000 ? '#800026' :
            d > 500 ? '#BD0026' :
                d > 200 ? '#E31A1C' :
                    d > 100 ? '#FC4E2A' :
                        d > 50 ? '#FD8D3C' :
                            d > 20 ? '#FEB24C' :
                                d >= 1 ? '#FED976' :
                                    'rgba(0,0,0,0.1)';
    }

    highlightFeature = (e) => {
        let layer = e.target;
        // this.setState({highlightedLayer: layer})

        if (layer !== this.state.selectedCountryLayer) {
            layer.setStyle({
                weight:      3,
                color:       '#777',
                dashArray:   '4',
                fillOpacity: 0.8
            });

            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                layer.bringToFront();
            }
        }
    }

    resetHighlight = (e, choropleth, feature) => {
        let layer = e.target;

        if (layer !== this.state.selectedCountryLayer) {
            if (choropleth) {
                layer.setStyle({
                    weight:      (this.state.selectedCountryLayer && feature.properties.iso_a3 === this.state.selectedCountryLayer.feature.properties.iso_a3) ? 3 : 1,
                    opacity:     1,
                    color:       '#777',
                    dashArray:   '0',
                    fillOpacity: 0.8
                });
            } else {
                layer.setStyle({
                    weight:      0,
                    opacity:     1,
                    color:       'white',
                    dashArray:   '3',
                    fillOpacity: 0.7
                });
            }
        }
    }

    zoomToLayer = (layer) => {
        if (this.state.selectedCountryLayer !== layer) {
            this.setState({/*highlightedLayer: undefined, */selectedCountryLayer: layer})

            const {loadCountryDetails} = this.props;
            const map = this.mapRef.current.leafletElement;
            // let bounds = layer.getBounds();
            const southWest = L.latLng(layer.getBounds().getSouth() - 0.35 * (Math.abs(layer.getBounds().getNorth() - layer.getBounds().getSouth())), layer.getBounds().getWest()),
                northEast = L.latLng(layer.getBounds().getNorth(), layer.getBounds().getEast());
            const bounds = L.latLngBounds(southWest, northEast);
            map.fitBounds(bounds);

            if (this.state.selectedCountryLayer !== undefined) {
                this.state.selectedCountryLayer.setStyle({
                    weight:      0,
                    opacity:     1,
                    color:       'white',
                    dashArray:   '3',
                    fillOpacity: 0.7
                });
            }

            layer.setStyle({
                weight:      3,
                color:       '#777',
                dashArray:   '2',
                fillOpacity: 0.8
            });

            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                layer.bringToFront();
            }

            loadCountryDetails(layer.feature.properties.iso_a3);
        }
    }

    render() {
        const {loading} = this.props;

        // console.log(this.props.data)
        if (this.state.selectedDateRange) {
            return (
                <div
                    className={`leaflet-map ${this.state.darkTheme ? 'dark' : 'light'} ${this.state.map} ${this.state.choroplethLayerHidden ? ' choropleth-hidden' : ''}`}>
                    <div className={`piptik ${this.state.menuHidden ? 'menu-hidden' : ''}`}
                         onMouseDown={this.debouncedShowHideMenu}>
                        {this.state.menuHidden
                            ? <Icon className='angle right'></Icon>
                            : <Icon className='angle left'></Icon>
                        }
                    </div>
                    <div className={`left-panel-wrapper ${this.state.menuHidden ? 'menu-hidden' : ''}`}>
                        <div className='header-menu'>
                            <div className='header-menu-column header-menu-column-static'>
                                <div className='header-logo' onMouseDown={() => {
                                    this.setState({menuHidden: !this.state.menuHidden});
                                }}>
                                    <div><Icon className='th'/></div>
                                </div>
                                <div className='header-item active'>
                                    <span className='section-header'><Icon className='fire'/></span>
                                </div>
                                <div className='header-item'>
                                    <span className='section-header'><Icon className='rain'/></span>
                                </div>
                                <div>
                                </div>
                            </div>
                            <div className='header-menu-column header-menu-column-settings'>
                                {this.getMenu()}
                            </div>
                        </div>
                    </div>

                    <div className='map-wrapper'>
                        <Loader content='Loading' active={loading}/>
                        {/*<Dimmer.Dimmable blurring dimmed={loading}>*/}
                        {this.getMap()}
                        {/*</Dimmer.Dimmable>*/}
                    </div>

                    <Modal
                        closeIcon
                        open={this.state.aboutPopupOpen}
                        size='small'
                        onClose={() => this.setState({aboutPopupOpen: false})}
                        onOpen={() => this.setState({aboutPopupOpen: true})}
                    >
                        <Header icon='globe' content='About'/>
                        <Modal.Content>
                            <div className='marketing-text'>
                                <p>
                                    As part of CSR initiatives, Luxoft Horizon team created a web application to provide
                                    information about global wildfires based on data from <a
                                    href='https://firms.modaps.eosdis.nasa.gov/active_fire/#firms-txt'>NASA</a>.
                                </p>
                                <p>
                                    This was done to provide clear, quantitative statistics on wildfires to interested
                                    individuals so they can research this important ecological phenomenon. This
                                    application enables people invested in reducing the harm from wildfires to be
                                    empowered by pure data so they can grasp the full picture of the scale of wildfires
                                    worldwide, focusing specifically on risk levels, countries, and other additional
                                    facets. This information can guide users in providing help where and when it is
                                    needed while also providing datapoints from which we might extrapolate the ability
                                    to predict future fires. In addition, this is a tool that will let volunteers,
                                    journalists, ecologists, and social media users shine more light on this important
                                    issue.
                                </p>
                                <p>
                                    <a href='mailto:fireradar@luxoft.com'>Contact us</a> for more information
                                </p>
                            </div>
                        </Modal.Content>
                        {/*<Modal.Actions>
                            <Button color='red' onClick={() => setOpen(false)}>
                                <Icon name='remove' /> No
                            </Button>
                            <Button color='green' onClick={() => setOpen(false)}>
                                <Icon name='checkmark' /> Yes
                            </Button>
                        </Modal.Actions>*/}
                    </Modal>
                </div>
            );
        } else {
            return null;
        }
    }
}

export default connect(
    state => {
        return {
            loading:                state.data.loading,
            data:                   dataSelector(state),
            dateRange:              dateRangeSelector(state),
            country:                state.data.country,
            countryDetails:         state.data.countryDetails,
            countryDetailsLastWeek: state.data.countryDetailsLastWeek,
        };
    },
    {
        loadData,
        loadCountry,
        loadCountryDetails,
        loadDateRange,
        resetCountry
    }
)(LeafletMap);