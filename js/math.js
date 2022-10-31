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

// Returns standard deviation from given array of numbers
function stdDev(array, type = "sample") {
    var arr_mean = mean(array);
    var spread = array.map(val => Math.pow(val - arr_mean, 2));
    var spread_sum = sum(spread);
    if(type === "population") {
        var denom = array.length;
    } else if(type === "sample") {
        var denom = array.length - 1;
    }
    return Math.sqrt(spread_sum / denom)
}

// Returns covariance of two variables
function covariance(l1, l2) {
    var mean1 = mean(l1);
    var mean2 = mean(l2);

    const spread1 = l1.map(num => num - mean1);
    const spread2 = l2.map(num => num - mean2);
    const spread_mult = spread1.map((val, i) => val * spread2[i]);

    return (sum(spread_mult)) / (l1.length - 1);
}

// Returns Pearson correlation coefficient for two data sets (both arrays of nums)
function pearsonCorrelation(l1, l2) {
    var cov = covariance(l1, l2);
    var dev1 = stdDev(l1);
    var dev2 = stdDev(l2);

    return cov / (dev1 * dev2);
}

function spearmanCorrelation(l1, l2) {
    // Sort lists hightest to lowest
    const arr1 = l1.slice().sort((a, b) => b - a);
    const arr2 = l2.slice().sort((a, b) => b - a);

    // Assign fractional ranking map for each array
    const rank1 = fractionRanking(arr1);
    const rank2 = fractionRanking(arr2);

    // Map ranking values to original array positions
    const modifiedArray1 = l1.map(val => rank1[val]);
    const modifiedArray2 = l2.map(val => rank2[val]);

    // Run Pearson Correlation on ranked variables
    return pearsonCorrelation(modifiedArray1, modifiedArray2);
}

// Returns 1:1 map of fractional ranked values for calculating Spearman Correlation
// Expects a SORTED array of values
function fractionRanking(array) {
    var ranking = {};
    const arr = array.slice();
    const rev = array.slice().reverse();

    array.forEach(val => {
        var first = arr.indexOf(val) + 1;
        var last = rev.length - rev.indexOf(val);
        var avg = (first + last) / 2;
        ranking[val] = parseFloat(avg);
    })

    return ranking;
}
