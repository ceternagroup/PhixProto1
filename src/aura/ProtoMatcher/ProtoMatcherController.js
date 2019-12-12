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

                    //todo: js client side match logic

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
        console.log($E.currentTarget.dataset.trans);


    }



});