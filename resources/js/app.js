var app = angular.module('appMainModule', ['ngBonita']);

app.config(function (bonitaConfigProvider) {
    // Optional call to override Bonita URL setup
    bonitaConfigProvider.setBonitaUrl('http://localhost:8080/bonita');
});

// Application controller
app.controller('AppController', function($scope, $log, bonitaAuthentication, ProcessDefinition){
    // Logs into Bonita as 'walter.bates'
    bonitaAuthentication.login('admin','bonita').then(function() {

        // Lists all process definitions that can be started by current user
        ProcessDefinition.getStartableByCurrentUser().$promise.then(function (processDefinitions) {
            $log.log('Listing '+ processDefinitions.items.length +' process definition(s):');
            for (var i=0; i<processDefinitions.items.length; i++)
                $log.log('  - '+ processDefinitions.items[i].name +' '+ processDefinitions.items[i].version);

            // Logs out of Bonita
            bonitaAuthentication.logout();
        });
    });
});