import React, { Component } from 'react';
import { StateMap } from './StateMap';
import { Button } from 'semantic-ui-react';
import _ from 'lodash';
import { loadAllData, DataCollection, StateName, ElectionData, ElectionStateResult, MIN_YEAR, MAX_YEAR, YEAR_STEP } from './DataHandling';
import Slider from 'rc-slider';
import { LineChart } from 'react-easy-chart';

import 'rc-slider/assets/index.css';
import './App.css';

interface AppState {
    year: number,
    selectedStateCode: string,
    rawResults: boolean,
    //TODO - figure out this type and use it everywhere
    usTopoJson: any,
    stateNames: StateName[],
    electionData: ElectionData
}

class App extends Component<{}, AppState> {
    state : AppState = {
        year: 0,
        selectedStateCode: undefined,
        rawResults: true,
        usTopoJson: null,
        stateNames: null,
        electionData: null
    };

    componentDidMount() {
        this.loadDataAsync();
    }

    async loadDataAsync() {
        let data: DataCollection = await loadAllData();
        let yearState = {year: parseInt(_.min(Object.keys(data.electionData)), 10)};
        this.setState(Object.assign(yearState, data));
    }

    dAdvantageFromVotes(stateData: ElectionStateResult, baselineDAdvantage = 0): number {
        let dAdvantage = ((stateData.dCount - stateData.rCount) * 100.0) / stateData.totalCount;
        return dAdvantage - baselineDAdvantage;
    }

    colorFromDAndRVote(dVote: number, rVote: number, totalVote: number, baselineDAdvantage = 0) {
        // http://colorbrewer2.org/?type=diverging&scheme=RdBu&n=11
        const _colors =
            ['#67001f', '#b2182b', '#d6604d', '#f4a582', '#fddbc7', '#f7f7f7', '#d1e5f0', '#92c5de', '#4393c3', '#2166ac', '#053061'];
        
        let dAdvantage = ((dVote - rVote) * 100.0) / totalVote;
        // 5 red, 5 blue (don't use middle one)
        const increment = 3;
        if (dAdvantage < baselineDAdvantage - 4 * increment) {
            return _colors[0];
        }
        if (dAdvantage < baselineDAdvantage - 3 * increment) {
            return _colors[1];
        }
        if (dAdvantage < baselineDAdvantage - 2 * increment) {
            return _colors[2];
        }
        if (dAdvantage < baselineDAdvantage - 1 * increment) {
            return _colors[3];
        }
        if (dAdvantage < baselineDAdvantage) {
            return _colors[4];
        }

        if (dAdvantage > baselineDAdvantage + 4 * increment) {
            return _colors[10];
        }
        if (dAdvantage > baselineDAdvantage + 3 * increment) {
            return _colors[9];
        }
        if (dAdvantage > baselineDAdvantage + 2 * increment) {
            return _colors[8];
        }
        if (dAdvantage > baselineDAdvantage + increment) {
            return _colors[7];
        }
        return _colors[6];
    }

    textFromDAdvantage(dAdvantage: number) {
        if (dAdvantage > 0) {
            return "D+" + (dAdvantage).toFixed(1) + "%";
        }
        if (dAdvantage < 0) {
            return "R+" + (-1 * dAdvantage).toFixed(1) + "%";
        }
        return "Even";
    }

    onSliderChange = (value) => {
        this.setState({ year: value });
    }

    onStateSelected = (stateCode) => {
        this.setState({ selectedStateCode: stateCode });
    }

    render() {
      if (!this.state.usTopoJson) {
          return <div>Loading</div>;
      }

    let stateColors = new Map<string, string>();
    let stateTitles = new Map<string, string>();
    let nationalDAdvantage = 0;
        let lineChart = undefined;
        if (this.state.stateNames && this.state.year) {
            let electionData = this.state.electionData[this.state.year];
            let dTotal = 0, rTotal = 0, allTotal = 0;
            electionData.forEach(value => {
                dTotal += value.dCount;
                rTotal += value.rCount;
                allTotal += value.totalCount;
            });
            nationalDAdvantage = ((dTotal - rTotal) * 100.0) / allTotal;
            let baselineDAdvantage = (this.state.rawResults) ? 0 : nationalDAdvantage;
            for (let i in this.state.stateNames) {
                let stateCode = this.state.stateNames[i].code;
                //TODO optimize
                let stateData = _.find(electionData, electionDataObj => electionDataObj.stateCode === stateCode);
                if (stateData) {
                    // TODO - duplication or something
                    let dAdvantage = this.dAdvantageFromVotes(stateData, baselineDAdvantage);
                    stateColors[stateCode] = this.colorFromDAndRVote(stateData.dCount, stateData.rCount, stateData.totalCount, baselineDAdvantage);
                    stateTitles[stateCode] = this.textFromDAdvantage(dAdvantage);
                }
            }

            if (this.state.selectedStateCode) {
                let data = [];
                for (let year = MIN_YEAR; year <= MAX_YEAR; year += YEAR_STEP) {
                    let yearBaselineDAdvantage = 0;
                    let electionData = this.state.electionData[year];
                    if (!this.state.rawResults) {
                        //TODO - extract this and use above
                        electionData.forEach(value => {
                            dTotal += value.dCount;
                            rTotal += value.rCount;
                            allTotal += value.totalCount;
                        });
                        yearBaselineDAdvantage = ((dTotal - rTotal) * 100.0) / allTotal;
                    }
                    //TODO optimize
                    let stateData = _.find(electionData, electionDataObj => electionDataObj.stateCode === this.state.selectedStateCode);
                    data.push({ x: year, y: this.dAdvantageFromVotes(stateData, yearBaselineDAdvantage) });
                }
                // TODO optimize this
                let stateNameObj = _.find(this.state.stateNames, stateNameObj => stateNameObj.code === this.state.selectedStateCode);
                lineChart = <div style={{ width: 600 }}>{stateNameObj.name}
                    <LineChart width={500} height={300}
                        margin={{ top: 10, right: 10, bottom: 50, left: 50 }}
                        data={[data]} axes grid axisLabels={{ x: "Year", y: "D advantage" }} xType={'text'} xTicks={data.length - 1} />
                    </div>;
            }
        }

        // https://react-component.github.io/slider/examples/slider.html
      return (
          <div className="App">
            <svg width="1100" height="500">
                <StateMap usTopoJson={this.state.usTopoJson}
                          stateNames={this.state.stateNames}
                          stateColors={stateColors}
                          stateTitles={stateTitles}
                          stateSelectedCallback={this.onStateSelected}
                          x={0}
                          y={0}
                          width={500}
                          height={500}/>
              </svg>
              <div>
                  <Button.Group>
                      <Button active={this.state.rawResults} onClick={() => this.setState({ rawResults: true })}>Actual results</Button>
                      <Button active={!this.state.rawResults} onClick={() => this.setState({ rawResults: false })}>Relative to popular vote</Button>
                  </Button.Group>
              </div>
              <div>Year {this.state.year} Popular vote: {this.textFromDAdvantage(nationalDAdvantage)}</div>
              {lineChart}
            <div style={{width: 500}}>
                <Slider min={MIN_YEAR} max={MAX_YEAR} step={YEAR_STEP} value={this.state.year} onChange={this.onSliderChange}/>
            </div>

          </div>
      );
  }
}

export default App;
