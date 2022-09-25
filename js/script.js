window.onload = main;

function main() {
    var params = "username=Citery&stats=1&rated=1";
    var output = document.querySelector("#XMLOutput");

    getBGGCollection(params)
    .then(data => {
        var stopper = 0;
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