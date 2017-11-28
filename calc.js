/*jshint esversion: 6 */
window.onload = compute;

function compute() {
    'use strict';

    const input = YAML.parse(document.getElementById('input').value);
    const output = document.getElementById('output');

    output.value = '';
    input.users
        .forEach(user => handleUser(user));


    function handleUser(user) {
        let ownedSum = 0.0;

        println(user + ':');
        input.expenses
            .forEach(expense => ownedSum += handleExpense(expense, user));
        ownedSum -= handleInstallments(input.installments, user);

        printTotal(ownedSum, user);
    }

    function handleExpense(expense, user) {
        if (expense.exclude && expense.exclude.includes(user)) {
            return 0.0;
        }

        const usersCount = input.users.length - (expense.exclude ? expense.exclude.length : 0);
        const owned = expense.amount / usersCount - (user === expense.paidBy ? expense.amount : 0);
        println('  ' + expense.name + ': \t' + owned.toFixed(2));

        return owned;
    }

    function handleInstallments(installments, user) {
        let paid = 0.0;

        installments
            .filter(installment => installment.paidBy === user)
            .forEach(installment => paid += installment.amount);
        println('  Zaliczka: \t' + (-paid).toFixed(2));

        return paid;
    }

    function printTotal(ownedSum, user) {
        if (ownedSum > 0) {
            println('  -- Suma: ' + user + ' jest winny ' + ownedSum.toFixed(2));
        } else {
            println('  -- Suma: ' + user + ' powinien dostać ' + (-ownedSum).toFixed(2));
        }
        println();
    }

    function println(value) {
        output.value += (value ? value : '') + '\n';
    }
}