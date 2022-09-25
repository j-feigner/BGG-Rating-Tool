window.onload = main;

function main() {
    var params = "username=Citery&stats=1&rated=1";
    var output = document.querySelector("#XMLOutput");
    var game_ratings = {};

    getBGGCollection(params)
    .then(data => {
        var parser = new DOMParser();
        var doc = parser.parseFromString(data, "text/xml");
        var games = doc.getElementsByTagName("item");
        for(game of games) {
            var name = game.getElementsByTagName("name")[0].innerHTML;
            var rating = game.getElementsByTagName("rating")[0].getAttribute("value");
            game_ratings[name] = parseFloat(rating);
        }
        var stop = 0;
    });
}

// Returns a Promise that resolves to an XML string of a user's collection data from BGG
// Repeated fetches are required due to BGG's collection export system
function getBGGCollection(params) {
    // Attempt to fetch user data
    return fetch("https://boardgamegeek.com/xmlapi2/collection?" + params)
    .then(response => {
        // If data is not loaded, wait two seconds and try again (recursive)
        if(response.status == 202) {
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve(getBGGCollection(params))
                }, 2000)
            })
        // If data is loaded, return response text
        } else if (response.status == 200) {
            return response.text();
        }
    })
}