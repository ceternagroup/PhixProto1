/**
 * Created by ronanwilliams on 2019-12-11.
 */

public with sharing class TransactionMatcher {


    @AuraEnabled
    public static Object getUserTransactions(Boolean serverMatch, Boolean useEpoch, Boolean ignoreVendor,
                                            Boolean includeDescription){

        // todo: include option to compare expense description with transaction
        Map<String,Object> responseMap = new Map<String,Object>();

        // retrieve Bank Transactions for the current user
        List<BankTransaction__c> transactions = [
                                        SELECT Amount__c, CreatedById, CreatedDate, ForeignAmount__c, Id, IsDeleted, ISOCode__c,
                                                LastModifiedById, LastModifiedDate, Name, OwnerId, PostingDate__c, RejectedMatches__c,
                                                SystemModstamp, TransactionDate__c, Vendor__c, SuggestedMatches__c, Description__c,
                                                Expense__c
                                        FROM BankTransaction__c
                                        WHERE OwnerId = :UserInfo.getUserId()];

        // if we want to find potential Expenses to match with our Bank Transactions run the match in Apex
        if (serverMatch){
            transactions = doMatch(transactions, useEpoch, ignoreVendor, includeDescription);

        // otherwise return the Expense records to the client for javascript processing
        } else {
            responseMap.put('expenses',[SELECT Id, Name, salestrip__Description__c, salestrip__Vendor__c,
                                                salestrip__Amount__c, salestrip__Date__c
                                        FROM salestrip__Expense__c
                                        WHERE OwnerId = :UserInfo.getUserId()]);
        }

        responseMap.put('transactions',transactions);

        return responseMap;

    }


    private static List<BankTransaction__c> doMatch(List<BankTransaction__c> transactions, Boolean useEpoch,
                                                    Boolean ignoreVendor, Boolean includeDescription){

        Map<String,BankTransaction__c> transactionMap = new Map<String,BankTransaction__c>();

        for (BankTransaction__c trans : transactions){
            String identifier =
                    // add the transaction date to the identifier string
                    '::' + trans.TransactionDate__c.addDays(-1) + '::' + trans.TransactionDate__c + '::' + trans.TransactionDate__c.addDays(1) +

                    // add the vendor name and transaction description to the identifier string
                    '::' + trans.Vendor__c.toLowerCase().replace(' ','') + '::' + trans.Description__c + '::' +

                    // add the transaction ISO currency code to the string
                    '::' + trans.ISOCode__c + '::' + String.valueOf(trans.Amount__c) +

                    // finally add the id to the string to ensure the overall identifier is unique
                    '::' + trans.Id + '::';

            trans.SuggestedMatches__c = '';
            transactionMap.put(identifier,trans);
        }

        for (salestrip__Expense__c expense : [SELECT Id, Name, salestrip__Description__c, salestrip__Vendor__c,
                                                    salestrip__Amount__c, salestrip__Date__c
                                                FROM salestrip__Expense__c
                                                WHERE OwnerId = :UserInfo.getUserId()]){

            for (String transKey : transactionMap.keySet()){

                // do not attempt to match the Expense with the Bank Transaction if the Expense
                // has already been rejected as a match
                if (transactionMap.get(transKey).RejectedMatches__c == null ||
                        transactionMap.get(transKey).RejectedMatches__c.indexOf(expense.Id) == -1){

                    // align match attributes by checking if the Expense properties occur in the transaction identifier key string
                    Boolean amountMatch      = transKey.indexOf('::' + String.valueOf(expense.salestrip__Amount__c) + '::') != -1;
                    Boolean dateMatch        = transKey.indexOf('::' + expense.salestrip__Date__c + '::') != -1;
                    Boolean vendorMatch      = ignoreVendor ? true : transKey.indexOf(expense.salestrip__Vendor__c.toLowerCase().replace(' ','')) != -1;
                    Boolean descriptionMatch = !ignoreVendor && !vendorMatch && includeDescription && expense.salestrip__Description__c != null ?
                            transKey.indexOf(expense.salestrip__Description__c.toLowerCase().replace(' ','')) != -1 : true;

                    // if all relevant attributes match the Bank Transaction, add the record as a suggested match
                    if (amountMatch && dateMatch && vendorMatch && descriptionMatch){
                        transactionMap.get(transKey).SuggestedMatches__c = JSON.serialize(expense);
                    }
                }
            }
        }

        return transactionMap.values();

    }

    @AuraEnabled
    public static Object rejectMatchApex(String transactionId, String expenseId){

        try {
            BankTransaction__c trans = [SELECT Id, RejectedMatches__c
                                        FROM BankTransaction__c
                                        WHERE Id = :transactionId];

            trans.RejectedMatches__c += expenseId;
            update trans;
            return true;
        } catch (Exception e){
            return e.getMessage();
        }
    }

}