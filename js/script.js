var REQUEST_MAX = 10;

window.onload = main;

var LOADING_STRING = "Fetching rating data. This can take some time with large collections...";

var table = document.querySelector("#games-table tbody");

var output = document.querySelector("#main-output");

function main() {
    var input1 = document.getElementById("user1");
    var input2 = document.getElementById("user2");
    var submit = document.getElementById("submit");

    var lastUsers = ["", ""];

    submit.addEventListener("click", e => {
        var users = [input1.value, input2.value];

        // Check if user fields have changed
        if(users[0] === lastUsers[0] && users[1] === lastUsers[1]) {
            return;
        } else {
            lastUsers = users;
        }

        table.innerHTML = "";
        // If second input is blank, compare user ratings to average
        if(users[1] == "") {
            checkValidBGGUser(users[0])
            .then(user => {
                toggleLoading();
                compareAverage(user);
            })
            .catch(error => {
                alert(error);
            })
        // Otherwise compare ratings of entered usernames
        } else {
            Promise.all(users.map(user => checkValidBGGUser(user)))
            .then(users => {
                toggleLoading();
                compareUsers(users);
            })
            .catch(error => {
                alert(error);
            })
        }
    })
}

// Attempts to fetch BGG user data
// If user exits
function checkValidBGGUser(username) {
    return fetch("https://boardgamegeek.com/xmlapi2/user?name=" + username)
    .then(response => response.text())
    .then(data => {
        var parser = new DOMParser();
        var doc = parser.parseFromString(data, "text/xml");
        var user = doc.getElementsByTagName("user")[0].getAttribute("name");
        return user == "" ? Promise.reject("User '" + username + "' does not exist. Please try again.") : Promise.resolve(user);
    })
}

// Returns a Promise that resolves to an XML string of a user's collection data from BGG
// Repeated fetches are required due to BGG's collection export system
function getBGGCollection(username, requestAttempt = 0) {
    var params = "?username=" + username + "&stats=1&rated=1";
    // Attempt to fetch user data
    return fetch("https://boardgamegeek.com/xmlapi2/collection" + params)
    .then(response => {
        // If data is waiting to load (BGG batch), retry with exponential back off
        if(response.status == 202) {
            return new Promise(resolve => {
                var exp_timeout = 5000 * Math.pow(2, requestAttempt);
                setTimeout(() => {
                    resolve(getBGGCollection(username, ++requestAttempt));
                }, exp_timeout)
            })
        // If data is loaded, return response text
        } else if(response.status == 200) {
            return response.text();
        }
    })
}

// Returns set of all game ratings from user collection in format {game: {option1: , option2: , ...}}
// Options: "user": include user rating for game
//          "geek": include geek bayesian average rating for game
//          "raw_avg": include raw average score from BGG users for game
function parseCollection(collectionXML, options = []) {
    var ratings = {};
    var parser = new DOMParser();
    var doc = parser.parseFromString(collectionXML, "text/xml");
    var games = doc.getElementsByTagName("item");

    for(game of games) {
        var name = game.getElementsByTagName("name")[0].innerHTML;
        ratings[name] = {};
        if(options.includes("user")) {
            var userRating = game.querySelector("rating").getAttribute("value");
            ratings[name].user = parseFloat(userRating);
        }
        if(options.includes("geek")) {
            var geekRating = game.querySelector("rating bayesaverage").getAttribute("value");
            ratings[name].geek = parseFloat(geekRating);
        }
        if(options.includes("raw_avg")) {
            var rawAvgRating = game.querySelector("rating average").getAttribute("value");
            ratings[name].raw_avg = parseFloat(rawAvgRating);
        }
    }
    return ratings;
}

// Returns a standardized game:rating object with common games between two user rating sets
function mergeRatings(user1, user2) {
    var output = {};
    for(game in user1) {
        if(game in user2) {
            output[game] = {
                "rating1": user1[game].user,
                "rating2": user2[game].user,
                "delta": user1[game].user - user2[game].user,
                "zDelta": user1[game].z - user2[game].z,
                "zAvg": (user1[game].z + user2[game].z) / 2
            }
        }
    }
    return output;
}

// Parses Geek Average ratings object to standardized format {game: {rating1: , rating2: }}
// and drops any games with insufficient geek rating (geek == 0)
function filterGeek(ratings) {
    var output = {};
    for(game in ratings) {
        // Skip any games with a 0 geek rating
        if(ratings[game].geek == 0) {
            continue;
        }
        output[game] = {
            "rating1": ratings[game].user,
            "rating2": ratings[game].geek
        }
    }
    return output;
}

// Appends delta value to standardized ratings object
function addDeltas(ratings) {
    for(game in ratings) {
        var delta = ratings[game].rating1 - ratings[game].rating2;
        ratings[game]["delta"] = delta;
    }
}

function addZValues(userRatings) {
    var list = Object.values(userRatings).map(rating => rating.user);
    var avg = mean(list);
    var dev = stdDev(list, "population");

    for(game in userRatings) {
        var z = ((userRatings[game].user - avg) / dev);
        userRatings[game]["z"] = z;
    }
}

// Populates output table with all rating values in ratings object
function fillTable(table, ratings) {
    for(game in ratings) {
        var row = table.insertRow();
        row.insertCell().innerHTML = game;

        for(rating_type in ratings[game]) {
            var num = ratings[game][rating_type];
            var cell = row.insertCell();

            cell.classList.add("table-num");
            cell.innerHTML = parseFloat(num.toFixed(2));
        }
    }
}

function compareUsers(users) {
    // Fetch user collection data as XML
    Promise.all(users.map(user => getBGGCollection(user)))
    // Extract relevant ratings data
    .then(xmlDataSets => {
        toggleLoading();
        //return Promise.all(xml_data_sets.map(data => getUserRatings(data)));
        return Promise.all(xmlDataSets.map(data => parseCollection(data, ["user"])))
    })
    // Calculate correlation coefficient from ratings data
    .then(ratingsData => {
        ratingsData.map(ratingSet => addZValues(ratingSet));
        var merged_ratings = mergeRatings(ratingsData[0], ratingsData[1]);
        outputRatings(merged_ratings, "userCompare");
    })
}

function compareAverage(user) {
    getBGGCollection(user)
    .then(xmlDataSet => {
        toggleLoading();
        var ratings = parseCollection(xmlDataSet, ["user", "geek"]);
        outputRatings(filterGeek(ratings), "geekCompare");
    })
}

// Expects merged ratings object or user+geek object depending on mode
// Calculates coefficient, adds deltas, and outputs to table
function outputRatings(ratings, mode) {
    // Get correlation coefficient
    var l1 = Object.values(ratings).map(ratingSet => ratingSet.rating1);
    var l2 = Object.values(ratings).map(ratingSet => ratingSet.rating2);
    var r = pearsonCorrelation(l1, l2);
    var s = spearmanCorrelation(l1, l2);

    // Set color of output block
    output.className = "";
    if(r <= -0.2) {
        output.classList.add("negative");
    } else if (r >= 0.2) {
        output.classList.add("positive");
    } else {
        output.classList.add("neutral");
    }

    // Modify ratings object
    getCorrelationMessage(r, mode)
    .then(msg => {
        output.querySelector("#strength-description").innerHTML = msg;
    });

    // Output to tables
    displayExtraStats(ratings);
    fillTable(table, ratings);
    output.querySelector("#common-games").innerHTML = Object.keys(ratings).length + " games";
    output.querySelector("#r-output").innerHTML = "r = " + r.toFixed(3); 
    output.querySelector("#s-output").innerHTML = "s = " + s.toFixed(3); 
}

// Toggles appropriate classes for loading elements to show/hide
function toggleLoading() {
    var reminderElement = document.querySelector("#loading-reminder");
    var submitText = document.querySelector("#submit span");
    var submitButton = document.querySelector("#submit");
    var loadingIcon = document.querySelector("#loading-icon");

    reminderElement.classList.toggle("hidden");
    submitText.classList.toggle("hidden");
    submitButton.classList.toggle("loading")
    loadingIcon.classList.toggle("hidden");
}

// Parses JSON data for correlation descriptions based on ranges in r
// Options: "userCompare", "geekCompare"
function getCorrelationMessage(r, option) {
    return fetch("json/correlation_messages.json")
    .then(response => response.json())
    .then(msgs => {
        if(r < -0.90) {
            return msgs[option].negativeVeryStrong;
        }
        if(r >= -0.90 && r < -0.65) {
            return msgs[option].negativeStrong;
        }
        if(r >= -0.65 && r < -0.45) {
            return msgs[option].negativeModerate;
        }
        if(r >= -0.45 && r < -0.20) {
            return msgs[option].negativeMild;
        }
        if(r > -0.20 && r < 0.20) {
            return msgs[option].noCorrelation;
        }
        if(r >= 0.20 && r < 0.45) {
            return msgs[option].positiveMild;
        }
        if(r >= 0.45 && r < 0.65) {
            return msgs[option].positiveModerate;
        }
        if(r >= 0.65 && r < 0.90) {
            return msgs[option].positiveStrong;
        }
        if(r >= 0.9) {
            return msgs[option].positiveVeryStrong;
        }
    })
}

function displayExtraStats(ratings) {
    // Sorting arrays
    var sortZDeltaAsc = Object.keys(ratings).sort((a, b) => {
        return Math.abs(ratings[a].zDelta) - Math.abs(ratings[b].zDelta);
    });
    var sortZDeltaDesc = Object.keys(ratings).sort((a, b) => {
        return Math.abs(ratings[b].zDelta) - Math.abs(ratings[a].zDelta);
    });
    var sortZAvgAsc = Object.keys(ratings).sort((a, b) => {
        return ratings[a].zAvg - ratings[b].zAvg;
    });
    var sortZAvgDesc = Object.keys(ratings).sort((a, b) => {
        return ratings[b].zAvg - ratings[a].zAvg;
    });

    fillStatTable(sortZAvgDesc, "#love-table tbody");
    fillStatTable(sortZAvgAsc, "#hate-table tbody");
    fillStatTable(sortZDeltaAsc, "#agree-table tbody");
    fillStatTable(sortZDeltaDesc, "#disagree-table tbody");
}

function fillStatTable(array, tableSelector) {
    var table = document.querySelector(tableSelector);
    for(let i = 0; i < 10 && i < array.length; i++) {
        table.insertRow().insertCell().innerHTML = array[i];
    }
}