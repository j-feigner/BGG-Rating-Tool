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