import React, { Component, FormEvent, FormEventHandler, ChangeEventHandler, ChangeEvent } from 'react';
import tfnswData from "./data/data.json";

const WIKIPEDIA_URL = "//en.wikipedia.org/wiki/";
const TFNSW_ARTICLE_URL = "//transportnsw.info/travel-info/ways-to-get-around/train/fleet-facilities/";
//const TFNSW_IMAGE_URL = "//transportnsw.info/sites/default/files/styles/wysiwyg_large_1140/public/image/2018/04/";
const TFNSW_IMAGE_URL = "images/";
const idRegex = /^([A-Z]{0,3})?([0-9]{4})?$/;

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
        this.onFormReset = this.onFormReset.bind(this);
        this.onClickSuggestion = this.onClickSuggestion.bind(this);
    }

    onChangeCarId(e: ChangeEvent) {
        let target = e.target as HTMLInputElement;
        let value = target.value.replace(/[^A-Z\d]/i, '').toUpperCase();
        this.setState({
            carId: value
        });
        this.performSearch(value);
    }

    onFormSubmit(e: FormEvent) {
        e.preventDefault();
    }

    onFormReset(e: FormEvent) {
        this.setState({
            carId: ""
        });
        this.performSearch("");
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
        let searchResult = this.searchId(id);

        partialState.showError = !searchResult && id !== "";
        if (!searchResult) {
            //If the search failed, populate the result with an empty result
            searchResult = new SearchResult();
        }

        partialState.searchResult = searchResult;

        this.setState(partialState);
    }

    /**
     * Searches for the given Car ID and returns exact and fuzzy matches.
     * @param {string} id 
     * @returns {SearchResult} Returns search results, or null if an error occurred.
     */
    searchId(id: string) : SearchResult {
        const match = id.match(idRegex);
        const result = new SearchResult();

        if (match === null) {
            return null;
        }

        result.queryLetter = match[1];
        result.queryNumber = parseInt(match[2]);
        const carLetterData = this.data.ranges[result.queryLetter];

        if (typeof carLetterData !== "undefined") {
            //Just look through this letter
            for (let range of carLetterData) {
                if (checkIdInRange(result.queryNumber, range)) {
                    result.exact = range;
                    break;
                }
            }
        }
        
        if (!result.exact) {
            let fuzzy : Range[] = [];
            if (result.queryNumber) {
                fuzzy = this.getFuzzyByNumber(result.queryNumber)
            }
            if (result.queryLetter) {
                fuzzy = fuzzy.concat(this.getFuzzyByLetter(result.queryLetter));
            }   
            result.fuzzy = fuzzy;
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

    /**
     * Look through all letters to find cars matching the given number.
     * @param number 
     */
    getFuzzyByNumber(number: number) : Range[] {
        const fuzzy : Range[] = [];

        for (let key of Object.keys(this.data.ranges)) {
            let carLetterData = this.data.ranges[key];
            for (let range of carLetterData) {
                if (checkIdInRange(number, range)) {
                    fuzzy.push(range);
                    break;
                }
            }
        }
        return fuzzy;
    }

    getFuzzyByLetter(letter: string) : Range[] {
        const fuzzy : Range[] = [];
        const sets = {};
        const letters = {};

        for (let key of shuffle(Object.keys(this.data.ranges))) {
            if (key.indexOf(letter) !== -1) {
                let carLetterData = this.data.ranges[key];
                for (let range of carLetterData) {
                    if (!sets[range.set] || !letters[key]) {
                        fuzzy.push(range);
                        sets[range.set] = true;
                        letters[key] = true;
                    }
                }
            }
        }

        return fuzzy;
    }

    /**
     * Generates some random suggestions to prompt the user.
     */
    generateSuggestions() : Range[] {
        const results : Range[] = [];
        const sets = {};

        for (let key of shuffle(Object.keys(this.data.ranges))) {
            let carLetterData = this.data.ranges[key];
            for (let range of carLetterData) {
                //Make sure this set hasn't already been added
                if (!sets[range.set]) {
                    results.push(range);
                    sets[range.set] = true;
                }
            }
        }

        return results.slice(0, 12);
    }

    render() {
        const exact = this.state.searchResult.exact;
        const isRandomSuggestion = this.state.carId == "";
        const suggestionButtons = (isRandomSuggestion) 
            ? this.generateSuggestions() : this.state.searchResult.fuzzy;

        return ( 
        <div>
            <Form value={this.state.carId} onChangeInput={this.onChangeCarId} onSubmit={this.onFormSubmit} onReset={this.onFormReset} />

            {this.state.showError && 
            (<div className="alert alert-danger" role="alert">
                Sorry, we couldn't find any cars with that ID.
            </div>)}

            {!isRandomSuggestion && !this.state.searchResult.exact && this.state.searchResult.fuzzy.length > 0 &&
            (<div className="alert alert-warning" role="alert">
                We couldn't find an exact match for that ID, here are some suggestions.
            </div>)}

            {isRandomSuggestion && 
            (<div className="alert alert-primary" role="alert">
                Try some of these suggestions if you're not on a train right now.
            </div>)}

            <div id="suggestionBtnContainer">
            {suggestionButtons.map((range) => {
                    let carID = range.letter + 
                        (!isRandomSuggestion && this.state.searchResult.queryNumber
                            ? this.state.searchResult.queryNumber 
                            : getRandomInt(range.start, range.end + 1));
                    return <button key={carID} type="button" className="btn btn-info" onClick={this.onClickSuggestion} data-carid={carID}>{carID}</button>
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

                <div className="btn-container" data-cols='2'>
                    <a className="btn btn-info" id="carWiki" target="_blank"
                        href={WIKIPEDIA_URL + this.data.sets[exact.set].wiki}>View more on Wikipedia</a>
                    <a className="btn btn-info" id="carTfnsw" target="_blank"
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
    onReset: FormEventHandler,
    onChangeInput: ChangeEventHandler
}, {}> {
    render() {
        return (
        <form className="mb-4" onSubmit={this.props.onSubmit} onReset={this.props.onReset}>
            <div className="input-group mb-2">
                <div className="input-group-prepend">
                    <span className="input-group-text">Car Number: </span>
                </div>
                <input className="form-control" id="carId" type="text" 
                    value={this.props.value} onChange={this.props.onChangeInput} required />
                {this.props.value !== "" && 
                (<div className="input-group-append">
                    <input className="btn btn-danger" type="reset" value="Clear" />
                </div>)}
            </div>
        </form>);
    }
}

/**
 * Checks whether a given car number is within the given range.
 */
function checkIdInRange(id: number, range: Range) : boolean {
    return (id >= range.start && id <= range.end);
}

/**
 * Gets a random integer between two given integers.
 * @param min Inclusive minimum.
 * @param max Exclusive maximum.
 */
function getRandomInt(min: number, max: number) : number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;   
}

/**
 * Shuffle an array using the Fisher-Yates algorithm.
 * From https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
 * @param array
 */
function shuffle(array: any[]) : any[] {
    let currentIndex = array.length, temporaryValue, randomIndex;
  
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
  
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
    
        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
  
    return array;
}

/**
 * Get a URL parameter by name.
 * From https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
 */
function getParameterByName(name: string, url: string) : string {
    if (!url) url = window.location.href;
    name = name.replace(/[[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}