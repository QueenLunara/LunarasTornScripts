// ==UserScript==
// @name         Torn Slots Helper
// @namespace    QueenLunara.Slots
// @version      1.3
// @description  An Advanced version of older Torn Fast Slot scripts, made for Bulk Slots.
// @author       Queen_Lunara [3408686]
// @license      MIT
// @match        https://www.torn.com/loader.php?sid=slots
// @match        https://www.torn.com/page.php?sid=slots
// @icon         https://www.google.com/s2/favicons?sz=64&domain=torn.com
// @run-at       document-idle
// @grant        none
// @downloadURL  https://github.com/QueenLunara/LunarasTornScripts/raw/main/SlotsHelper.user.js
// @updateURL    https://github.com/QueenLunara/LunarasTornScripts/raw/main/SlotsHelper.user.js
// ==/UserScript==

(function () {
    'use strict';

    const debug = true;
    const validStakes = [10, 100, 1000, 10000, 100000, 1000000, 10000000];

    let tokensAvailable = 0;
    let requestsSent = 0;
    let allResponses = [];
    let totalTokensSpent = 0;
    let totalTimesWon = 0;
    let totalAmountWon = 0;
    let requestUrl = null;
    let firstManualRollCompleted = false;
    let customStake = null;
    let validStake = null;
    let numberOfRequests = null;

    function getUserMoney() {
        const moneyElement = document.getElementById('user-money');
        if (moneyElement) {
            return parseInt(moneyElement.getAttribute('data-money').replace(/,/g, ''), 10);
        }
        return 0;
    }

    function sendRequest(stake) {
        if (!requestUrl) {
            alert('Please manually spin the slots once to initialize the script.');
            return;
        }

        const currentMoney = getUserMoney();
        if (currentMoney < stake) {
            alert(`You don't have enough money to continue. Stopping after ${requestsSent} rolls.`);
            logSummary();
            return;
        }

        $.ajax({
            url: requestUrl,
            method: 'POST',
            data: {
                sid: 'slotsData',
                step: 'play',
                stake: stake
            },
            success: function (data) {
                if (debug) {
                    console.log('Request Successful:', data);
                }

                if (requestsSent === 0) {
                    tokensAvailable = data.tokens;
                    if (tokensAvailable < numberOfRequests) {
                        const confirmContinue = confirm(`You only have ${tokensAvailable} tokens. Do you want to finish the remaining ${tokensAvailable} requests and cancel the rest?`);
                        if (!confirmContinue) {
                            return;
                        }
                        requestsSent = tokensAvailable;
                    }
                }

                tokensAvailable--;
                requestsSent++;

                allResponses.push(data);
                totalTokensSpent++;
                if (data.won === 1) {
                    totalTimesWon++;
                    totalAmountWon += data.moneyWon;
                }

                if (requestsSent >= numberOfRequests || requestsSent >= tokensAvailable || getUserMoney() < validStake) {
                    logSummary();
                }
            },
            error: function (xhr, status, error) {
                if (debug) {
                    console.error('Request Failed:', error);
                }
            }
        });
    }

    function logSummary() {
        console.log('All Responses:', allResponses);
        alert(`Summary:\nTokens Spent: ${totalTokensSpent}\nTimes Won: ${totalTimesWon}\nAmount Won: $${totalAmountWon}\nRemaining Money: $${getUserMoney().toLocaleString()}`);
    }

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function initializeStake() {
        customStake = parseInt(prompt('Enter your desired stake (e.g., 500):'), 10);

        if (isNaN(customStake)) {
            alert('Invalid stake. Please enter a valid number.');
            return;
        }

        validStake = validStakes
            .filter(stake => stake <= customStake)
            .reduce((max, stake) => Math.max(max, stake), 0);

        if (!validStake) {
            alert('The desired stake is too small. Please enter a larger number.');
            return;
        }

        numberOfRequests = Math.ceil(customStake / validStake);

        if (debug) {
            console.log(`Desired Stake: ${customStake}`);
            console.log(`Valid Stake: ${validStake}`);
            console.log(`Number of Requests: ${numberOfRequests}`);
        }

        setTimeout(() => {
            (async function () {
                for (let i = 0; i < numberOfRequests; i++) {
                    if (getUserMoney() < validStake) {
                        alert(`You don't have enough money to continue. Stopping after ${requestsSent} rolls.`);
                        logSummary();
                        break;
                    }
                    sendRequest(validStake);
                    const randomWait = Math.floor(Math.random() * 1000) + 500;
                    await wait(randomWait);
                }
            })();
        }, 3000);
    }

    const originalAjax = $.ajax;

    $.ajax = function (options) {
        if (options.data?.sid === 'slotsData' && options.data?.step === 'play') {
            if (!requestUrl) {
                requestUrl = options.url;
                alert('URL captured. Please manually roll the slots once to proceed.');
            }

            const originalSuccess = options.success;
            options.success = function (data) {
                data.barrelsAnimationSpeed = 0;
                originalSuccess?.(data);

                if (!firstManualRollCompleted) {
                    firstManualRollCompleted = true;
                    initializeStake();
                }
            };
        }

        return originalAjax(options);
    };
})();
