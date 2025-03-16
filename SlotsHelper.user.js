// ==UserScript==
// @name         Torn Slots Helper
// @namespace    QueenLunara.Slots
// @version      1.9
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

    let defaultFastMode = false;
    let presetBetMode = false;
    let freeRollMode = false;

    let presetBetAmount = null;
    let tokensAvailable = 0;
    let requestsSent = 0;
    let allResponses = [];
    let totalTokensSpent = 0;
    let totalTimesWon = 0;
    let totalAmountWon = 0;
    let requestUrl = null;
    let firstManualRollCompleted = false;

    function getUserMoney() {
        const moneyElement = document.getElementById('user-money');
        if (moneyElement) {
            return parseInt(moneyElement.getAttribute('data-money').replace(/,/g, ''), 10);
        }
        return 0;
    }

    function getMaxAffordableStake() {
        const currentMoney = getUserMoney();
        const maxStake = validStakes
            .filter(stake => stake <= currentMoney)
            .reduce((max, stake) => Math.max(max, stake), 0);
        return maxStake;
    }

    function logSummary() {
        console.log('All Responses:', allResponses);
        alert(`Summary:\nTokens Spent: ${totalTokensSpent}\nTimes Won: ${totalTimesWon}\nAmount Won: $${totalAmountWon}\nRemaining Money: $${getUserMoney().toLocaleString()}`);
    }

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function modifyBetButtons() {
        const betButtons = document.querySelectorAll('.slots-controls .bet-button');
        if (!betButtons.length) {
            if (debug) console.log('Bet buttons not found. Retrying in 1 second...');
            setTimeout(modifyBetButtons, 1000);
            return;
        }

        betButtons.forEach(button => {
            button.removeEventListener('click', handleBetButtonClick);
            button.addEventListener('click', handleBetButtonClick);
        });
    }

    function handleBetButtonClick(event) {
        if (!defaultFastMode && !presetBetMode && !freeRollMode) return;

        const currentMoney = getUserMoney();
        let stake = null;

        if (defaultFastMode) {
            stake = parseInt(event.target.getAttribute('data-stake'), 10);
        } else if (presetBetMode) {
            if (!presetBetAmount) {
                alert('Preset Bet mode is active, but no bet amount is set. Please set a bet amount.');
                return;
            }
            stake = presetBetAmount;
        } else if (freeRollMode) {
            stake = getMaxAffordableStake();
        }

        if (stake && currentMoney >= stake) {
            sendRequest(stake);
        } else {
            alert(`You don't have enough money to bet $${stake}.`);
        }
    }

    function sendRequest(stake) {
        if (!requestUrl) {
            alert('Please manually spin the slots once to initialize the script.');
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
                tokensAvailable = data.tokens;
                requestsSent++;
                totalTokensSpent++;

                allResponses.push(data);
                if (data.won === 1) {
                    totalTimesWon++;
                    totalAmountWon += data.moneyWon;
                }

                if (tokensAvailable <= 0 || getUserMoney() < stake) {
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

    function initializeScript() {
        const mode = prompt('Select mode:\n1. Default Fast\n2. Preset Bet\n3. Free Roll');
        if (mode === '1') {
            defaultFastMode = true;
            alert('Default Fast mode activated. Cooldown removed. Click the bet buttons to spin quickly.');
        } else if (mode === '2') {
            presetBetMode = true;
            presetBetAmount = parseInt(prompt('Enter your desired bet amount:'), 10);
            if (isNaN(presetBetAmount)) {
                alert('Invalid bet amount. Please reload the page and try again.');
                return;
            }
            alert(`Preset Bet mode activated. Your bet amount is set to $${presetBetAmount}. Click the bet buttons to spin.`);
        } else if (mode === '3') {
            freeRollMode = true;
            alert('Free Roll mode activated. The script will calculate the highest safe bet for each spin. Click the bet buttons to spin.');
        } else {
            alert('Invalid mode selected. Please reload the page and try again.');
            return;
        }

        modifyBetButtons();
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
                    tokensAvailable = data.tokens;
                    initializeScript();
                }
            };
        }

        return originalAjax(options);
    };
})();
