/**
 * Created by ronanwilliams on 2019-12-11.
 */

({

    getTransactions : function ($C,$E,$H) {

        $C.set('v.pending',true);
        var start   = new Date();
        var source  = $C.get('v.serverMatch') ? 'Apex ' : 'Javascript ';

        var getUserTransactions = $C.get('c.getUserTransactions');
        getUserTransactions.setParams({
            serverMatch : $C.get('v.serverMatch'),
            useEpoch : $C.get('v.useEpoch'),
            ignoreVendor : $C.get('v.ignoreVendor'),
            includeDescription : $C.get('v.compareDescriptions')});
        getUserTransactions.setCallback(this, function (response) {
            if (response.getState() === 'SUCCESS'){
                $C.set('v.pending',false);

                var transactions = response.getReturnValue()['transactions'];

                if ($C.get('v.serverMatch')){
                    transactions.forEach(function(transaction){
                        if (transaction.SuggestedMatches__c){
                            transaction.SuggestedMatches__c = JSON.parse('[' + transaction.SuggestedMatches__c + ']');
                        }
                    });

                    $C.set('v.transactions',transactions);
                } else {
                    transactions.forEach(function(transaction){
                        transaction.SuggestedMatches__c = [];

                        var transDate = new Date(transaction.TransactionDate__c);

                        console.log('trans iso',transaction.ISOCode__c);

                        transaction.Identifier =
                            // add the transaction date to the identifier string
                            '::' + new Date(transDate.setDate(transDate.getDate() - 1)) +
                            '::' + transDate +
                            '::' + new Date(transDate.setDate(transDate.getDate() + 1)) +

                            // add the vendor name and transaction description to the identifier string
                            '::' + transaction.Vendor__c.toLowerCase().replace(' ','') + '::' + transaction.Description__c + '::' +

                            // add the transaction ISO currency code to the string
                            '::' + transaction.ISOCode__c + '::' + transaction.Amount__c + '::';
                    });

                    var expenses = response.getReturnValue()['expenses'];
                    if (expenses){
                        expenses.forEach(function(expense){

                            console.log('when expense iso is ',expense.salestrip__TransactionCurrency__c, ' amt is ', expense.salestrip__Amount__c);


                            console.log('date',new Date(expense.salestrip__Date__c));

                            transactions.forEach(function(transaction){

                                // do not attempt to match the Expense with the Bank Transaction if the Expense
                                // has already been rejected as a match
                                if (!transaction.RejectedMatches__c || transaction.RejectedMatches__c.includes(expense.Id)){

                                    // align match attributes by checking if the Expense properties occur in the transaction identifier key string
                                    var amountMatch      = transaction.Identifier.includes('::' + expense.salestrip__TransactionAmount__c + '::');
                                    var currencyMatch    = transaction.Identifier.includes('::' + expense.salestrip__TransactionCurrency__c + '::');
                                    var dateMatch        = transaction.Identifier.includes('::' + new Date(expense.salestrip__Date__c) + '::');
                                    var vendorMatch      = $C.get('v.ignoreVendor') ? true : transaction.Identifier.includes(expense.salestrip__Vendor__c.toLowerCase().replace(' ',''));
                                    var descriptionMatch = !$C.get('v.ignoreVendor') && !vendorMatch && $C.get('v.compareDescriptions') && expense.salestrip__Description__c ?
                                        transaction.Identifier.includes(expense.salestrip__Description__c.toLowerCase().replace(' ','')) : true;

                                    // if all relevant attributes match the Bank Transaction, add the record as a suggested match
                                    if (amountMatch && currencyMatch && dateMatch && vendorMatch && descriptionMatch){
                                        transaction.SuggestedMatches__c.push(expense);
                                    }
                                }
                            });


                        });
                    }

                    $C.set('v.transactions',transactions);

                }

                var trials = $C.get('v.trials');
                trials.unshift(source + 'matching for ' + transactions.length + ' transactions performed in ' + ((new Date() - start) / 1000) + ' seconds');
                $C.set('v.trials',trials);
            }
        });
        $A.enqueueAction(getUserTransactions);
    },
    setActiveId : function($C,$E,$H){
        $C.set('v.activeId',$E.getSource().get("v.value"));
    },
    removeActiveId : function($C,$E,$H){
        $C.set('v.activeId','');
    },
    rejectMatch : function($C,$E,$H){

        var data            = $E.currentTarget.dataset;
        var transactions    = $C.get('v.transactions');
        console.log('trans',transactions[data.transindex]);
        transactions[data.transindex].SuggestedMatches__c.splice(data.matchindex,1);
        $C.set('v.transactions',transactions);

        // todo: pass rejection to apex method

    }



});