// REFERENCES USED
// GOOGLE API CODE: https://developers.google.com/sheets/api/quickstart/js
// METER CODE: 

// Load the Visualization API and the corechart package.
google.charts.load('current', {'packages':['corechart','table']});

// Client ID and API key from the Developer Console
var CLIENT_ID = '122870931289-7rl2vgesraesbbf1jmdabo6pb9te9l2o.apps.googleusercontent.com';
var API_KEY = 'AIzaSyBK1IQm9K8aPKOdBeDCb33Qn745F2LYgGM';

// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = "https://www.googleapis.com/auth/spreadsheets";

// Data variables
var TYPE = 0;
var STANDARD_DRINKS = 1;
var DATE_TIME = 2;
var INSTANT_BAC = 3;
var TOTAL_DRINKS = 4;
var TOTAL_BAC = 5;
var HOUR_PERIOD = 6;
var ADJ_BAC = 7;
var TIME_SOBER = 8;

var authorizeButton = document.getElementById('authorize-button');
var signoutButton = document.getElementById('signout-button');
var body = document.getElementById('info');
var showButton = document.getElementById('show-button');
var hideButton = document.getElementById('hide-button');
var historyDiv = document.getElementById('history');

window.ProgressBar;

// progressbar.js@1.0.0 version is used
// Docs: http://progressbarjs.readthedocs.org/en/1.0.0/
var bar = new ProgressBar.SemiCircle('#bacMeter', {
    strokeWidth: 6,
    color: '#FFEA82',
    trailColor: '#eee',
    trailWidth: 1,
    easing: 'easeInOut',
    duration: 1400,
    svgStyle: null,
    text: {
        value: '',
        alignToBottom: false,
        position: 'center'
    },
    from: {color: '#FFEA82'},
    to: {color: '#ED6A5A'},
    // Set default step function for all animate calls
    step: (state, bar) => {
        bar.path.setAttribute('stroke', state.color);
        var value = bar.value() * 0.4;
        bar.setText(meterMap(value));
        if (meterMap(value) == "Sober") {
            bar.text.style.color = '#9dd81e';
        } else {
            bar.text.style.color = state.color;
        }
    }
});
bar.text.style.fontFamily = '"Signika", Helvetica, sans-serif';
bar.text.style.fontSize = '20px';

var weight = 120.0;
var male = false;
var zero = 0.010;

// UI FUNCTIONALITY
/* When the user clicks on the button, 
toggle between hiding and showing the dropdown content */
function showProfile() {
    document.getElementById("profile").classList.toggle("show");
}

function showHistory() {
    historyDiv.style.display = 'block';
    hideButton.style.display = 'block';
    showButton.style.display = 'none';
}

function hideHistory() {
    historyDiv.style.display = 'none';
    hideButton.style.display = 'none';
    showButton.style.display = 'block';
}

function drawHistoryChart(history) {
    var data = new google.visualization.DataTable();
    data.addColumn('string', 'DATE');
    data.addColumn('string', 'DRINKS');
    data.addRows(history);

    var classes = { 'tableCell' : 'historyCell',
                    'headerRow' : 'headerRow',
    }
    var table = new google.visualization.Table(document.getElementById('history_data'));
    var options = { showRowNumber: false, 
                    width: '400px', 
                    height: '100%',
                    allowHtml: true,
                    cssClassNames: classes}
    table.draw(data, options);
}

// Callback that creates and populates a data table,
// instantiates the pie chart, passes in the data and
// draws it.
function drawDrinkChart(currentData) {
    var beer = getTotalType(currentData, "Beer");
    var malt = getTotalType(currentData, "Malt");
    var wine = getTotalType(currentData, "Wine");
    var spirits = getTotalType(currentData, "Spirits");

    // Create the data table.
    var drinkData = new google.visualization.DataTable();
    drinkData.addColumn('string', 'Drink Type');
    drinkData.addColumn('number', 'Number');
    drinkData.addRows([
      ['Beer', beer],
      ['Malt', malt],
      ['Wine', wine],
      ['Spirits', spirits]
    ]);

    // Set chart options
    var options = {
                   'width':400,
                   'height':150,
                    colors: ['#5680e9', '#84ceeb', '#5ab9ea', '#c1c8e4', '#8860d0']};

    // Instantiate and draw our chart, passing in some options.
    var chart = new google.visualization.PieChart(document.getElementById('chart_div'));
    chart.draw(drinkData, options);
}

function drawChart(currentData, currentBac) {
    var scatter = [['Time', 'BAC']];
    var firstDrink = new Date(currentData[0][DATE_TIME]);
    firstDrink.addHours(-5);
    var maxBac = 0.0;
    for (i = 0; i < currentData.length; i++) {
        var row = currentData[i];
        maxBac = Math.max(maxBac, parseFloat(row[ADJ_BAC]));
        var date = new Date(row[DATE_TIME]);
        var scatter = scatter.concat([[date.addHours(-5), parseFloat(row[ADJ_BAC])]]);
    }

    var sober = new Date(currentData[currentData.length-1][DATE_TIME]);
    sober.addHours(currentData[currentData.length-1][TIME_SOBER]);
    sober.addHours(-5);
    var scatter = scatter.concat([[sober, 0.0]]);

    var data = google.visualization.arrayToDataTable(scatter);

    document.getElementById('graphTitle').innerHTML = firstDrink.toString('M|dd|yy') + ' TO SOBRIETY (' + sober.toString('M|dd|yy H:mm' + ')');

    var options = {
        title: '',
        hAxis: {
          title: 'Time',
          textStyle: {fontName: 'Signika', fontSize: '10'},
          viewWindow: {
            min: firstDrink,
            max: sober
          },
          gridlines: {
            count: -1,
            units: {
              days: {format: ['MMM dd']},
              hours: {format: ['HH:mm', 'ha']},
            }
          }
        },
        vAxis: {title: 'BAC',
                titleTextStyle: {fontName: 'Signika', fontSize: '11'},
                textStyle: {fontName: 'Signika', fontSize: '10'}, 
                minValue: 0, maxValue: maxBac, gridlines: {count: 11}},
        legend: 'none',
        pointSize: 10,
        'width': 600
    };

    var chart = new google.visualization.LineChart(document.getElementById('chart_bac'));

    chart.draw(data, options);
}

function meterMap(currentBac) {
    if (currentBac < 0.010) {
        return "Sober";
    } else if (currentBac < 0.08) {
        return "Under legal limit";
    } else if (currentBac < 0.20) {
        return "Impaired Judgement";
    } else if (currentBac < 0.25) {
        return "Possible Blackout";
    } else if (currentBac < 0.4) {
        return "Alcohol Poisoning";
    } else {
        return "Possible Death";
    }
}

function updateBAC(currentBac) {
    writtenBac = currentBac.toFixed(3);
    document.getElementById('bac').innerHTML = writtenBac < zero ? "0.000" : writtenBac;
    var adj = writtenBac > 0.40 ? 0.40 : writtenBac;
    var barValue = adj < zero ? 0.0 : adj/0.4;
    bar.animate(barValue);
}

function updateDrinkCount(totalDrinks) {
    document.getElementById('drinkCount').innerHTML = totalDrinks;
}

function getHourDifference(a, b) {
    return Math.abs(a - b) / 36e5;
}

function getNumberOfDrinks(currentData) {
    var drinks = currentData.map(function(item){ return parseFloat(item[1]) });
    return drinks.reduce(function(a,b){ return a + b }, 0);
}

function getTotalType(data, type) {
    var typeData = data.filter(function(item) { return item[0] == type } );
    return getNumberOfDrinks(typeData);
}

Date.prototype.addHours = function(h) {    
   this.setTime(this.getTime() + (h*60*60*1000)); 
   return this;   
}

function calculateBAC(totalDrinks, timePeriod) {
    // Widmark formula: BAC = [Alcohol consumed in grams / (Body weight in grams x r)] x 100. 
    // “r” is the gender constant: r = 0.55 for females and 0.68 for males
    // Alcohol consumed in grams
    var alcInGrams = totalDrinks * 14.0;    
    // Weight in grams (pounds/.0022046)
    var weightInGrams = parseFloat(120.0)/.0022046;
    // Gender constant
    var genderWeight = weightInGrams * (male ? 0.68 : 0.55);    
    // As percentage
    var bac = (alcInGrams/genderWeight)*100;
    // Time adjusted
    var adj_bac = bac - (timePeriod * .015);
    return adj_bac < 0.0 ? 0.0 : adj_bac;
}

function getCurrentData(data) {
    var currentData;
    var beginTime;
    for (i = 0; i < data.length; i++) {
        var row = data[i];
        currentData = (row[HOUR_PERIOD] == 0) ? [row] : currentData.concat([row]);
    }
    return currentData;
}

function updateUI(data) {
    var currentData = getCurrentData(data);
    // calculate bac
    var time = new Date(currentData[0][DATE_TIME]);
    var timePeriod = getHourDifference(time.addHours(-5), new Date());
    var currentBac = calculateBAC(currentData[currentData.length-1][TOTAL_DRINKS], timePeriod);
    updateBAC(currentBac);
    updateDrinkCount(currentData[currentData.length-1][TOTAL_DRINKS]);
    // Set a callback to run when the Google Visualization API is loaded.
    google.charts.setOnLoadCallback(drawDrinkChart(currentData));
    google.charts.setOnLoadCallback(drawChart(currentData, currentBac));
}

function newTimePeriodFormat(row) {
    var bac = calculateBAC(row[STANDARD_DRINKS],0)
    var totalDrinks = parseFloat(row[STANDARD_DRINKS]);
    var hoursUntilSober = bac/0.015;
    return [bac, totalDrinks, bac, 0, bac, hoursUntilSober];
}

function updateDataSheet(data, index) {
    var values = []
    var prev;
    var calc;
    var irange = 'D' + (index+2) + ':I';
    if (index == 0) {
        calc = newTimePeriodFormat(data[0]);
        values = values.concat([calc]);
        prev = data[0].concat(calc);
        index++;
    } else {
        prev = data[index-1];
    }
    for (i = index; i < data.length; i++) {
        var row = data[i];
        var bac = calculateBAC(row[STANDARD_DRINKS], 0);
        var timePeriod = getHourDifference(new Date(prev[DATE_TIME]), new Date(row[DATE_TIME]));
        if (timePeriod > prev[TIME_SOBER]) {
            calc = newTimePeriodFormat(row);
        } else {
            var totalBac = parseFloat(prev[TOTAL_BAC])+parseFloat(bac);
            var adjTime = parseFloat(prev[HOUR_PERIOD]) + parseFloat(timePeriod);
            var adjBac = totalBac - (adjTime * .015);
            calc = [bac, parseFloat(row[STANDARD_DRINKS])+parseFloat(prev[TOTAL_DRINKS]), totalBac, adjTime, adjBac, adjBac/.015];
        }
        values = values.concat([calc]);
        prev = row.concat(calc);
    }
    var valueRangeBody = {
        "values" : values
    };
    writeCalculationData(valueRangeBody, irange, update);
}

function update() {
    getData(updateDataSheet, updateUI);
}

/**
*  On load, called to load the auth2 library and API client library.
*/
function handleClientLoad() {
    gapi.load('client:auth2', initClient);
}

/**
*  Initializes the API client library and sets up sign-in state
*  listeners.
*/
function initClient() {
    gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
    }).then(function () {
        // Listen for sign-in state changes.
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

        // Handle the initial sign-in state.
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
        authorizeButton.onclick = handleAuthClick;
        signoutButton.onclick = handleSignoutClick;
    });
}

/**
*  Called when the signed in status changes, to update the UI
*  appropriately. After a sign-in, the API is called.
*/
function updateSigninStatus(isSignedIn) {
    if (isSignedIn) {
        authorizeButton.style.display = 'none';
        signoutButton.style.display = 'block';
        body.style.display = 'block';
        update();
    } else {
        authorizeButton.style.display = 'block';
        signoutButton.style.display = 'none';
        body.style.display = 'none';
    }
}

/**
*  Sign in the user upon button click.
*/
function handleAuthClick(event) {
    gapi.auth2.getAuthInstance().signIn();
}

/**
*  Sign out the user upon button click.
*/
function handleSignoutClick(event) {
    gapi.auth2.getAuthInstance().signOut();
}


function writeCalculationData(valueRangeBody, irange, callback) {
    var params = {
        spreadsheetId: '1eyLK5nclntwN0bWLI0CVUtQV9A4ghQ-qXuklpYmpyBo',
        range: irange,
        valueInputOption: 'USER_ENTERED'
    };
    gapi.client.sheets.spreadsheets.values.update(params, valueRangeBody).then(function(response) {
            console.log('Write successful');
            callback();
        }, function(response) {
        console.log('Failed to write calculations');
    });
}

function getData(callback1, callback2) {
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: '1eyLK5nclntwN0bWLI0CVUtQV9A4ghQ-qXuklpYmpyBo',
        range: 'A2:I',
    }).then(function(response) {
            var range = response.result;
            var index;
            if (range.values.length > 0) {
                var history = [];
                var currentData;
                for (i = 0; i < range.values.length; i++) {
                    var row = range.values[i];
                    var date = new Date(row[DATE_TIME])
                    history = history.concat([[date.addHours(-5).toString('MM dd yy HH:mm'), row[STANDARD_DRINKS]]]);
                    if (row[INSTANT_BAC] == null && index == null) {
                        index = i;
                    }
                }
                google.charts.setOnLoadCallback(drawHistoryChart(history));
            } else {
                console.log('No data found');
            }
            (index == null) ? callback2(range.values) : callback1(range.values, index);
        }, function(response) {
        console.log('Error');
    });
}