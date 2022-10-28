var REQUEST_MAX = 10;

window.onload = main;

var LOADING_STRING = "Fetching rating data. This can take some time with large collections...";

var table = document.querySelector(".games-table tbody");

var output = document.querySelector(".main-output");

function main() {
    var input1 = document.getElementById("user1");
    var input2 = document.getElementById("user2");
    var submit = document.getElementById("submit");

    submit.addEventListener("click", e => {
        var users = [input1.value, input2.value];
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
function getBGGCollection(username, request_attempt = 0) {
    var params = "?username=" + username + "&stats=1&rated=1";
    // Attempt to fetch user data
    return fetch("https://boardgamegeek.com/xmlapi2/collection" + params)
    .then(response => {
        // If data is waiting to load (BGG batch), retry with exponential back off
        if(response.status == 202) {
            return new Promise(resolve => {
                var exp_timeout = 5000 * Math.pow(2, request_attempt);
                setTimeout(() => {
                    resolve(getBGGCollection(username, ++request_attempt));
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
function parseCollection(collection_xml, options = []) {
    var ratings = {};
    var parser = new DOMParser();
    var doc = parser.parseFromString(collection_xml, "text/xml");
    var games = doc.getElementsByTagName("item");

    for(game of games) {
        var name = game.getElementsByTagName("name")[0].innerHTML;
        ratings[name] = {};
        if(options.includes("user")) {
            var user_rating = game.querySelector("rating").getAttribute("value");
            ratings[name].user = parseFloat(user_rating);
        }
        if(options.includes("geek")) {
            var geek_rating = game.querySelector("rating bayesaverage").getAttribute("value");
            ratings[name].geek = parseFloat(geek_rating);
        }
        if(options.includes("raw_avg")) {
            var raw_avg_rating = game.querySelector("rating average").getAttribute("value");
            ratings[name].raw_avg = parseFloat(raw_avg_rating);
        }
    }
    return ratings;
}

// Returns a standardized game:rating object with common games between two user rating sets
// Object format {game: {rating1: , rating2: }}
function mergeRatings(user1, user2) {
    var output = {};
    for(game in user1) {
        if(game in user2) {
            output[game] = {
                "rating1": user1[game].user,
                "rating2": user2[game].user
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

// Populates output table with all rating values in ratings object
function fillTable(table, ratings) {
    for(game in ratings) {
        var row = table.insertRow();
        row.insertCell().innerHTML = game;

        for(rating_type in ratings[game]) {
            var num = ratings[game][rating_type];
            row.insertCell().innerHTML = parseFloat(num.toFixed(2));
        }
    }
}

function compareUsers(users) {
    // Fetch user collection data as XML
    Promise.all(users.map(user => getBGGCollection(user)))
    // Extract relevant ratings data
    .then(xml_data_sets => {
        toggleLoading();
        //return Promise.all(xml_data_sets.map(data => getUserRatings(data)));
        return Promise.all(xml_data_sets.map(data => parseCollection(data, ["user"])))
    })
    // Calculate correlation coefficient from ratings data
    .then(ratings_data => {
        var merged_ratings = mergeRatings(ratings_data[0], ratings_data[1]);
        outputRatings(merged_ratings, "userCompare");
    })
}

function compareAverage(user) {
    getBGGCollection(user)
    .then(xml_data_set => {
        toggleLoading();
        var ratings = parseCollection(xml_data_set, ["user", "geek"]);
        outputRatings(filterGeek(ratings), "geekCompare");
    })
}

// Expects merged ratings object or user+geek object depending on mode
// Calculates coefficient, adds deltas, and outputs to table
function outputRatings(ratings, mode) {
    var l1 = Object.values(ratings).map(rating_set => rating_set.rating1);
    var l2 = Object.values(ratings).map(rating_set => rating_set.rating2);
    var r = correlation(l1, l2);

    getCorrelationMessage(r, mode)
    .then(msg => {
        output.querySelector("#strength-description").innerHTML = msg;
    });

    addDeltas(ratings);
    fillTable(table, ratings);
    output.querySelector("#common-games").innerHTML = Object.keys(ratings).length + " common games";
    output.querySelector("#r-output").innerHTML = "r = " + r.toFixed(3); 
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
    .then(responses => {
        if(r >= -1.0 && r < -0.90) {
            return responses[option].negativeVeryStrong;
        }
        if(r >= -0.90 && r < -0.65) {
            return responses[option].negativeStrong;
        }
        if(r >= -0.65 && r < -0.45) {
            return responses[option].negativeModerate;
        }
        if(r >= -0.45 && r < -0.20) {
            return responses[option].negativeMild;
        }
        if(r >= -0.20 && r < 0.20) {
            return responses[option].noCorrelation;
        }
        if(r >= 0.20 && r < 0.45) {
            return responses[option].positiveMild;
        }
        if(r >= 0.45 && r < 0.65) {
            return responses[option].positiveModerate;
        }
        if(r >= 0.65 && r < 0.90) {
            return responses[option].positiveStrong;
        }
        if(r >= 0.9 && r <= 1.0) {
            return responses[option].positiveVeryStrong;
        }
    })
}