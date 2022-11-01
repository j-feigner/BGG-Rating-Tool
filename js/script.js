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
                "avg": (user1[game].user + user2[game].user) / 2,
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
function fillMainTable(table, ratings) {
    for(game in ratings) {
        var row = table.insertRow();
        row.insertCell().innerHTML = game;
        
        const ratingOrder = ["rating1", "rating2", "delta", "zDelta", "avg", "zAvg"];

        ratingOrder.forEach(ratingType => {
            var num = ratings[game][ratingType];
            var cell = row.insertCell();
            cell.classList.add("table-num");
            cell.innerHTML = parseFloat(num.toFixed(2));
        })
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
    getCorrelationMessage(Math.max(r, s), mode)
    .then(msg => {
        output.querySelector("#strength-description").innerHTML = msg;
    });

    // Output to tables
    extraStats(ratings);
    fillMainTable(table, ratings);
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
function getCorrelationMessage(coefficient, option) {
    return fetch("json/correlation_messages.json")
    .then(response => response.json())
    .then(msgs => {
        if(coefficient < -0.90) {
            return msgs[option].negativeVeryStrong;
        }
        if(coefficient >= -0.90 && coefficient < -0.65) {
            return msgs[option].negativeStrong;
        }
        if(coefficient >= -0.65 && coefficient < -0.45) {
            return msgs[option].negativeModerate;
        }
        if(coefficient >= -0.45 && coefficient < -0.20) {
            return msgs[option].negativeMild;
        }
        if(coefficient > -0.20 && coefficient < 0.20) {
            return msgs[option].noCorrelation;
        }
        if(coefficient >= 0.20 && coefficient < 0.45) {
            return msgs[option].positiveMild;
        }
        if(coefficient >= 0.45 && coefficient < 0.65) {
            return msgs[option].positiveModerate;
        }
        if(coefficient >= 0.65 && coefficient < 0.90) {
            return msgs[option].positiveStrong;
        }
        if(coefficient >= 0.9) {
            return msgs[option].positiveVeryStrong;
        }
    })
}

function extraStats(ratings) {
    // Sorted and sliced arrays of game names according to extra stat sub-tables
    // Object property names reflect DOM stat tables for dynamic insertion
    const statsArrays = {
        "love-table-normal": 
            Object.keys(ratings).sort((a,b) => {
                return ratings[b].zAvg - ratings[a].zAvg;
            }).slice(0, 10),
        "love-table-raw": 
            Object.keys(ratings).sort((a,b) => {
                return ratings[b].avg - ratings[a].avg;
            }).slice(0, 10),
        "hate-table-normal": 
            Object.keys(ratings).sort((a,b) => {
                return ratings[a].zAvg - ratings[b].zAvg;
            }).slice(0, 10),
        "hate-table-raw": 
            Object.keys(ratings).sort((a,b) => {
                return ratings[a].avg - ratings[b].avg;
            }).slice(0, 10),
        "agree-table-normal": 
            Object.keys(ratings).sort((a,b) => {
                return Math.abs(ratings[a].zDelta) - Math.abs(ratings[b].zDelta);
            }).slice(0, 9),
        "agree-table-raw": 
            Object.keys(ratings).sort((a,b) => {
                return Math.abs(ratings[a].delta) - Math.abs(ratings[b].delta);
            }).slice(0, 9),
        "disagree-table-normal":
            Object.keys(ratings).sort((a, b) => {
                return Math.abs(ratings[b].zDelta) - Math.abs(ratings[a].zDelta);
            }).slice(0, 9),
        "disagree-table-raw":
            Object.keys(ratings).sort((a, b) => {
                return Math.abs(ratings[b].delta) - Math.abs(ratings[a].delta);
            }).slice(0, 9)
    }

    const statTables = document.querySelectorAll("#extra-stats .sub-table-container");
    statTables.forEach(container => {
        var radioButtons = container.querySelectorAll(".custom-radio input");
        var table = container.querySelector("table");

        radioButtons.forEach(button => {
            var statName = table.id + "-" + button.value; // References statsArrays values
            // Fill in table for any default checked values
            if(button.checked) {
                fillStatTable(statsArrays[statName], table.querySelector("tbody"));
            }
            // When button is checked, fill table
            button.addEventListener("change", e => {
                fillStatTable(statsArrays[statName], table.querySelector("tbody"));
            })
        })
    })
}

function fillStatTable(array, table) {
    table.innerHTML = "";
    array.forEach(element => {
        table.insertRow().insertCell().innerHTML = element;
    })
}