import React, { Component, FormEvent, FormEventHandler, ChangeEventHandler, ChangeEvent } from 'react';
const tfnswData: TfNSWData = require('./data/data.json');

const WIKIPEDIA_URL = "//en.wikipedia.org/wiki/";
const TFNSW_ARTICLE_URL = "//transportnsw.info/travel-info/ways-to-get-around/train/fleet-facilities/";
const TFNSW_IMAGE_URL = "//transportnsw.info/sites/default/files/styles/wysiwyg_large_1140/public/image/2018/04/";
const idRegex = /^([A-Z]{0,3})?([0-9]{4})$/;

class SearchResult {
    public queryLetter: string = "";
    public queryNumber: number = 0;
    public exact!: Range;
    public fuzzy: Range[] = [];
    public car!: Car;
    public extraInfo: string = "";
    public similarRanges: Range[] = [];
}

interface Range extends Object {
    start: number;
    end: number;
    letter: string;
    set: string;
    extra: string;
}

interface TfNSWData {
    ranges: RangeMap;
    sets: SetMap;
    cars: CarMap;
    carnames: CarNameMap;
    extras: ExtrasMap;
}

interface RangeMap {
    [propName: string]: Range[];
}

interface SetMap {
    [propName: string]: TrainSet;
}

interface TrainSet {
    tfnsw: string;
    name: string;
    wiki: string;
}

interface CarNameMap {
    [propName: string]: CarName;
}

interface CarName {
    title: string;
}

interface CarMap {
    [propName: string]: Car;
}

interface Car {
    href: string;
    img: string;
}

interface ExtrasMap {
    [propName: string]: Extra;
}

interface Extra {
    info: string;
}


class AppState {
    public carId = "";
    public showError = false;
    public searchResult = new SearchResult();
}

export default class App extends Component<{}, AppState> {
    private data: TfNSWData;

    constructor(props) {
        super(props);
        this.data = tfnswData;
        this.state = new AppState();

        //Bind event handers so `this` refers to this class, not element that event fired on
        this.onChangeCarId = this.onChangeCarId.bind(this);
        this.onFormSubmit = this.onFormSubmit.bind(this);
        this.onClickSuggestion = this.onClickSuggestion.bind(this);
    }

    componentWillMount() {
    }

    onChangeCarId(e: ChangeEvent) {
        let target = e.target as HTMLInputElement;
        this.setState({
            carId: target.value
        });
    }

    onFormSubmit(e: FormEvent) {
        e.preventDefault();
        this.performSearch(this.state.carId);
    }

    onClickSuggestion(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        let target = e.target as HTMLButtonElement;
        let carId = target.dataset.carid;
        this.setState({
            carId: carId
        });
        this.performSearch(carId);
    }

    /**
     * Uses the current value of this.state.carId to search for a given car
     * and update the state with the results.
     */
    performSearch(id: string) {
        const partialState: any = {};
        const searchResult = this.searchId(id);
        console.log(searchResult);

        partialState.showError = !searchResult;
        partialState.searchResult = searchResult;

        this.setState(partialState);
    }

    /**
     * Searches for the given Car ID and returns exact and fuzzy matches.
     * @param {string} id 
     * @returns {SearchResult} Returns search results, or null if an error occurred.
     */
    searchId(id: string) {
        const match = id.match(idRegex);
        const result = new SearchResult();

        if (match === null) {
            //showAlert("Oops! That ID doesn't follow a valid format (eg. D1023)");
            return false;
        }

        result.queryLetter = match[1];
        result.queryNumber = parseInt(match[2]);
        const carLetterData = this.data.ranges[result.queryLetter];

        // if (typeof carLetterData === "undefined") {
        //     showAlert("Sorry! We couldn't find a Sydney Trains car for that ID");
        //     return false;
        // }
        if (typeof carLetterData !== "undefined") {
            //Just look through this letter
            for (let range of carLetterData) {
                if (checkIdInRange(result.queryNumber, range)) {
                    result.exact = range;
                    break;
                }
            }
        } else {
            //Look through all letters
            for (let key of Object.keys(this.data.ranges)) {
                let carLetterData = this.data.ranges[key];
                for (let range of carLetterData) {
                    if (checkIdInRange(result.queryNumber, range)) {
                        result.fuzzy.push(range);
                        break;
                    }
                }
            }
        }

        if (!result.exact && result.fuzzy.length === 0) {
            return null;
        }

        //Populate rich info for exact match
        if (result.exact) {
            let range = result.exact;

            //Populate with data
            result.car = this.data.cars[range.set + "/" + result.queryLetter];

            //Get all models of this set/type
            for (let range of carLetterData) {
                if (range.set == result.exact.set) {
                    result.similarRanges.push(range);
                }
            }

            //Populate extra info
            if (range.extra !== '') {
                let extra = this.data.extras[range.extra];
                if (typeof extra !== "undefined") {
                    result.extraInfo = extra.info;
                } else if (range.extra.indexOf("VS") === 0) {
                    result.extraInfo = this.data.extras["VS"].info.replace("$1", range.extra.substring(2));
                }
            }
        }

        return result;
    }

    render() {
        const exact = this.state.searchResult.exact;
        const errorStyle = this.state.showError ? {} : {display: "none"};
        const noExactWarningStyle = !this.state.searchResult.exact && this.state.searchResult.fuzzy.length > 0 ? {} : {display: "none"};

        return ( 
        <div>
            <Form value={this.state.carId} onChangeInput={this.onChangeCarId} onSubmit={this.onFormSubmit} />
            <div className="alert alert-danger" role="alert" style={errorStyle}>
                Sorry, we couldn't find any cars with that ID.
            </div>
            <div className="alert alert-warning" role="alert" style={noExactWarningStyle}>
                We couldn't find an exact match for that ID, here are some suggestions.
            </div>

            <div className="btn-container">
            {this.state.searchResult 
                && this.state.searchResult.fuzzy.map((range) => {
                    let carID = range.letter + this.state.searchResult.queryNumber;
                    return <button key={range.letter} type="button" className="btn btn-info" onClick={this.onClickSuggestion} data-carid={carID}>{carID}</button>
                })}
            </div>

            {exact && (
            <div id="results">
                <h3>
                    <span id="carSet">{exact.set} set</span>
                    <span> - </span>
                    <span id="carName">{this.data.carnames[exact.letter].title}</span>
                </h3>
                <h4 id="carRanges">{this.state.searchResult.similarRanges.map((range: Range) => {
                    return range.letter + range.start + '-' + range.end;
                }).join(", ")}</h4>
                <p id="carInfo">{this.state.searchResult.extraInfo}</p>
                <img id="carImg" className="mb-2" 
                    src={TFNSW_IMAGE_URL + this.state.searchResult.car.img} />

                <div className="btn-container">
                    <a className="btn btn-info" id="car_wiki" target="_blank"
                        href={WIKIPEDIA_URL + this.data.sets[exact.set].wiki}>View more on Wikipedia</a>
                    <a className="btn btn-info" id="car_tfnsw" target="_blank"
                        href={TFNSW_ARTICLE_URL + this.data.sets[exact.set].tfnsw + this.state.searchResult.car.href}>
                        View more on Sydney Trains</a>
                </div>
            </div>
            )}
        </div>);
    }
}

class Form extends Component<{
    value: any, 
    onSubmit: FormEventHandler, 
    onChangeInput: ChangeEventHandler
}, {}> {
    render() {
        return (
        <form className="mb-4" onSubmit={this.props.onSubmit}>
            <div className="form-group">
                <label htmlFor="carId">Car Number: </label>
                <input className="form-control" id="carId" type="text" 
                    value={this.props.value} onChange={this.props.onChangeInput} required />
            </div>
            <input className="btn btn-primary" type="submit" value="Search" />
        </form>);
    }
}

/**
 * Checks whether a given car number is within the given range.
 */
function checkIdInRange(id: number, range: Range) {
    return (id >= range.start && id <= range.end);
}

//From https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}