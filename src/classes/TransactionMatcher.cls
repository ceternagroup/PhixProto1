/**
 * Created by ronanwilliams on 2019-12-11.
 */

public with sharing class TransactionMatcher {


    @AuraEnabled
    public static Object getUserTransactions(Boolean serverMatch){

        // get current user id


        List<BankTransaction__c> transactions = [
                SELECT Amount__c, CreatedById, CreatedDate, ForeignAmount__c, Id, IsDeleted, ISOCode__c,
                        LastModifiedById, LastModifiedDate, Name, OwnerId, PostingDate__c, RejectedMatches__c,
                        SystemModstamp, TransactionDate__c, Vendor__c
                FROM BankTransaction__c
                WHERE OwnerId = :UserInfo.getUserId()];


        return transactions;



    }



}