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

// Returns Pearson correlation coefficient for two data sets (both arrays of nums)
function correlation(l1, l2) {
    var mean1 = mean(l1);
    var mean2 = mean(l2);

    var spread1 = l1.map(num => num - mean1);
    var spread2 = l2.map(num => num - mean2);

    var spread_mult = spread1.map((val, i) => val * spread2[i]);

    var covariance = (sum(spread_mult)) / (l1.length - 1);

    var dev1 = stdDev(l1);
    var dev2 = stdDev(l2);

    return covariance / (dev1 * dev2);
}