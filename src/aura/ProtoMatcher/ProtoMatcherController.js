/**
 * Created by ronanwilliams on 2019-12-11.
 */

({


    getTransactions : function ($C,$E,$H) {

        $C.set('v.pending',true);
        var getUserTransactions = $C.get('c.getUserTransactions');
        getUserTransactions.setParams({serverMatch : $C.get('v.serverMatch')});
        getUserTransactions.setCallback(this, function (response) {
            if (response.getState() === 'SUCCESS'){
                $C.set('v.pending',false);

                console.log(response.getState(),response.getReturnValue());
                $C.set('v.transactions',response.getReturnValue());
                var trials = $C.get('v.trials');
                trials.push('trial performed');
                $C.set('v.trials',trials);
            }
        });
        $A.enqueueAction(getUserTransactions);
    }



});