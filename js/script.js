var REQUEST_MAX = 10;

window.onload = main;

var table = document.querySelector(".games-table tbody");

var output = document.querySelector(".r-output");

function main() {
    coefficientTest();

    //pullUsernames();

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
                compareAverage(user);
            })
            .catch(error => {
                alert(error);
            })
        // Otherwise compare ratings of entered usernames
        } else {
            Promise.all(users.map(user => checkValidBGGUser(user)))
            .then(users => {
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
function getBGGCollection(params, request_attempt) {
    // Attempt to fetch user data
    return fetch("https://boardgamegeek.com/xmlapi2/collection" + params)
    .then(response => {
        // If data is waiting to load (BGG batch), retry with exponential back off
        if(response.status == 202) {
            return new Promise(resolve => {
                var exp_timeout = 5000 * Math.pow(2, request_attempt);
                setTimeout(() => {
                    resolve(getBGGCollection(params, ++request_attempt));
                }, exp_timeout)
            })
        // If data is loaded, return response text
        } else if(response.status == 200) {
            return response.text();
        }
    })
}

// Returns object of all game:rating pairs from BGG User collection data
function getUserRatings(collection_xml) {
    var ratings = {};
    var parser = new DOMParser();
    var doc = parser.parseFromString(collection_xml, "text/xml");
    var games = doc.getElementsByTagName("item");
    for(game of games) {
        var name = game.getElementsByTagName("name")[0].innerHTML;
        var rating = game.getElementsByTagName("rating")[0].getAttribute("value");
        ratings[name] = parseFloat(rating);
    }
    return ratings;
}

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
            if(geek_rating == "0") {
                delete ratings[name];
                continue;
            }
            ratings[name].geek = parseFloat(geek_rating);
        }
        if(options.includes("raw_avg")) {
            var raw_avg_rating = game.querySelector("rating average").getAttribute("value");
            ratings[name].raw_avg = parseFloat(raw_avg_rating);
        }
    }
    return ratings;
}

// Returns array of game titles that appear in both ratings objects
function findCommonGames(ratings1, ratings2) {
    var common = [];
    for(game in ratings1) {
        if(game in ratings2) {
            common.push(game);
        }
    }
    return common;
}

// Returns a new game:rating object with only common_games
function createTrimmedRatings(ratings, common_games) {
    var trim = {};
    common_games.forEach(game => {
        trim[game] = ratings[game];
    }) 
    return trim;
}

function populateRatingsTable(table, l1, l2) {
    for(game in l1) {
        var row = table.insertRow();
        row.insertCell().innerHTML = game;
        row.insertCell().innerHTML = l1[game];
        row.insertCell().innerHTML = l2[game];
        row.insertCell().innerHTML = l1[game] - l2[game];
    }
}

function fillTable(table, ratings) {
    for(game in ratings) {
        var row = table.insertRow();
        row.insertCell().innerHTML = game;

        for(rating_type in ratings[game]) {
            row.insertCell().innerHTML = ratings[game][rating_type];
        }
    }
}

// Returns sum of array of numbers
function sum(array) {
    var sum = 0;
    array.forEach(element => sum += element);
    return sum;
}

// Returns mean of array of numbers (ratings, in this case)
function mean(array) {
    var sum = 0;
    array.forEach(element => sum += element);
    return sum / array.length;
}

// Returns sample standard deviation from given array of numbers
function stdDev(array) {
    var arr_mean = mean(array);
    var spread = array.map(val => Math.pow(val - arr_mean, 2));
    var spread_sum = sum(spread);
    return Math.sqrt(spread_sum / (array.length - 1))
}

// Test case: negative coefficient
function coefficientTest() {
    var l1 = [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 10];
    var l2 = l1.map(val => val / 2);

    var mean1 = mean(l1);
    var spread1 = l1.map(num => num - mean1);
    var mean2 = mean(l2);
    var spread2 = (l2).map(num => num - mean2);

    var spread_mult = spread1.map((val, i) => val * spread2[i]);

    var covariance = (sum(spread_mult)) / (l1.length - 1);

    var dev1 = stdDev(l1);
    var dev2 = stdDev(l2);

    var r = covariance / (dev1 * dev2);
}

function compareUsers(users) {
    output.innerHTML = "Fetching collections (this can take some time with large collections)..."
    var params = users.map(user => "?username=" + user + "&stats=1&rated=1");
    // Fetch user collection data as XML
    Promise.all(params.map(string => getBGGCollection(string, 0)))
    // Extract relevant ratings data
    .then(xml_data_sets => {
        return Promise.all(xml_data_sets.map(data => getUserRatings(data)));
    })
    // Calculate correlation coefficient from ratings data
    .then(ratings_data => {
        var user1 = ratings_data[0];
        var user2 = ratings_data[1];

        var common_games = findCommonGames(user1, user2);

        var list1 = createTrimmedRatings(user1, common_games);
        var list2 = createTrimmedRatings(user2, common_games);

        populateRatingsTable(table, list1, list2);

        var deltas = {};
        Object.keys(list1).forEach(game => {
            deltas[game] = list1[game] - list2[game];
        })

        var mean1 = mean(Object.values(list1));
        var spread1 = Object.values(list1).map(num => num - mean1);
        var mean2 = mean(Object.values(list2));
        var spread2 = Object.values(list2).map(num => num - mean2);

        var spread_mult = spread1.map((val, i) => val * spread2[i]);

        var covariance = (sum(spread_mult)) / (Object.keys(list1).length - 1);

        var dev1 = stdDev(Object.values(list1));
        var dev2 = stdDev(Object.values(list2));

        var r = covariance / (dev1 * dev2);

        output.innerHTML = r;
    })
}

function compareAverage(user) {
    getBGGCollection("?username=" + user + "&stats=1&rated=1", 0)
    .then(xml_data_set => {
        var ratings = parseCollection(xml_data_set, ["user", "geek"]);
        
        var l1 = Object.values(ratings).map(rating => rating.user);
        var l2 = Object.values(ratings).map(rating => rating.geek);

        fillTable(table, ratings);

        var mean1 = mean(l1);
        var spread1 = l1.map(num => num - mean1);
        var mean2 = mean(l2);
        var spread2 = l2.map(num => num - mean2);

        var spread_mult = spread1.map((val, i) => val * spread2[i]);

        var covariance = (sum(spread_mult)) / (l1.length - 1);

        var dev1 = stdDev(l1);
        var dev2 = stdDev(l2);

        var r = covariance / (dev1 * dev2);

        output.innerHTML = r;
    })

    var stop = 0;
}