<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title></title>
        <link rel="stylesheet" href="css/style.css">

        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@200&family=Roboto:wght@300&display=swap" rel="stylesheet">
    </head>
    <body>
        <div class="site-wrapper">
            <div id="input-block">
                <div class="input-flex-container">
                    <div class="title">
                        <h1>BGG Rating Comparison Tool</h1>
                    </div>
                    <div class="input-row">
                        <div class="input-label-pair">
                            <label for="user1"></label>
                            <input type="text" id="user1" placeholder="Your BGG username...">
                        </div>
                        <div class="input-label-pair">
                            <label for="user2"></label>
                            <input type="text" id="user2" placeholder="Another BGG username...">
                        </div>
                    </div>
                </div>
                <div class="submit-container">
                    <button id="submit">
                        <img src="images/loading_icon.png" id="loading-icon" class="hidden">
                        <span>SUBMIT</span>
                    </button>
                </div>
                <div class="loading-container">
                    <span id="loading-reminder" class="hidden">Fetching rating data. This can take some time with large collections...</span>
                </div>
            </div>
            <div id="message-block">
                <div id="main-output">
                    <h3 id="strength-description"></h3>
                    <div id="coefficient-output">
                        <h2 id="r-output"></h2>
                        <h2 id="s-output"></h2>
                    </div>
                    <i><h5 id="common-games"></h5></i>
                </div>
            </div>
            <div id="stats-block">
                <div id="stats-output">
                    <div class="games-table-container">
                        <h4>All Common Games</h4>
                        <div id="games-table-overflow">
                            <table id="games-table">
                                <thead>
                                    <tr class="table-headers">
                                        <th scope="col" id="game-th">Game</th>
                                        <th scope="col" id="rating1-th">User 1</th>
                                        <th scope="col" id="rating2-th">User 2</th>
                                        <th scope="col" id="delta-th">Delta</th>
                                        <th scope="col" id="z-delta-th">z Delta</th>
                                        <th scope="col" id="avg-th">Avg.</th>
                                        <th scope="col" id="z-avg-th">z Avg.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div id="extra-stats">
                        <div class="sub-table-container">
                            <div class="sub-table-header">
                                <h5>Games you both love</h5>
                                <div class="sub-table-options">
                                    <div class="custom-radio">
                                        <input type="radio" name="love-option" value="normal" id="love-normal-input" checked="checked">
                                        <label for="love-normal-input">Normalized</label>
                                    </div>
                                    <div class="custom-radio">
                                        <input type="radio" name="love-option" value="raw" id="love-raw-input">
                                        <label for="love-raw-input">Raw</label>
                                    </div>
                                </div>
                            </div>
                            <table id="love-table">
                                <thead>
                                    <tr>
                                        <th scope="col">Game</th>
                                    </tr>
                                </thead>
                                <tbody>
                                </tbody>
                            </table>
                        </div>
                        <div class="sub-table-container">
                            <div class="sub-table-header">
                                <h5>Games you both don't love</h5>
                                <div class="sub-table-options">
                                    <div class="custom-radio">
                                        <input type="radio" name="hate-option" value="normal" id="hate-normal-input" checked="checked">
                                        <label for="hate-normal-input">Normalized</label>
                                    </div>
                                    <div class="custom-radio">
                                        <input type="radio" name="hate-option" value="raw" id="hate-raw-input">
                                        <label for="hate-raw-input">Raw</label>
                                    </div>
                                </div>
                            </div>
                            <table id="hate-table">
                                <thead>
                                    <tr>
                                        <th scope="col">Game</th>
                                    </tr>
                                </thead>
                                <tbody>
                                </tbody>
                            </table>
                        </div>
                        <div class="sub-table-container">
                            <div class="sub-table-header">
                                <h5>Games you agree about</h5>
                                <div class="sub-table-options">
                                    <div class="custom-radio">
                                        <input type="radio" name="agree-option" value="normal" id="agree-normal-input" checked="checked">
                                        <label for="agree-normal-input">Normalized</label>
                                    </div>
                                    <div class="custom-radio">
                                        <input type="radio" name="agree-option" value="raw" id="agree-raw-input">
                                        <label for="agree-raw-input">Raw</label>
                                    </div>
                                </div>
                            </div>
                            <table id="agree-table">
                                <thead>
                                    <tr>
                                        <th scope="col">Game</th>
                                    </tr>
                                </thead>
                                <tbody>
                                </tbody>
                            </table>
                        </div>
                        <div class="sub-table-container">
                            <div class="sub-table-header">
                                <h5>Games you disagree about</h5>
                                <div class="sub-table-options">
                                    <div class="custom-radio">
                                        <input type="radio" name="disagree-option" value="normal" id="disagree-normal-input" checked="checked">
                                        <label for="disagree-normal-input">Normalized</label>
                                    </div>
                                    <div class="custom-radio">
                                        <input type="radio" name="disagree-option" value="raw" id="disagree-raw-input">
                                        <label for="disagree-raw-input">Raw</label>
                                    </div>
                                </div>
                            </div>
                            <table id="disagree-table">
                                <thead>
                                    <tr>
                                        <th scope="col">Game</th>
                                    </tr>
                                </thead>
                                <tbody>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <div id="app-info-block">
                <div class="app-info-flex-container">
                    <div id="how-to-use" class="app-info-subsection">
                        <h3>How to use this tool :</h3>
                        <ol>
                            <li>Enter your BoardGameGeek username into the first field.</li>
                            <li>Enter a different BoardGameGeek username into the second field.</li>
                            <li>Hit submit, wait while BGG collection data is gathered, and a <span class="colored-text">correlation coefficient</span> will be calculated from the results.</li>
                        </ol>
                    </div>
                    <div id="correlation-help" class="app-info-subsection">
                        <h3>What is a correlation coefficient?</h3>
                        <p>A correlation coefficient, usually called <i>r</i>, is a value between -1 and 1 that represents how strong of a relationship exists between two variables.</p>
                        <p>If <i>r</i> is close to 1, this means there is a strong <i>positive</i> relationship between the two variables: when one is high the other tends to be high, and vice versa.</p>
                        <p>If <i>r</i> is close to -1, this means there is a strong <i>negative</i> relationship between the two variables: when one is high the other tends to <i>low</i>, and vice versa.</p>
                        <p>If <i>r</i> is close to 0, that means there is no relationship between the variables.</p>
                    </div>
                    <div id="what-does-this-mean" class="app-info-subsection">
                        <h3>What does that all mean?</h3>
                        <p>In this case, the two variables being correlated are your BGG game ratings and another user's BGG game ratings.</p>
                        <p>As long as you have a sufficient number of commonly rated games with the other user (75 or more is a good bet), the correlation coefficient can give you a reasonable idea of how similar your tastes are!</p>
                        <p>This tool uses both the Pearson's <i>r</i> and Spearman's <i>&rho;</i>. If you'd like to know more about the details of these statistical measures, their Wikipedia articles are a good place to start:</p>
                        <a href="https://en.wikipedia.org/wiki/Pearson_correlation_coefficient" target="_blank" rel="noopener noreferrer">Pearson</a>
                        <a href="https://en.wikipedia.org/wiki/Spearman%27s_rank_correlation_coefficient" target="_blank" rel="noopener noreferrer">Spearman</a>
                    </div>
                </div>
                <div id="info-bgg-geek-notice">
                    <p>If you would like to compare your ratings to the BGG Geek Average instead of another user, just leave the second field blank!</p>
                </div>
            </div>
            <?php 
                $path = $_SERVER['DOCUMENT_ROOT'] . "/home/html/footer.html";
                include($path);
            ?>
        </div>
        <script src="js/math.js"></script>
        <script src="js/script.js"></script>
    </body>
</html>