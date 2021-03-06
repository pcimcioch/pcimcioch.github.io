/*jshint esversion: 6 */
window.onload = function() {
    'use strict';

    const inputRaw = readCookie('input_v2');
    if (inputRaw) {
        document.getElementById('input').value = inputRaw;
    }

    compute();
};

function compute() {
    'use strict';

    document.getElementById('error').style.display = 'block';

    const inputRaw = document.getElementById('input').value;
    const input = YAML.parse(inputRaw);
    const output = document.getElementById('output');

    output.value = '';
    input.expenses.forEach(expense => printExpense(expense));
    println();
    input.users.forEach(user => handleUser(user));

    document.getElementById('error').style.display = 'none';
    saveCookie('input_v2', inputRaw);

    function printExpense(expense) {
        const exclude =
            expense.exclude ?
                '. ' + expense.exclude + ' nie składa się' :
                '';
        println(expense.paidBy + ' zapłacił ' + expense.amount + ' za ' + expense.name + exclude);
    }

    function handleUser(user) {
        let ownedSum = 0.0;

        println(user + ':');
        input.expenses.forEach(expense => ownedSum += handleExpense(expense, user));
        ownedSum -= handlePaidTransactions(input.transactions, user);
        ownedSum += handleReceivedTransactions(input.transactions, user);

        printTotal(ownedSum, user);
    }

    function handleExpense(expense, user) {
        let owned = 0.0;
        const usersCount = input.users.length - (expense.exclude ? expense.exclude.length : 0);

        if (!expense.exclude || !expense.exclude.includes(user)) {
            owned += expense.amount / usersCount;
        }

        if (user === expense.paidBy) {
            owned -= expense.amount;
        }

        println('  ' + expense.name + ': \t' + owned.toFixed(2));

        return owned;
    }

    function handlePaidTransactions(transactions, user) {
        let paid = 0.0;

        transactions
            .filter(transaction => transaction.paidBy === user)
            .forEach(transaction => paid += transaction.amount);
        println('  Oddano: \t' + (-paid).toFixed(2));

        return paid;
    }

    function handleReceivedTransactions(transactions, user) {
        let received = 0.0;

        transactions
            .filter(transaction => transaction.paidTo === user)
            .forEach(transaction => received += transaction.amount);
        println('  Otrzymano: \t' + received.toFixed(2));

        return received;
    }

    function printTotal(ownedSum, user) {
        if (ownedSum > 0) {
            println('  -- Suma: ' + user + ' jest winny ' + ownedSum.toFixed(2));
        } else {
            println('  -- Suma: ' + user + ' powinien dostać ' + (-ownedSum).toFixed(2));
        }
        println();
    }

    function println(value = '') {
        output.value += value + '\n';
    }
}

function saveCookie(key, value) {
    'use strict';

    let date = new Date();
    date.setTime(date.getTime() + (3000 * 24 * 60 * 60 * 1000));
    document.cookie = key + '=' + encodeURIComponent(value) + '; expires=' + date.toUTCString() + '; path=/';
}

function readCookie(key) {
    'use strict';

    const cookieKey = key + '=';
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i];

        while (cookie.charAt(0) === ' ') {
            cookie = cookie.substring(1, cookie.length);
        }

        if (cookie.indexOf(cookieKey) === 0) {
            return decodeURIComponent(cookie.substring(cookieKey.length, cookie.length));
        }
    }

    return null;
}