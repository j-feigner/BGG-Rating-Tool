var REQUEST_MAX = 10;

window.onload = main;

function main() {
    var input1 = document.getElementById("user1");
    var input2 = document.getElementById("user2");
    var submit = document.getElementById("submit");

    var table = document.querySelector(".games-table tbody");

    var output = document.querySelector(".r-output");

    submit.addEventListener("click", e => {
        var users = [input1.value, input2.value];
        table.innerHTML = "";
        // Check both inputs for valid users
        Promise.all(users.map(user => checkValidBGGUser(user)))
        // If valid (not caught), fetch user collection data as XML
        .then(users => {
            output.innerHTML = "Fetching collections (this can take some time with large collections)..."
            var params = users.map(user => "?username=" + user + "&stats=1&rated=1");
            return Promise.all(params.map(string => getBGGCollection(string, 0)));
        })
        // Extract relevant ratings data
        .then(xml_data_sets => {
            return Promise.all(xml_data_sets.map(data => parseRatings(data)));
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
        .catch(error => {
            alert(error);
        })
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
        return user == "" ? Promise.reject("User does not exist") : Promise.resolve(user);
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
                setTimeout(() => {
                    resolve(getBGGCollection(params, request_attempt++));
                }, 5000 * Math.pow(2, request_attempt))
            })
        // If data is loaded, return response text
        } else if(response.status == 200) {
            return response.text();
        }
    })
}

// Returns object of all game:rating pairs from BGG User collection data
function parseRatings(collection_xml) {
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